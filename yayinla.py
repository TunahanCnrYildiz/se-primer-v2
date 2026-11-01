"""model/ klasörünü Hugging Face model reposuna yükler ve commit'e sabit sürümü kaydeder.

    python yayinla.py              # kapıyı kontrol et, yükle, v2.0 etiketi koy, doğrula
    python yayinla.py --kuru       # yalnız kontrolleri yap, hiçbir şey yükleme

Başlangıç reposundaki `hf_cli.py push-model`'den [1] uyarlandı. Eklenenler:
  - Kapı: config.json'da eval.passed true değilse yükleme yapılmaz (spec §10.4).
  - Commit'e sabit sürüm: yüklemenin commit numarası model/yayin.json'a yazılır. Uygulama
    (MODEL_COMMIT), parite testi ve sunucu bu numarayı kullanır; main dalı değişse de etkilenmez.
  - Doğrulama: dosyalar resolve/<commit>/ adresinden geri indirilir, SHA-256 yerelle aynı olmalı.

Önce bir kez: hf auth login (write yetkili token).
"""
import argparse
import hashlib
import json
import sys
import urllib.request
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # Windows konsolunda Türkçe karakterler
sys.stderr.reconfigure(encoding="utf-8")

BURASI = Path(__file__).resolve().parent
MODEL_DIR = BURASI / "model"
YAYIN = MODEL_DIR / "yayin.json"
DOSYALAR = ["model.onnx", "config.json", "README.md"]
REPO_ADI = "se-primer-v2"


def sha256(veri: bytes) -> str:
    return hashlib.sha256(veri).hexdigest()


def kontrol_et() -> dict:
    eksik = [d for d in DOSYALAR if not (MODEL_DIR / d).exists()]
    if eksik:
        sys.exit(f"✗ model/ eksik: {eksik}. Önce: python train.py")
    config = json.loads((MODEL_DIR / "config.json").read_text(encoding="utf-8"))
    if not config["eval"]["passed"] or config["version"].endswith("gelistirme"):
        sys.exit("✗ Bu model eval kapısından geçmemiş; yayınlanmaz (spec §10.4).")
    m = config["eval"]["metrics"]
    print(f"✓ kapı geçilmiş: v{config['version']}, ROC-AUC {m['roc_auc']}, B-duyarlılığı {m['recall_b']}, "
          f"{m['n_oturum']} gerçek oturum")
    return config


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--kuru", action="store_true", help="yalnız kontrol et, yükleme")
    args = ap.parse_args()

    config = kontrol_et()
    from huggingface_hub import HfApi

    api = HfApi()
    try:
        kullanici = api.whoami()["name"]
    except Exception:
        sys.exit("✗ Hugging Face girişi yok. Önce: hf auth login (write yetkili token)")
    repo = f"{kullanici}/{REPO_ADI}"
    etiket = f"v{config['version']}"
    print(f"  hedef: https://huggingface.co/{repo} (public), etiket {etiket}")
    if args.kuru:
        print("✓ kuru çalıştırma: hiçbir şey yüklenmedi")
        return

    api.create_repo(repo, repo_type="model", private=False, exist_ok=True)
    bilgi = api.upload_folder(repo_id=repo, repo_type="model", folder_path=MODEL_DIR,
                              allow_patterns=DOSYALAR,
                              commit_message=f"{etiket}: eval kapısından geçen model "
                                             f"(ROC-AUC {config['eval']['metrics']['roc_auc']})")
    commit = bilgi.oid
    api.create_tag(repo, tag=etiket, revision=commit, tag_message=f"SE Primer {etiket}")
    taban = f"https://huggingface.co/{repo}/resolve/{commit}/"
    print(f"✓ yüklendi: commit {commit}")

    # Commit'e sabit adresten geri indir ve yerel dosyalarla karşılaştır.
    ozetler = {}
    for dosya in DOSYALAR:
        with urllib.request.urlopen(taban + dosya, timeout=60) as yanit:
            uzak = yanit.read()
        yerel = (MODEL_DIR / dosya).read_bytes()
        if sha256(uzak) != sha256(yerel):
            sys.exit(f"✗ {dosya}: Hugging Face'teki dosya yereldekinden farklı")
        ozetler[dosya] = sha256(yerel)
    print("✓ doğrulandı: 3 dosya resolve/<commit>/ adresinden bayt bayt aynı indi")

    yayin = {
        "version": config["version"],
        "repo": repo,
        "commit": commit,
        "tag": etiket,
        "commit_url": bilgi.commit_url,
        "model_url": taban + "model.onnx",
        "config_url": taban + "config.json",
        "sha256": ozetler,
    }
    YAYIN.write_text(json.dumps(yayin, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"✓ {YAYIN.relative_to(BURASI)} yazıldı")
    print(f"\nSıradaki adımlar:\n  1) AI Studio: MODEL_COMMIT = '{commit}'\n"
          f"  2) python tests/parite.py --uret   (oracle bu commit'ten indirir)\n"
          f"  3) Render: MODEL_COMMIT={commit}")


if __name__ == "__main__":
    main()
