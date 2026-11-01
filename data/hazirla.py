"""Ham oyun kayıtlarından eğitim verisini (data/oturumlar.csv) üretir.

    python data/hazirla.py

1. data/ham/*.csv: Veri Toplama Modu'nun indirdiği dosyalar (her dosya bir oyun,
   3 satır, kaynak=gercek). Biçimi bozuk dosya atlanmaz, betik hata verip durur.
2. Sentetik oturumlar: aşağıdaki kurala göre, sabit tohumla (kaynak=sentetik).
3. Her iki kaynaktan aynı fonksiyonla (ozellik_turet) model girdileri türetilir.

Model girdileri sahneye GİRİŞTE bilinen bilgilerdir (spec §10.2). Bu sahneye ait
karar_suresi_sn, ipucu_acti, tutor_mesaj, aciklama_sn, sure_doldu sütunları
dosyada kalır ama model girdisi değildir (sızıntı).
"""
import sys
from pathlib import Path

import numpy as np
import pandas as pd

sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler

BURASI = Path(__file__).resolve().parent
HAM =BURASI / "ham"
CIKTI = BURASI / "oturumlar.csv"

SEED = 13
SENTETIK_OTURUM = 100

HAM_SUTUNLAR = ["surum", "oturum", "sahne_no", "seviye", "rol", "hedef", "karar_suresi_sn",
                "ipucu_acti", "tutor_mesaj", "secim", "sure_doldu", "aciklama_sn", "kaynak"]
ROLLER = {"backend", "devops", "qa"}
HEDEF_SAHNE = {"architecture": 1, "testing": 2, "privacy": 3}  # hedefin konusu olan sahne

OZELLIKLER = ["seviye", "sahne_no", "hedef_eslesir", "onceki_b_sayisi", "onceki_karar_suresi_sn",
              "onceki_ipucu_acti", "onceki_tutor_mesaj", "onceki_aciklama_sn"]
HEDEF = "secti_b"


# --------------------------------------------------------------------------- gerçek veri
def ham_dosya_oku(yol: Path) -> pd.DataFrame:
    df = pd.read_csv(yol, dtype={"oturum": str})
    hatalar = []
    if list(df.columns) != HAM_SUTUNLAR:
        hatalar.append(f"başlık beklenenden farklı: {list(df.columns)}")
    else:
        if len(df) != 3 or sorted(df["sahne_no"]) != [1, 2, 3]:
            hatalar.append("tam 3 satır (sahne 1, 2, 3) olmalı")
        if df["oturum"].nunique() != 1:
            hatalar.append("dosyada birden çok oturum var")
        if not set(df["kaynak"]) <= {"gercek"}:
            hatalar.append("kaynak yalnız 'gercek' olmalı")
        if not set(df["seviye"]) <= {0, 1, 2} or df["seviye"].nunique() != 1:
            hatalar.append("seviye 0/1/2 ve oyun boyunca sabit olmalı")
        if not set(df["rol"]) <= ROLLER or not set(df["hedef"]) <= set(HEDEF_SAHNE):
            hatalar.append("rol ya da hedef tanımsız")
        if not set(df["secim"]) <= {"A", "B"}:
            hatalar.append("secim A ya da B olmalı")
        if (df[["karar_suresi_sn", "aciklama_sn", "tutor_mesaj"]] < 0).any().any():
            hatalar.append("süre ya da sayı negatif")
        if ((df["sure_doldu"] == 1) & (df["secim"] != "B")).any():
            hatalar.append("süre dolduysa secim B olmalı")
    if hatalar:
        sys.exit(f"✗ {yol.name}: " + "; ".join(hatalar))
    return df


def gercek_veri() -> pd.DataFrame:
    dosyalar = sorted(HAM.glob("*.csv"))
    if not dosyalar:
        return pd.DataFrame(columns=HAM_SUTUNLAR)
    df = pd.concat([ham_dosya_oku(d) for d in dosyalar], ignore_index=True)
    # Aynı dosya iki kez gönderildiyse (aynı oturum kimliği) bir kez say.
    tekrar = df.duplicated(subset=["oturum", "sahne_no"])
    if tekrar.any():
        print(f"  ! {df.loc[tekrar, 'oturum'].nunique()} oturum birden çok dosyada, tekrarlar atıldı")
        df = df[~tekrar]
    return df


# --------------------------------------------------------------------------- sentetik veri
def sentetik_veri(n_oturum: int = SENTETIK_OTURUM, seed: int = SEED) -> pd.DataFrame:
    """Kurala dayalı üretici + gürültü (README'de yazılı).

    Her oyuncunun gizli bir "risk eğilimi" r ~ N(0, 1) vardır. Riskli oyuncu daha hızlı
    karar verir, ipucunu ve tutor'u daha az açar, açıklamayı daha kısa okur ve B'yi daha
    sık seçer. Bu sahnede ipucunu açmak ve hedefin bu sahnenin konusu olması B olasılığını
    düşürür. Deneyimli oyuncuda karar 60 sn'yi aşarsa süre dolar ve B uygulanır.
    """
    rng = np.random.default_rng(seed)
    sahne_etkisi = {1: 0.2, 2: 0.4, 3: -0.4}
    satirlar = []
    for i in range(n_oturum):
        oturum = f"s{i:03d}"
        seviye = int(rng.integers(0, 3))
        rol = str(rng.choice(sorted(ROLLER)))
        hedef = str(rng.choice(list(HEDEF_SAHNE)))
        r = rng.normal()
        onceki_b = 0
        for sahne in (1, 2, 3):
            ipucu = 1 if seviye == 0 else int(rng.random() < _sigmoid(-0.2 - 0.8 * r))
            tutor = int(rng.poisson(np.exp(-1.0 - 0.5 * r)))
            sure = float(rng.lognormal(np.log(25) - 0.35 * r - 0.15 * seviye, 0.4))
            logit = (-1.1 + 0.9 * r + sahne_etkisi[sahne] - 0.6 * (HEDEF_SAHNE[hedef] == sahne)
                     - 0.5 * ipucu + 0.3 * onceki_b)
            secim = "B" if rng.random() < _sigmoid(logit) else "A"
            doldu = 0
            if seviye == 2 and sure >= 60:
                sure, secim, doldu = 60.0, "B", 1
            aciklama = float(rng.lognormal(np.log(12) - 0.4 * r, 0.5))
            satirlar.append(["2.0-sentetik", oturum, sahne, seviye, rol, hedef, round(sure, 1), ipucu,
                             tutor, secim, doldu, round(aciklama, 1), "sentetik"])
            onceki_b += secim == "B"
    return pd.DataFrame(satirlar, columns=HAM_SUTUNLAR)


def _sigmoid(x):
    return 1 / (1 + np.exp(-x))


# --------------------------------------------------------------------------- özellikler
def ozellik_turet(ham: pd.DataFrame) -> pd.DataFrame:
    """Her satıra, o sahneye girişte bilinen girdileri ekler (spec §10.2).

    Tarayıcıdaki çıkarım aynı tanımı kullanır: K1'de "önceki" değerlerin hepsi 0'dır.
    """
    df = ham.sort_values(["kaynak", "oturum", "sahne_no"]).reset_index(drop=True)
    df["secti_b"] = (df["secim"] == "B").astype(int)
    df["hedef_eslesir"] = (df["hedef"].map(HEDEF_SAHNE) == df["sahne_no"]).astype(int)
    oyun = df.groupby(["kaynak", "oturum"], sort=False)
    df["onceki_b_sayisi"] = oyun["secti_b"].cumsum() - df["secti_b"]
    for kaynak_sutun, ozellik in [("karar_suresi_sn", "onceki_karar_suresi_sn"),
                                  ("ipucu_acti", "onceki_ipucu_acti"),
                                  ("tutor_mesaj", "onceki_tutor_mesaj"),
                                  ("aciklama_sn", "onceki_aciklama_sn")]:
        df[ozellik] = oyun[kaynak_sutun].shift(1).fillna(0).astype(df[kaynak_sutun].dtype)
    sutunlar = (["oturum", "kaynak"] + OZELLIKLER + [HEDEF] +
                ["rol", "hedef", "karar_suresi_sn", "ipucu_acti", "tutor_mesaj", "aciklama_sn", "sure_doldu"])
    return df[sutunlar]


def main():
    gercek = gercek_veri()
    sentetik = sentetik_veri()
    veri = ozellik_turet(pd.concat([gercek, sentetik], ignore_index=True))
    veri.to_csv(CIKTI, index=False, lineterminator="\n")  # her işletim sisteminde aynı bayt (SHA-256)
    for kaynak, grup in veri.groupby("kaynak"):
        print(f"  {kaynak:9s}: {grup['oturum'].nunique():3d} oturum, {len(grup):3d} satır, "
              f"B oranı %{100 * grup[HEDEF].mean():.0f}")
    print(f"✓ {CIKTI.relative_to(BURASI.parent)} yazıldı")


if __name__ == "__main__":
    main()
