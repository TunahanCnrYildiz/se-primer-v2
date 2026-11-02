---
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

# SE Primer v2 — bedelli seçim riski (v2.1)

## Amaç

SE Primer, telefondan oynanan üç kararlık bir yazılım mühendisliği senaryosu (hastane randevu sistemi 08:00'de çöküyor). Bu model, oyuncu bir sahneye **girdiğinde** o sahnede bedeli yüksek seçeneği (B) seçme olasılığını tahmin eder. `p >= 0.5` ise oyun, oyuncu seçimini yapmadan önce müdahale eder: ipucu kartı açılır, deneyimli oyuncunun 60 sn sayacı kalkar, tutor'un yansıtma sorusu gösterilir.

## Model

- `sklearn` Pipeline: `StandardScaler → LogisticRegression(class_weight="balanced")`, `random_state=13`
- ONNX: girdi `input` float32 `[n, 11]`, çıktı `probabilities` `[n, 2]` (sınıf 1 = B seçer). ONNX ile sklearn arasındaki en büyük fark: 8.05e-08
- Eğitim ortamı: Python 3.14, scikit-learn 1.9.1, skl2onnx 1.20.0

### Girdiler (sıra önemlidir)

Hepsi sahneye girişte bilinen bilgilerdir. Bu sahnedeki karar süresi ya da ipucu açılması girdi değildir (sızıntı).

| # | Özellik | Birim | Anlamı |
|---|---|---|---|
| 1 | `seviye` | kategori | Girişteki seviye: 0 yeni başladım, 1 biraz deneyimli, 2 deneyimli |
| 2 | `sahne_no` | kategori | Karar: 1 mimari, 2 test, 3 KVKK |
| 3 | `hedef_eslesir` | 0/1 | Oyuncunun hedefi bu sahnenin konusu mu |
| 4 | `tekrar_oyun` | 0/1 | Bu sekmede 'Yeniden oyna' ile başlayan oyun mu |
| 5 | `giris_sn` | saniye | Giriş ekranında 'Başla'ya kadar geçen süre |
| 6 | `giris_degisiklik` | adet | Giriş ekranında verilen cevabın değiştirilme sayısı |
| 7 | `onceki_b_sayisi` | adet | Önceki sahnelerde B seçilme sayısı |
| 8 | `onceki_karar_suresi_sn` | saniye | Önceki sahnede seçime kadar geçen süre (sahne 1'de 0) |
| 9 | `onceki_ipucu_acti` | 0/1 | Önceki sahnede ipucu kartı açık mıydı (sahne 1'de 0) |
| 10 | `onceki_tutor_mesaj` | adet | Önceki sahnede tutor'a giden istek sayısı (sahne 1'de 0) |
| 11 | `onceki_aciklama_sn` | saniye | Önceki açıklama ekranında kalınan süre (sahne 1'de 0) |

## Veri

- Eğitim: 31 gerçek oturum, 93 karar (Veri Toplama Modu, `data/v21_egitim_oturumlari.txt`). Test: eğitimden sonra toplanan 17 gerçek oturum, 51 karar; eğitimde kullanılmadı.
- Sentetik: 100 oturum (kurala dayalı üretici, tohum 13; kural `data/hazirla.py`'de). v2.1'in eğitiminde kullanılmadı (spec §10.8); yalnız boru hattı denemesi için.
- Kişisel veri yok: ad, e-posta, cihaz kimliği, IP, konum toplanmadı; oturum kimliği rastgele.
- Veri dosyası SHA-256: `22b8136245bba7b2850ec9c25c5d4e0559a9e3a6c3f9b13d2dd09c5fc8d10f50`

## Değerlendirme

Bekletilen test seti (spec §10.8): model dondurulmuş eğitim oturumlarıyla eğitildi, eğitimden sonra toplanan ve eğitimde hiç kullanılmayan gerçek oturumlarda bir kez ölçüldü.

| Metrik | Değer | Kapı |
|---|---|---|
| ROC-AUC | 0.7148 (%95 GA 0.5–0.8492, oturum bootstrap) | ≥ 0.65 |
| B-duyarlılığı (p ≥ 0.5) | 0.8182 | ≥ 0.6 |
| B-kesinliği | 0.375 | — |
| Doğruluk | 0.6667 | — |
| Müdahale oranı | 0.4706 | — |

Ölçülen: 17 oturum, 51 karar, 11 B. Kapı sonucu: **GEÇTİ**.

## Sınırlar

- Ölçüm küçük bir örneklemde yapıldı. Güven aralığı geniştir (alt ucu yazı-tura düzeyine, 0.50'ye yakın olabilir); tek bir sayıya güvenmeyin.
- Test setinin 11/17 oturumunda üç karar da 3 saniyenin altında verildi (test karar süresi ortancası 1.2 sn, eğitimde 7.5 sn). Bu oyuncular senaryoyu daha önce oynamıştı ve metni okumadan geçmiş olabilir; ölçüm, dikkatle ilk kez oynayan oyuncuyu tam temsil etmez.
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

Yayınlanan commit, etiket (`v2.1`) ve geri alma: GitHub reposundaki `RELEASE.md`.

Kaynak kod, eğitim ve testler: https://github.com/TunahanCnrYildiz/se-primer-v2
