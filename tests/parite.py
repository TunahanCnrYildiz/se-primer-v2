"""Python Oracle: aynı model.onnx ile 5 referans girdinin olasılığını hesaplar.

    python tests/parite.py --uret      # referans olasılıkları hesapla → tests/parite.json
    python tests/parite.py             # parite.json'ı yeniden hesapla ve karşılaştır
    python tests/parite.py --sunucu https://<render-adresi>   # sunucu tüketicisini de karşılaştır

Model kaynağı, öncelik sırasıyla: --model (yerel yol ya da URL) → model/config.json'daki
yayın bilgisi (Hugging Face, commit'e sabit URL) → model/model.onnx.

Diferansiyel test: Aynı girdiye iki bağımsız tüketicinin (Python onnxruntime ↔ tarayıcıda
onnxruntime-web, Cypress; ↔ FastAPI sunucusu) verdiği olasılık farkı TOLERANS'ı aşamaz.
Bu betik test kâhinidir (oracle): beklenen değeri o üretir.
"""
import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort

sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler

BURASI = Path(__file__).resolve().parent
KOK = BURASI.parent
PARITE = BURASI / "parite.json"
TOLERANS = 1e-4

# 5 referans girdi: oyunun farklı köşelerini kapsayacak şekilde elle seçildi.
REFERANSLAR = [
    {"ad": "K1 · yeni başlayan, ilk oyun, girişte acele etmedi",
     "girdi": {"seviye": 0, "sahne_no": 1, "hedef_eslesir": 1, "tekrar_oyun": 0, "giris_sn": 34.2,
               "giris_degisiklik": 2, "onceki_b_sayisi": 0, "onceki_karar_suresi_sn": 0,
               "onceki_ipucu_acti": 0, "onceki_tutor_mesaj": 0, "onceki_aciklama_sn": 0}},
    {"ad": "K2 · deneyimli, K1'de hızlı B, açıklamayı okumadı",
     "girdi": {"seviye": 2, "sahne_no": 2, "hedef_eslesir": 0, "tekrar_oyun": 0, "giris_sn": 6.1,
               "giris_degisiklik": 0, "onceki_b_sayisi": 1, "onceki_karar_suresi_sn": 4.3,
               "onceki_ipucu_acti": 0, "onceki_tutor_mesaj": 0, "onceki_aciklama_sn": 1.2}},
    {"ad": "K2 · biraz deneyimli, K1'de düşünerek A, tutor'a sordu",
     "girdi": {"seviye": 1, "sahne_no": 2, "hedef_eslesir": 1, "tekrar_oyun": 0, "giris_sn": 21.7,
               "giris_degisiklik": 1, "onceki_b_sayisi": 0, "onceki_karar_suresi_sn": 38.5,
               "onceki_ipucu_acti": 1, "onceki_tutor_mesaj": 2, "onceki_aciklama_sn": 17.9}},
    {"ad": "K3 · tekrar oyun, önceki iki sahnede B",
     "girdi": {"seviye": 1, "sahne_no": 3, "hedef_eslesir": 0, "tekrar_oyun": 1, "giris_sn": 2.4,
               "giris_degisiklik": 0, "onceki_b_sayisi": 2, "onceki_karar_suresi_sn": 3.1,
               "onceki_ipucu_acti": 0, "onceki_tutor_mesaj": 0, "onceki_aciklama_sn": 0.9}},
    {"ad": "K3 · deneyimli, K2'de süre doldu (60 sn), hedefi KVKK",
     "girdi": {"seviye": 2, "sahne_no": 3, "hedef_eslesir": 1, "tekrar_oyun": 0, "giris_sn": 12.0,
               "giris_degisiklik": 3, "onceki_b_sayisi": 1, "onceki_karar_suresi_sn": 60.0,
               "onceki_ipucu_acti": 1, "onceki_tutor_mesaj": 1, "onceki_aciklama_sn": 8.4}},
]


def model_kaynagi(verilen: str | None) -> str:
    if verilen:
        return verilen
    config = KOK / "model" / "config.json"
    if config.exists():
        yayin = json.loads(config.read_text(encoding="utf-8")).get("release")
        if yayin:
            return yayin["model_url"]
        return str(KOK / "model" / "model.onnx")
    sys.exit("✗ model bulunamadı: --model verin ya da önce train.py ile model/ üretin")


def model_baytlari(kaynak: str) -> bytes:
    if kaynak.startswith("http"):
        with urllib.request.urlopen(kaynak, timeout=30) as yanit:
            return yanit.read()
    return Path(kaynak).read_bytes()


def ozellik_sirasi(kaynak: str) -> list[str]:
    """config.json'daki sözleşmeden özellik sırası (model ile yan yana)."""
    config_kaynak = kaynak.rsplit("/", 1)[0] + "/config.json" if kaynak.startswith("http") \
        else str(Path(kaynak).with_name("config.json"))
    config = json.loads(model_baytlari(config_kaynak))
    return [o["name"] for o in config["features"]]


def python_olasiliklari(kaynak: str) -> tuple[list[float], str, list[str]]:
    baytlar = model_baytlari(kaynak)
    sira = ozellik_sirasi(kaynak)
    oturum = ort.InferenceSession(baytlar, providers=["CPUExecutionProvider"])
    X = np.array([[r["girdi"][ad] for ad in sira] for r in REFERANSLAR], dtype=np.float32)
    p = oturum.run(["probabilities"], {"input": X})[0][:, 1]
    return [float(v) for v in p], hashlib.sha256(baytlar).hexdigest(), sira


def sunucu_olasiligi(adres: str, girdi: dict) -> float:
    istek = urllib.request.Request(adres.rstrip("/") + "/predict", data=json.dumps(girdi).encode(),
                                   headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(istek, timeout=60) as yanit:
        return float(json.loads(yanit.read())["p"])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--uret", action="store_true", help="referans olasılıkları hesapla ve parite.json'a yaz")
    ap.add_argument("--model", help="model.onnx yolu ya da URL'si (yanında config.json olmalı)")
    ap.add_argument("--sunucu", help="sunucu tüketicisinin kök adresi (POST /predict)")
    args = ap.parse_args()

    kaynak = model_kaynagi(args.model)
    p_python, sha, sira = python_olasiliklari(kaynak)

    if args.uret:
        kayit = {
            "tolerance": TOLERANS,
            "model_source": kaynak,
            "model_sha256": sha,
            "feature_order": sira,
            "cases": [{"name": r["ad"], "input": r["girdi"], "p": round(p, 8)}
                      for r, p in zip(REFERANSLAR, p_python)],
        }
        PARITE.write_text(json.dumps(kayit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        for r, p in zip(REFERANSLAR, p_python):
            print(f"  p = {p:.6f}  {r['ad']}")
        print(f"✓ {PARITE.relative_to(KOK)} yazıldı (model SHA-256 {sha[:12]}…)")
        return

    beklenen = json.loads(PARITE.read_text(encoding="utf-8"))
    if beklenen["model_sha256"] != sha:
        print(f"! uyarı: parite.json başka bir modelle üretilmiş ({beklenen['model_sha256'][:12]}… ≠ {sha[:12]}…)")
    hatali = 0
    for vaka, p in zip(beklenen["cases"], p_python):
        satir = f"  {vaka['name']}\n    oracle {vaka['p']:.6f} · python {p:.6f} (|Δ| {abs(p - vaka['p']):.1e})"
        fark = abs(p - vaka["p"])
        if args.sunucu:
            p_sunucu = sunucu_olasiligi(args.sunucu, vaka["input"])
            satir += f" · sunucu {p_sunucu:.6f} (|Δ| {abs(p_sunucu - vaka['p']):.1e})"
            fark = max(fark, abs(p_sunucu - vaka["p"]))
        durum = "✓" if fark < TOLERANS else "✗"
        hatali += fark >= TOLERANS
        print(f"{durum}{satir[1:]}")
    if hatali:
        sys.exit(f"✗ {hatali} vakada fark >= {TOLERANS}")
    print(f"✓ 5/5 vaka tolerans içinde (< {TOLERANS})")


if __name__ == "__main__":
    main()
