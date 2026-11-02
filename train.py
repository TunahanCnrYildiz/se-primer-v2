"""SE Primer v2 — "bu oyuncu bu sahnede B'yi seçecek mi?" modeli: eğit, ölç, kapıdan geçir, paketle.

    python train.py               # tek komut: veriyi hazırla → eğit → ölç → kapı → model/
    python train.py --gelistirme  # boru hattını yalnız sentetikle dener → _out/gelistirme (YAYINLANMAZ)

İlk adımda data/hazirla.py çalışır: data/ham/*.csv (gerçek) + sentetik → data/oturumlar.csv.
Aynı ham dosyalarla her seferinde bayt bayt aynı dosya üretilir.

v2.1 (spec §10.8, test verisi gelmeden yazıldı):
  - eğitim: data/v21_egitim_oturumlari.txt'deki 31 gerçek oturum (sentetik yok)
  - ölçüm: listede olmayan gerçek oturumlar (bekletilen test seti), bir kez
  - ön koşul: test setinde >= 15 oturum ve >= 8 B, en geç 4 Kasım 2026 20:00
  - kapı: ROC-AUC >= 0.65 ve B-duyarlılığı (p >= 0.50) >= 0.60, ONNX ile sklearn farkı <= 1e-4
  - kilit: ölçülen test seti data/v21_olcum.json'a yazılır; sonra yalnız aynı test setiyle çalışır
v2.0'ın iki ölçümü (gruplanmış 5 katlı çapraz doğrulama) spec §10.4'te; v2.0 reddedildi.
Kapıdan geçmeyen model model/ klasörüne yazılmaz; betik sıfırdan farklı kodla çıkar.

Çıkış kodları: 0 geçti · 1 metrik eşiğin altında · 2 veri yetersiz / süre doldu · 3 ONNX sapması
               · 4 test seti kilitli ölçümden farklı
"""
import argparse
import datetime as dt
import hashlib
import json
import shutil
import sys
from pathlib import Path

import numpy as np
import onnx
import onnxruntime as ort
import pandas as pd
import skl2onnx
import sklearn
from skl2onnx import to_onnx
from skl2onnx.common.data_types import FloatTensorType
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
sys.stderr.reconfigure(encoding="utf-8")

BURASI = Path(__file__).resolve().parent
sys.path.insert(0, str(BURASI / "data"))
import hazirla  # noqa: E402
from hazirla import HEDEF, OZELLIKLER  # noqa: E402  (özellik sırasının tek kaynağı)

VERI = BURASI / "data" / "oturumlar.csv"
MODEL_DIR = BURASI / "model"
CIKTI = BURASI / "_out"

EGITIM_LISTESI = BURASI / "data" / "v21_egitim_oturumlari.txt"
OLCUM_KILIDI = BURASI / "data" / "v21_olcum.json"

SEED = 13
SURUM = "2.1"
KAT = 5
KARAR_ESIGI = 0.50                                  # p >= bu değer → müdahale (spec §10.3)
KAPI = {"roc_auc": 0.65, "recall_b": 0.60}          # spec §10.4
ONNX_TOLERANS = 1e-4
MIN_TEST_OTURUM = 15                                # spec §10.8
MIN_TEST_B = 8
SON_TARIH = dt.datetime(2026, 11, 4, 20, 0, tzinfo=dt.timezone(dt.timedelta(hours=3)))
BOOTSTRAP = 1000

OZELLIK_TANIMI = {
    "seviye": ("Girişteki seviye: 0 yeni başladım, 1 biraz deneyimli, 2 deneyimli", "kategori", 0, 2),
    "sahne_no": ("Karar: 1 mimari, 2 test, 3 KVKK", "kategori", 1, 3),
    "hedef_eslesir": ("Oyuncunun hedefi bu sahnenin konusu mu", "0/1", 0, 1),
    "tekrar_oyun": ("Bu sekmede 'Yeniden oyna' ile başlayan oyun mu", "0/1", 0, 1),
    "giris_sn": ("Giriş ekranında 'Başla'ya kadar geçen süre", "saniye", 0, None),
    "giris_degisiklik": ("Giriş ekranında verilen cevabın değiştirilme sayısı", "adet", 0, None),
    "onceki_b_sayisi": ("Önceki sahnelerde B seçilme sayısı", "adet", 0, 2),
    "onceki_karar_suresi_sn": ("Önceki sahnede seçime kadar geçen süre (sahne 1'de 0)", "saniye", 0, None),
    "onceki_ipucu_acti": ("Önceki sahnede ipucu kartı açık mıydı (sahne 1'de 0)", "0/1", 0, 1),
    "onceki_tutor_mesaj": ("Önceki sahnede tutor'a giden istek sayısı (sahne 1'de 0)", "adet", 0, None),
    "onceki_aciklama_sn": ("Önceki açıklama ekranında kalınan süre (sahne 1'de 0)", "saniye", 0, None),
}


def yeni_model():
    return Pipeline([
        ("olcek", StandardScaler()),
        ("lr", LogisticRegression(class_weight="balanced", random_state=SEED, max_iter=1000)),
    ])


# --------------------------------------------------------------------------- ölçüm
def capraz_dogrulama(degerlendirme: pd.DataFrame, ek_egitim: pd.DataFrame) -> np.ndarray:
    """Kat dışı olasılıklar. Her katta model, o katın dışındaki değerlendirme satırları +
    ek_egitim (sentetik) ile eğitilir. Aynı oturumun satırları hep aynı kattadır."""
    X, y = degerlendirme[OZELLIKLER].to_numpy(float), degerlendirme[HEDEF].to_numpy()
    gruplar = degerlendirme["oturum"].to_numpy()
    p = np.zeros(len(degerlendirme))
    katlar = StratifiedGroupKFold(n_splits=KAT, shuffle=True, random_state=SEED)
    for egit, test in katlar.split(X, y, gruplar):
        X_egit = np.vstack([X[egit], ek_egitim[OZELLIKLER].to_numpy(float)])
        y_egit = np.concatenate([y[egit], ek_egitim[HEDEF].to_numpy()])
        p[test] = yeni_model().fit(X_egit, y_egit).predict_proba(X[test])[:, 1]
    return p


def metrikler(y: np.ndarray, p: np.ndarray, gruplar: np.ndarray) -> dict:
    tahmin = (p >= KARAR_ESIGI).astype(int)
    auc = roc_auc_score(y, p)
    # Oturumlar üzerinden bootstrap: aynı oyuncunun kararları birlikte örneklenir.
    rng = np.random.default_rng(SEED)
    oturumlar = np.unique(gruplar)
    indeks = {o: np.flatnonzero(gruplar == o) for o in oturumlar}
    dagilim = []
    for _ in range(BOOTSTRAP):
        secilen = np.concatenate([indeks[o] for o in rng.choice(oturumlar, len(oturumlar))])
        if len(np.unique(y[secilen])) == 2:
            dagilim.append(roc_auc_score(y[secilen], p[secilen]))
    return {
        "roc_auc": round(float(auc), 4),
        "roc_auc_ga95": [round(float(np.percentile(dagilim, 2.5)), 4),
                         round(float(np.percentile(dagilim, 97.5)), 4)],
        "recall_b": round(float(recall_score(y, tahmin, zero_division=0)), 4),
        "precision_b": round(float(precision_score(y, tahmin, zero_division=0)), 4),
        "accuracy": round(float(accuracy_score(y, tahmin)), 4),
        "mudahale_orani": round(float(tahmin.mean()), 4),
        "n_satir": int(len(y)),
        "n_oturum": int(len(oturumlar)),
        "n_b": int(y.sum()),
    }


# --------------------------------------------------------------------------- paketleme
def onnx_aktar(model, X: np.ndarray, hedef: Path) -> float:
    """Girdi 'input' float32 [n, özellik sayısı], çıktı 'probabilities' [n, 2] (zipmap kapalı)."""
    onx = to_onnx(model, initial_types=[("input", FloatTensorType([None, len(OZELLIKLER)]))],
                  options={id(model): {"zipmap": False}}, target_opset=17)
    hedef.write_bytes(onx.SerializeToString())
    oturum = ort.InferenceSession(str(hedef), providers=["CPUExecutionProvider"])
    p_onnx = oturum.run(["probabilities"], {"input": X.astype(np.float32)})[0]
    return float(np.abs(p_onnx - model.predict_proba(X)).max())


def config_olustur(veri_ozeti, olcum, kapi_sonucu, fark, gelistirme) -> dict:
    ozellikler = []
    for ad in OZELLIKLER:
        aciklama, birim, en_az, en_cok = OZELLIK_TANIMI[ad]
        ozellikler.append({"name": ad, "description": aciklama, "unit": birim, "min": en_az, "max": en_cok})
    sema_ozellik = {}
    for o in ozellikler:
        sema = {"type": "number", "minimum": o["min"]}
        if o["max"] is not None:
            sema["maximum"] = o["max"]
        sema_ozellik[o["name"]] = sema
    return {
        "name": "se-primer-v2",
        "version": SURUM + ("-gelistirme" if gelistirme else ""),
        "title": "SE Primer v2 — bedelli seçim riski",
        "description": "Oyuncu bir sahneye girdiğinde, o sahnede bedeli yüksek seçeneği (B) seçme "
                       "olasılığını tahmin eder. p >= decision_threshold ise oyun ipucu/sayaç/tutor ile müdahale eder.",
        "target": HEDEF,
        "classes": ["0", "1"],
        "class_labels": {"0": "A seçer", "1": "B seçer (bedelli)"},
        "decision_threshold": KARAR_ESIGI,
        "features": ozellikler,
        "onnx": {
            "input_name": "input", "input_dtype": "float32", "input_shape": [None, len(OZELLIKLER)],
            "output_name": "probabilities", "output_shape": [None, 2], "positive_class_index": 1,
            "opset": 17, "max_abs_diff_vs_sklearn": float(f"{fark:.2e}"),
        },
        "request_schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "title": "Tahmin isteği (özellik adı → değer)",
            "type": "object",
            "properties": sema_ozellik,
            "required": OZELLIKLER,
            "additionalProperties": False,
        },
        "response_schema": {
            "$schema": "https://json-schema.org/draft/2020-12/schema",
            "type": "object",
            "properties": {"p": {"type": "number", "minimum": 0, "maximum": 1},
                           "mudahale": {"type": "boolean"}, "model_version": {"type": "string"}},
            "required": ["p", "mudahale"],
        },
        "eval": {
            "method": (f"GELİŞTİRME: {KAT} katlı StratifiedGroupKFold (oturuma göre), yalnız sentetik veriyle"
                       if gelistirme else
                       "Bekletilen test seti (spec §10.8): model dondurulmuş eğitim oturumlarıyla eğitildi, "
                       "eğitimden sonra toplanan ve eğitimde hiç kullanılmayan gerçek oturumlarda bir kez ölçüldü"),
            "gate": {"roc_auc_min": KAPI["roc_auc"], "recall_b_min": KAPI["recall_b"],
                     "onnx_tolerance": ONNX_TOLERANS, "spec": "spec.md §10.4"},
            "passed": kapi_sonucu,
            "metrics": olcum,
        },
        "training_data": veri_ozeti,
        "seed": SEED,
        "environment": {"python": f"{sys.version_info.major}.{sys.version_info.minor}",
                        "scikit-learn": sklearn.__version__, "skl2onnx": skl2onnx.__version__,
                        "onnx": onnx.__version__, "onnxruntime": ort.__version__},
    }


def model_karti(c: dict) -> str:
    m = c["eval"]["metrics"]
    v = c["training_data"]
    gelistirme = c["version"].endswith("gelistirme")
    uyari = ("\n> ⚠️ **GELİŞTİRME ÇIKTISI — YAYINLANMAZ.** Yalnız sentetik veriyle boru hattı denemesidir; "
             "gerçek oyuncu davranışını temsil etmez.\n" if gelistirme else "")
    ozellik_satirlari = "\n".join(f"| {i + 1} | `{o['name']}` | {o['unit']} | {o['description']} |"
                                  for i, o in enumerate(c["features"]))
    return f"""---
library_name: onnx
license: mit
language: tr
tags:
- tabular-classification
- onnx
- sklearn
- education
pipeline_tag: tabular-classification
---

# {c["title"]} (v{c["version"]})
{uyari}
## Amaç

SE Primer, telefondan oynanan üç kararlık bir yazılım mühendisliği senaryosu (hastane randevu sistemi 08:00'de çöküyor). Bu model, oyuncu bir sahneye **girdiğinde** o sahnede bedeli yüksek seçeneği (B) seçme olasılığını tahmin eder. `p >= {c["decision_threshold"]}` ise oyun, oyuncu seçimini yapmadan önce müdahale eder: ipucu kartı açılır, deneyimli oyuncunun 60 sn sayacı kalkar, tutor'un yansıtma sorusu gösterilir.

## Model

- `sklearn` Pipeline: `StandardScaler → LogisticRegression(class_weight="balanced")`, `random_state={c["seed"]}`
- ONNX: girdi `input` float32 `[n, {len(c["features"])}]`, çıktı `probabilities` `[n, 2]` (sınıf 1 = B seçer). ONNX ile sklearn arasındaki en büyük fark: {c["onnx"]["max_abs_diff_vs_sklearn"]}
- Eğitim ortamı: Python {c["environment"]["python"]}, scikit-learn {c["environment"]["scikit-learn"]}, skl2onnx {c["environment"]["skl2onnx"]}

### Girdiler (sıra önemlidir)

Hepsi sahneye girişte bilinen bilgilerdir. Bu sahnedeki karar süresi ya da ipucu açılması girdi değildir (sızıntı).

| # | Özellik | Birim | Anlamı |
|---|---|---|---|
{ozellik_satirlari}

## Veri

- {v["egitim_aciklama"]}
- Sentetik: {v["sentetik_oturum"]} oturum (kurala dayalı üretici, tohum {c["seed"]}; kural `data/hazirla.py`'de). {v["sentetik_aciklama"]}
- Kişisel veri yok: ad, e-posta, cihaz kimliği, IP, konum toplanmadı; oturum kimliği rastgele.
- Veri dosyası SHA-256: `{v["sha256"]}`

## Değerlendirme

{c["eval"]["method"]}.

| Metrik | Değer | Kapı |
|---|---|---|
| ROC-AUC | {m["roc_auc"]} (%95 GA {m["roc_auc_ga95"][0]}–{m["roc_auc_ga95"][1]}, oturum bootstrap) | ≥ {c["eval"]["gate"]["roc_auc_min"]} |
| B-duyarlılığı (p ≥ {c["decision_threshold"]}) | {m["recall_b"]} | ≥ {c["eval"]["gate"]["recall_b_min"]} |
| B-kesinliği | {m["precision_b"]} | — |
| Doğruluk | {m["accuracy"]} | — |
| Müdahale oranı | {m["mudahale_orani"]} | — |

Ölçülen: {m["n_oturum"]} oturum, {m["n_satir"]} karar, {m["n_b"]} B. Kapı sonucu: **{"GEÇTİ" if c["eval"]["passed"] else "GEÇEMEDİ"}**.

## Sınırlar

- Ölçüm küçük bir örneklemde yapıldı. Güven aralığı geniştir (alt ucu yazı-tura düzeyine, 0.50'ye yakın olabilir); tek bir sayıya güvenmeyin.
- Test oyuncularının çoğu senaryoyu daha önce oynamıştı. Bu yüzden ölçüm, senaryoyla ilk kez karşılaşan oyuncuyu tam temsil etmeyebilir.
- Test setindeki oyuncuların bir kısmı eğitim setindeki oyuncularla aynı kişiler; ayrım kişiye göre değil oturuma göre.
- Oyuncular ders arkadaşlarıdır (yazılım mühendisliği öğrencileri). Başka bir kitleye genellenmez.
- "Yeniden oyna" ile gelen oyunlarda oyuncu senaryoyu bilir ve B'yi bilerek seçebilir (kötü sonu görmek için). `tekrar_oyun` bunu girdi olarak taşır; bu oyunlarda yüksek `p` "risk" değil "keşif" anlamına gelebilir.
- Sentetik üreticinin varsayımı gerçek veriyle çelişti (tekrar oyunlarda oyuncular neredeyse hep A seçti); v2.1'de sentetik veri eğitimden çıkarıldı.
- Bir önceki sürüm (v2.0) iki ölçümde de kapıyı geçemedi (ROC-AUC 0.618 ve 0.643) ve reddedildi; ayrıntı `RELEASE.md`.
- Model nedensellik söylemez: B seçimini *öngörür*, nedenini açıklamaz.

## Kullanılmaması gereken durumlar

- Oyuncuyu notlandırmak, sıralamak ya da yeteneği hakkında karar vermek.
- SE Primer senaryosu dışında herhangi bir karar (gerçek olay müdahalesi, işe alım vb.).
- Model tarayıcıya iner ve herkes tarafından indirilebilir: gizli kalması gereken bir mantık için kullanmayın.

## Kullanım

Tüketiciler modeli commit'e sabit URL ile indirir:

```
https://huggingface.co/TunahanCnr/se-primer-v2/resolve/<commit>/model.onnx
```

Yayınlanan commit, etiket (`v{c["version"]}`) ve geri alma: GitHub reposundaki `RELEASE.md`.

Kaynak kod, eğitim ve testler: https://github.com/TunahanCnrYildiz/se-primer-v2
"""


# --------------------------------------------------------------------------- ana akış
def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--gelistirme", action="store_true",
                    help="gerçek veri yokken boru hattını sentetikle dene (çıktı _out/gelistirme, yayınlanmaz)")
    args = ap.parse_args()

    hazirla.main()  # data/ham/*.csv + sentetik → data/oturumlar.csv
    veri = pd.read_csv(VERI, dtype={"oturum": str})
    gercek, sentetik = veri[veri["kaynak"] == "gercek"], veri[veri["kaynak"] == "sentetik"]
    egitim_idleri = {s.strip() for s in EGITIM_LISTESI.read_text(encoding="utf-8").splitlines()
                     if s.strip() and not s.startswith("#")}
    egitim_gercek = gercek[gercek["oturum"].isin(egitim_idleri)]
    test = gercek[~gercek["oturum"].isin(egitim_idleri)]
    veri_ozeti = {
        "file": "data/oturumlar.csv",
        "sha256": hashlib.sha256(VERI.read_bytes()).hexdigest(),
        "egitim_oturum": int(egitim_gercek["oturum"].nunique()), "egitim_satir": int(len(egitim_gercek)),
        "test_oturum": int(test["oturum"].nunique()), "test_satir": int(len(test)), "test_b": int(test[HEDEF].sum()),
        "sentetik_oturum": int(sentetik["oturum"].nunique()), "sentetik_satir": int(len(sentetik)),
        "egitim_aciklama": f"Eğitim: {egitim_gercek['oturum'].nunique()} gerçek oturum, {len(egitim_gercek)} karar "
                           f"(Veri Toplama Modu, `data/v21_egitim_oturumlari.txt`). Test: eğitimden sonra toplanan "
                           f"{test['oturum'].nunique()} gerçek oturum, {len(test)} karar; eğitimde kullanılmadı.",
        "sentetik_aciklama": "v2.1'in eğitiminde kullanılmadı (spec §10.8); yalnız boru hattı denemesi için.",
        "test_karar_suresi_medyan": round(float(test["karar_suresi_sn"].median()), 1) if len(test) else 0.0,
        "egitim_karar_suresi_medyan": round(float(egitim_gercek["karar_suresi_sn"].median()), 1),
    }
    print(f"veri: eğitim {veri_ozeti['egitim_oturum']} gerçek oturum · test {veri_ozeti['test_oturum']} oturum "
          f"({veri_ozeti['test_b']} B) · {veri_ozeti['sentetik_oturum']} sentetik oturum")

    if args.gelistirme:
        veri_ozeti["egitim_aciklama"] = f"Yalnız sentetik: {len(sentetik)} karar (geliştirme denemesi)."
        veri_ozeti["sentetik_aciklama"] = "Geliştirme denemesinde hem eğitim hem ölçüm."
        print("! GELİŞTİRME: ölçüm sentetik veride, çıktı yayınlanmaz")
        p = capraz_dogrulama(sentetik, sentetik.iloc[0:0])
        olcum = metrikler(sentetik[HEDEF].to_numpy(), p, sentetik["oturum"].to_numpy())
        egitim, olculen, hedef_dir = sentetik, sentetik, CIKTI / "gelistirme"
    else:
        test_idleri = sorted(test["oturum"].unique())
        if OLCUM_KILIDI.exists():
            kilit = json.loads(OLCUM_KILIDI.read_text(encoding="utf-8"))
            if kilit["test_oturumlari"] != test_idleri:
                print("✗ v2.1 bir kez ölçüldü ve test seti o ölçümden farklı (spec §10.8). Yeniden ölçülmez.")
                sys.exit(4)
            print("! v2.1 ölçümü kilitli: aynı test setiyle sonuç yeniden üretiliyor")
        elif dt.datetime.now(dt.timezone.utc) > SON_TARIH:
            print("✗ son tarih (4 Kasım 2026 20:00) geçti, v2.1 ölçülmedi (spec §10.8). v2.0'ın reddi geçerli.")
            sys.exit(2)
        if len(test_idleri) < MIN_TEST_OTURUM or test[HEDEF].sum() < MIN_TEST_B:
            print(f"✗ test seti yetersiz: en az {MIN_TEST_OTURUM} yeni oturum ve {MIN_TEST_B} B gerekli, "
                  f"şu an {len(test_idleri)} oturum ve {int(test[HEDEF].sum())} B (spec §10.8). Ölçüm yapılmadı.")
            sys.exit(2)
        model_test = yeni_model().fit(egitim_gercek[OZELLIKLER].to_numpy(float), egitim_gercek[HEDEF].to_numpy())
        p = model_test.predict_proba(test[OZELLIKLER].to_numpy(float))[:, 1]
        olcum = metrikler(test[HEDEF].to_numpy(), p, test["oturum"].to_numpy())
        if not OLCUM_KILIDI.exists():
            OLCUM_KILIDI.write_text(json.dumps({
                "surum": SURUM, "spec": "spec.md §10.8", "test_oturumlari": test_idleri, "metrikler": olcum,
            }, indent=2, ensure_ascii=False) + "\n", encoding="utf-8", newline="\n")
        egitim, olculen, hedef_dir = egitim_gercek, test, CIKTI / "aday"

    kapi_sonucu = olcum["roc_auc"] >= KAPI["roc_auc"] and olcum["recall_b"] >= KAPI["recall_b"]
    print(f"ölçüm: ROC-AUC {olcum['roc_auc']} (GA95 {olcum['roc_auc_ga95']}), "
          f"B-duyarlılığı {olcum['recall_b']}, B-kesinliği {olcum['precision_b']}, doğruluk {olcum['accuracy']}")

    # Yayınlanacak model: yalnız eğitim verisiyle (v2.1'de 31 gerçek oturum; geliştirmede sentetik).
    model = yeni_model().fit(egitim[OZELLIKLER].to_numpy(float), egitim[HEDEF].to_numpy())
    X = pd.concat([egitim, olculen])[OZELLIKLER].to_numpy(float)  # ONNX karşılaştırması için

    if hedef_dir.exists():
        shutil.rmtree(hedef_dir)
    hedef_dir.mkdir(parents=True)
    fark = onnx_aktar(model, X, hedef_dir / "model.onnx")
    config = config_olustur(veri_ozeti, olcum, kapi_sonucu and fark <= ONNX_TOLERANS, fark, args.gelistirme)
    # newline="\n": Windows'ta da LF yazılır; Hugging Face'teki ve GitHub'daki dosya bayt bayt aynı kalır.
    (hedef_dir / "config.json").write_text(json.dumps(config, indent=2, ensure_ascii=False) + "\n",
                                           encoding="utf-8", newline="\n")
    (hedef_dir / "README.md").write_text(model_karti(config), encoding="utf-8", newline="\n")
    print(f"ONNX ↔ sklearn en büyük fark: {fark:.2e} (tolerans {ONNX_TOLERANS})")

    if fark > ONNX_TOLERANS:
        print(f"✗ ONNX sklearn'den sapıyor. Çıktı yalnız {hedef_dir.relative_to(BURASI)}'da.")
        sys.exit(3)
    if not kapi_sonucu:
        print(f"✗ KAPI GEÇİLEMEDİ: ROC-AUC >= {KAPI['roc_auc']} ve B-duyarlılığı >= {KAPI['recall_b']} gerekli. "
              f"Model yayınlanmaz; rapor {hedef_dir.relative_to(BURASI)}'da.")
        sys.exit(1)
    if args.gelistirme:
        print(f"✓ geliştirme çıktısı {hedef_dir.relative_to(BURASI)}'da (yayınlanmaz)")
        return

    # Yayın kaydı (yayinla.py yazar) yalnız aynı model için geçerlidir: yeniden üretilen model
    # yayınlananla bayt bayt aynıysa korunur, değilse silinir (yeni model henüz yayınlanmadı).
    yayin = MODEL_DIR / "yayin.json"
    yayin_kaydi = yayin.read_bytes() if yayin.exists() else None
    if MODEL_DIR.exists():
        shutil.rmtree(MODEL_DIR)
    shutil.copytree(hedef_dir, MODEL_DIR)
    if yayin_kaydi:
        yayinlanan = json.loads(yayin_kaydi)["sha256"]["model.onnx"]
        if yayinlanan == hashlib.sha256((MODEL_DIR / "model.onnx").read_bytes()).hexdigest():
            yayin.write_bytes(yayin_kaydi)
            print(f"  yayın kaydı korundu: model Hugging Face'teki {json.loads(yayin_kaydi)['tag']} ile aynı")
        else:
            print("  ! model değişti: yayın kaydı silindi, yeni model `python yayinla.py` ile yayınlanmalı")
    print(f"✓ KAPI GEÇİLDİ → {MODEL_DIR.relative_to(BURASI)}/ (model.onnx, config.json, README.md)")


if __name__ == "__main__":
    main()
