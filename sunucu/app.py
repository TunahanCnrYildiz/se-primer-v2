"""Sunucu tüketicisi (bonus): aynı model.onnx'i sunucuda çalıştırır, istek-yanıtla olasılık döner.

    uvicorn app:app --port 8000                       # sunucu/ içinde
    MODEL_COMMIT=<commit>                             # Hugging Face'ten commit'e sabit indir (Render)
    MODEL_YOL=../model                                # ya da yerel klasörden (geliştirme)

    GET  /          → sağlık: model sürümü, commit, özellik sırası
    POST /predict   → {"seviye": 0, ..., "onceki_aciklama_sn": 0}  →  {"p": 0.37, "mudahale": false, ...}

İstek biçimi ve sınırlar model/config.json'daki sözleşmeden okunur (request_schema): 11 özelliğin
hepsi zorunlu, fazlası kabul edilmez, değerler tanımlı aralıkta olmalı. Başlangıç reposundaki
rails-api tüketicisinin [1] FastAPI karşılığıdır.
"""
import json
import math
import os
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from fastapi import Body, FastAPI, HTTPException

MODEL_REPO = os.environ.get("MODEL_REPO", "TunahanCnr/se-primer-v2")
MODEL_COMMIT = os.environ.get("MODEL_COMMIT")
MODEL_YOL = os.environ.get("MODEL_YOL")


def dosya_oku(ad: str) -> bytes:
    if MODEL_YOL:
        return (Path(MODEL_YOL) / ad).read_bytes()
    if not MODEL_COMMIT:
        raise RuntimeError("MODEL_COMMIT ya da MODEL_YOL ortam değişkeni gerekli")
    url = f"https://huggingface.co/{MODEL_REPO}/resolve/{MODEL_COMMIT}/{ad}"
    with urllib.request.urlopen(url, timeout=60) as yanit:
        return yanit.read()


CONFIG = json.loads(dosya_oku("config.json"))
OTURUM = ort.InferenceSession(dosya_oku("model.onnx"), providers=["CPUExecutionProvider"])
OZELLIKLER = CONFIG["features"]
ESIK = CONFIG["decision_threshold"]
KAYNAK = f"yerel: {MODEL_YOL}" if MODEL_YOL else f"{MODEL_REPO}@{MODEL_COMMIT}"

app = FastAPI(title="SE Primer v2 · sunucu tüketicisi", version=CONFIG["version"])


def dogrula(girdi: dict) -> list[str]:
    hatalar = []
    adlar = {o["name"] for o in OZELLIKLER}
    if eksik := sorted(adlar - girdi.keys()):
        hatalar.append(f"eksik özellik: {eksik}")
    if fazla := sorted(girdi.keys() - adlar):
        hatalar.append(f"tanımsız özellik: {fazla}")
    for o in OZELLIKLER:
        deger = girdi.get(o["name"])
        if deger is None:
            continue
        if isinstance(deger, bool) or not isinstance(deger, (int, float)) or not math.isfinite(deger):
            hatalar.append(f"{o['name']}: sayı olmalı")
        elif deger < o["min"] or (o["max"] is not None and deger > o["max"]):
            hatalar.append(f"{o['name']}: {o['min']}–{o['max'] if o['max'] is not None else '∞'} aralığında olmalı")
    return hatalar


@app.get("/")
def saglik():
    return {"durum": "hazir", "model_version": CONFIG["version"], "kaynak": KAYNAK,
            "features": [o["name"] for o in OZELLIKLER], "decision_threshold": ESIK}


@app.post("/predict")
def tahmin(girdi: dict = Body(...)):
    if hatalar := dogrula(girdi):
        raise HTTPException(status_code=422, detail=hatalar)
    x = np.array([[girdi[o["name"]] for o in OZELLIKLER]], dtype=np.float32)
    p = float(OTURUM.run(["probabilities"], {"input": x})[0][0, 1])
    return {"p": p, "mudahale": p >= ESIK, "model_version": CONFIG["version"], "kaynak": KAYNAK}
