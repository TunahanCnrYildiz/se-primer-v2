# Veri sözlüğü

İki dosya var:

- `data/ham/*.csv`: Veri Toplama Modu'nun (`?veri=1`) son ekranda indirdiği ham kayıtlar. Her dosya bir oyundur, 3 satır içerir.
- `data/oturumlar.csv`: `python data/hazirla.py` ile üretilen eğitim verisi. Gerçek ve sentetik oyunlar birlikte, **her karar bir satır**.

KVKK: Ad, e-posta, cihaz kimliği, IP ve konum hiçbir dosyada yoktur. `oturum` her oyunun başında tarayıcıda rastgele üretilir (`crypto.randomUUID()` ilk 8 karakter) ve bir kişiyle eşleştirilemez. Tutor mesajlarının metni kaydedilmez, yalnızca sayısı.

## `data/oturumlar.csv`

### Kimlik ve izlenebilirlik

| Sütun | Tür | Anlamı |
|---|---|---|
| `oturum` | metin | Oyun kimliği. Gerçek oyunlarda rastgele 8 karakter, sentetiklerde `s000`–`s099`. Aynı kişi "Yeniden oyna" ile yeni bir oturum açar. |
| `kaynak` | `gercek` \| `sentetik` | Satırın kaynağı. Eval yalnızca `gercek` satırlarla yapılır (spec §10.4). |

### Model girdileri (sahneye girişte bilinenler, sıra `model/config.json` ile aynı)

| # | Sütun | Tür · birim | Anlamı |
|---|---|---|---|
| 1 | `seviye` | 0 / 1 / 2 | Girişteki seviye: 0 = Yeni başladım, 1 = Biraz deneyimliyim, 2 = Deneyimliyim |
| 2 | `sahne_no` | 1 / 2 / 3 | Karar: 1 = K1 Mimari, 2 = K2 Test, 3 = K3 KVKK |
| 3 | `hedef_eslesir` | 0 / 1 | Oyuncunun hedefi bu sahnenin konusu mu (Mimari↔1, Test↔2, KVKK↔3) |
| 4 | `tekrar_oyun` | 0 / 1 | Bu sekmede "Yeniden oyna" ile başlayan oyun mu (`oyun_no > 1`) |
| 5 | `giris_sn` | saniye, 1 ondalık | Giriş ekranının açılışından "Başla"ya kadar geçen süre. Tekrar oyunda cevaplar seçili geldiği için kısadır |
| 6 | `giris_degisiklik` | adet | Giriş ekranında, değeri olan bir cevabın başka bir seçenekle değiştirilme sayısı. İlk seçim ve aynı seçeneğe tekrar dokunmak sayılmaz |
| 7 | `onceki_b_sayisi` | adet, 0–2 | Bu oyunda önceki sahnelerde kaç kez B seçildi (süre dolması dahil) |
| 8 | `onceki_karar_suresi_sn` | saniye | Bir önceki sahnede, ekran açılışından seçime kadar geçen süre. Sahne 1'de 0 |
| 9 | `onceki_ipucu_acti` | 0 / 1 | Bir önceki sahnede ipucu kartı herhangi bir anda açık mıydı ("Yeni başladım"da hep 1). Sahne 1'de 0 |
| 10 | `onceki_tutor_mesaj` | adet | Bir önceki sahnede tutor'a giden istek sayısı ("İpucu iste" + yazılan mesaj). Sahne 1'de 0 |
| 11 | `onceki_aciklama_sn` | saniye | Bir önceki "ne oldu / neden oldu" ekranının açılışından "Devam"a kadar geçen süre. Sahne 1'de 0 |

### Etiket

| Sütun | Tür | Anlamı |
|---|---|---|
| `secti_b` | 0 / 1 | Oyuncu bu sahnede B'yi seçti (ya da süre dolup B uygulandı) = 1 |

### Bu sahneye ait ölçümler (model girdisi DEĞİL)

Bu sütunlar karar anında ya da sonrasında oluşur. Tahmin anında bilinmezler ve müdahaleden etkilenirler. Girdi yapılırlarsa sızıntı olur. Dosyada yalnızca analiz ve bir sonraki sahnenin `onceki_*` değerleri için tutulurlar.

| Sütun | Tür · birim | Anlamı |
|---|---|---|
| `rol` | `backend` \| `devops` \| `qa` | Girişteki rol (yalnızca anlatıyı değiştirir) |
| `hedef` | `architecture` \| `testing` \| `privacy` | Girişteki hedef |
| `oyun_no` | adet, 1'den başlar | Bu sekmede kaçıncı oyun (`tekrar_oyun` buradan türetilir) |
| `karar_suresi_sn` | saniye, 1 ondalık | Bu sahnede ekran açılışından seçime kadar geçen süre (`performance.now()`) |
| `ipucu_acti` | 0 / 1 | Bu sahnede ipucu kartı herhangi bir anda açık mıydı |
| `tutor_mesaj` | adet | Bu sahnede tutor'a giden istek sayısı |
| `aciklama_sn` | saniye, 1 ondalık | Bu kararın açıklama ekranında kalınan süre |
| `sure_doldu` | 0 / 1 | "Deneyimliyim"de 60 sn doldu ve B otomatik uygulandı |

## `data/ham/*.csv` (Veri Toplama Modu çıktısı)

Başlık: `surum,oturum,sahne_no,seviye,rol,hedef,karar_suresi_sn,ipucu_acti,tutor_mesaj,secim,sure_doldu,aciklama_sn,oyun_no,giris_sn,giris_degisiklik,kaynak`

Yukarıdakilerden farklı olan sütunlar:

| Sütun | Anlamı |
|---|---|
| `surum` | Kaydı üreten uygulama sürümü (`2.1-veri`). Giriş ölçümleri olmayan `2.0-veri` dosyaları kabul edilmez |
| `giris_sn`, `giris_degisiklik` | Oyunun üç satırında da aynı değer |
| `secim` | `A` \| `B`. `oturumlar.csv`'de `secti_b`'ye dönüşür |

`hazirla.py` her ham dosyayı doğrular: Başlık birebir aynı olmalı, 3 satır (sahne 1, 2, 3) bulunmalı, `kaynak = gercek` olmalı, değerler tanımlı aralıkta kalmalı, süre dolduysa seçim B olmalı. Bozuk dosyada betik durur. Aynı oturum iki kez gönderildiyse bir kez sayılır.
