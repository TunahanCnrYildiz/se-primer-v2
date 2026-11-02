# Sürüm notları ve dağıtım kararı

## v2.1 · 2 Kasım 2026 · yayında

| | |
|---|---|
| Model reposu | https://huggingface.co/TunahanCnr/se-primer-v2 |
| Commit | [`7468f86b263b779b55c05f11735eb80f08f6618f`](https://huggingface.co/TunahanCnr/se-primer-v2/tree/7468f86b263b779b55c05f11735eb80f08f6618f) (`model/yayin.json`) |
| Etiket | `v2.1` |
| Commit'e sabit model URL'si | `https://huggingface.co/TunahanCnr/se-primer-v2/resolve/7468f86b263b779b55c05f11735eb80f08f6618f/model.onnx` |
| Eğitim verisi | 31 gerçek oturum (93 karar), [`data/v21_egitim_oturumlari.txt`](data/v21_egitim_oturumlari.txt). Sentetik veri kullanılmadı |
| Test verisi | Eğitimden sonra toplanan 17 gerçek oturum (51 karar, 11 B); eğitimde hiç kullanılmadı, bir kez ölçüldü ([`data/v21_olcum.json`](data/v21_olcum.json)) |
| Eval kapısı (spec §10.8) | ROC-AUC **0.715** (%95 GA 0.50–0.85) ≥ 0.65 ✓ · B-duyarlılığı **0.818** ≥ 0.60 ✓ · B-kesinliği 0.375 · müdahale oranı 0.47 → **GEÇTİ** |
| Uygulama | https://se-primer-v2.ai.studio · `MODEL_COMMIT = '7468f86b…'` (AI Studio Prompt 4) |
| Sunucu | https://se-primer-v2-api.onrender.com · `MODEL_COMMIT` aynı (Render, ücretsiz plan) |

### Ne değişti (v1 → v2.1)

- **Uyum kaynağı:** v1'de seviye ipucunu ve süre baskısını sabit kuralla belirliyordu. v2.1'de sahneye girişte bir model, oyuncunun B'yi seçme olasılığını tahmin eder; `p ≥ 0.50` ise ipucu kartı açılır, deneyimli oyuncunun sayacı kalkar ve bir "dur ve düşün" sorusu çıkar. `p < 0.50` ise v1 kuralları aynen geçerlidir.
- **Model bir dosya oldu:** `model.onnx` + `config.json` (sözleşme: özellik sırası, eşik, JSON şeması) + model kartı. Uygulama bunları Hugging Face'ten commit'e sabit adresle indirir.
- **Üç tüketici, aynı sayı:** Tarayıcı (onnxruntime-web), Python oracle ve sunucu (FastAPI, Render) aynı 5 referans girdide aynı olasılığı verir.
- **Veri Toplama Modu** (`?veri=1`): her karar bir satır, KVKK'ya uygun, gölge mod.
- **Değişmeyenler:** Senaryo metinleri, 8 yolun saatleri ve sonları, tutor. v1'in 28 E2E testi regresyon seti olarak geçiyor.

### Parite sonuçları (v2.1, model Hugging Face'ten)

| Tüketici | Çalışma zamanı | 5 referans girdide en büyük \|Δ\| | Tolerans | Kanıt |
|---|---|---|---|---|
| Python oracle | onnxruntime 1.31.1 | — (kâhin) | — | `tests/parite.json` |
| Tarayıcı (Cypress) | onnxruntime-web 1.31.1 | **2.7e-8** | 1e-4 | `tests/parite-tarayici.json` |
| Sunucu (Render) | onnxruntime 1.31.1, FastAPI | **8.7e-8** | 1e-4 | `tests/parite-sunucu.txt` |
| sklearn ↔ ONNX | — | **8.1e-8** | 1e-4 | `model/config.json` |

E2E: `npm test` **41/41** (v1'in 28 testi `p = 0` ile, 8 yol gerçek modelle, KÖ-9/10/11 + gölge mod, parite).

### Ölçümlerin kronolojisi

Her kural, ilgili ölçümden önce commit'lendi (git geçmişi kanıttır).

| Tarih (2026) | Commit | Olay |
|---|---|---|
| 1 Kas 12:09 | `227eb23` | Kapı yazıldı: ROC-AUC ≥ 0.65, B-duyarlılığı ≥ 0.60 (spec 2.0) |
| 1 Kas 12:55 | `fb0675b` | Gerçek veriden önce 3 girdi eklendi, kapı geçilemezse yol yazıldı (spec 2.1) |
| 2 Kas | `a5b1bf2` | **v2.0 1. ölçüm** (17 oturum, 5 katlı gruplanmış CV): ROC-AUC 0.618, B-duyarlılığı 0.545 → geçemedi |
| 2 Kas 13:08 | `29bb3aa` | Tek ve son ikinci ölçümün koşulu (spec 2.2) |
| 2 Kas | `29bb3aa` sonrası | **v2.0 2. ölçüm** (31 oturum): ROC-AUC 0.643 (GA 0.44–0.82), B-duyarlılığı 0.579 → geçemedi, **v2.0 reddedildi** |
| 2 Kas 13:20 | `9b4f4bd` | v2.1: eğitim seti donduruldu, bekletilen test setiyle tek ölçüm kuralı (spec 2.3) |
| 2 Kas 13:33 | `17b8644` | **v2.1 tek ölçüm** (17 yeni oturum): ROC-AUC 0.715, B-duyarlılığı 0.818 → geçti |

## v2.0 · reddedildi

Hugging Face'e yüklenmedi; hiçbir tüketiciye ulaşmadı. 5 katlı, oturuma göre gruplanmış çapraz doğrulama; gerçek oturumlar + 100 sentetik oturumla eğitim.

| Ölçüm | Veri | ROC-AUC (%95 GA) | B-duyarlılığı | Sonuç |
|---|---|---|---|---|
| 1 | 17 oturum, 9 kişi, 11 B | 0.618 (0.32–0.88) | 0.545 | geçemedi |
| 2 (son) | 31 oturum, 16 kişi, 19 B | 0.643 (0.44–0.82) | 0.579 | geçemedi → reddedildi |

**Bulgu:** Tekrar oyunlarda oyuncular neredeyse hep A seçti; sentetik üretici bunun tersini varsayıyordu. v2.1'de sentetik veri eğitimden çıkarıldı ve bu değişiklik yalnız yeni toplanan verilerle sınandı (KARARLAR K-36, K-37).

## Geri alma (rollback)

v2.1 yayınlanan ilk model sürümüdür; geri dönülecek önceki durum "model yok, v1 kuralları"dır.

| Ne kadar geri | Nasıl | Süre |
|---|---|---|
| **Tek oyuncu için kapat** | Adrese `?model=kapali` eklenir. Model hiç indirilmez, v1 kuralları geçerli | Anında, yayın gerekmez |
| **Herkes için kapat** | Uygulamada `MODEL_COMMIT = 'YOK'` yapılır (AI Studio'ya tek satırlık prompt → Publish). KÖ-11'deki davranış: oyuncuya hata gösterilmez, `p` "—" olur | Bir yayın |
| **Önceki model sürümüne dön** (v2.1 sonrası için) | `MODEL_COMMIT` önceki commit'e çevrilir; Render'da aynı ortam değişkeni değiştirilir. `tests/parite.json` o commit'le yeniden üretilir (`python tests/parite.py --uret`) | Bir yayın |

Neden çalışır: Tüketiciler modeli `main` dalından değil commit'e sabit adresten indirir. Hugging Face'teki eski commit silinmez; ona dönmek yeni bir eğitim ya da yükleme gerektirmez. Model reposuna yeni bir dosya yüklenmesi, `MODEL_COMMIT` değişmedikçe hiçbir tüketiciyi etkilemez.

## Dağıtım stratejileri senaryomuzda

Önce dürüst bir sınır: Bu bir ders projesi; günde onlarca değil birkaç oyuncu var. Aşağıdakilerden **yalnız gölge dağıtım uygulandı**. Canary ve kademeli yayın, oyuncu sayısı büyüdüğünde nasıl işleyeceğinin planıdır ve kodda yoktur.

### Shadow (gölge) dağıtım · uygulandı

- Veri Toplama Modu (`?veri=1`) gölge moddur: Model her sahnede çalışır ve olasılığı ekranda görünür, ama **oyunu değiştirmez**. Böylece modelin müdahalesi, öğreneceği etiketi (oyuncunun gerçek seçimi) bozmaz.
- Arkadaş oyunları bu modda toplandı. O sırada henüz yayınlanmış bir model yoktu (`MODEL_COMMIT = 'YOK'`), yani oyunlar tamamen v1 kurallarıyla oynandı ve etiketler müdahalesiz kaldı. v2.1 yayınlandıktan sonra `?veri=1` ile toplanacak oyunlarda model gölgede gerçekten çalışır.
- Test: `cypress/e2e/model.cy.js` → "Gölge mod": `?veri=1&p=0.9` ile müdahale yok, sayaç yerinde.
- Bir sonraki sürümde (v2.2) gölge dağıtım şöyle kullanılır: Aday model, yayındaki modelin yanında gölge modda çalışır ve kendi `p`'sini kaydeder; gerçek seçimlerle karşılaştırılıp aynı kapıdan geçerse canary'ye alınır. (Bunun için CSV'ye bir `p_golge` sütunu eklemek gerekir; veri biçimi değişeceği için 2.1'de yapılmadı.)

### Canary (%5) · plan

- Oyuncu, oyunun başında üretilen rastgele `oturum` kimliğine göre ayrılır: `hash(oturum) mod 100 < 5` ise aday model, değilse yayındaki model. Kimlik rastgele olduğu için ayrım oyuncunun profiline bağlı değildir.
- İzlenecekler ve durdurma ölçütleri: model yükleme hatası oranı (`p` = "—"), sahne geçiş gecikmesi (1,5 sn sınırı), müdahale oranı (eğitimdekinden çok saparsa dağılım kayması), Son B oranı ve oyunu yarıda bırakma. Herhangi biri yayındaki modelden kötüyse `MODEL_COMMIT_CANARY` boşaltılır (geri alma).
- Gerçekçilik notu: %5'lik dilim, günde 10 oyunda haftada 3–4 oyuncu demektir; bu sayıyla müdahale oranı bile anlamlı ölçülemez. Bu ölçekte canary bir "duman testi"dir (yükleniyor mu, oyunu bozuyor mu), istatistiksel bir karşılaştırma değil.

### Kademeli yayın (%25 → %50 → %100) · plan

- Aynı `oturum` ayrımıyla dilim büyütülür. Her adımda canary'deki ölçütler yeniden kontrol edilir; her basamak en az bir hafta ya da önceden yazılmış bir oyun sayısı sürer.
- Herhangi bir basamakta ölçütler kötüleşirse bir önceki basamağa (ya da `YOK`'a) dönülür.
- %100'den sonra aday "yayındaki model" olur ve bir sonraki aday için gölge döngüsü yeniden başlar (Amershi vd.'nin [3] yaşayan ML yaşam döngüsü).

## Mimari dağıtım kararı ve ödünleşim matrisi

Üç seçenek, ödevin üç sorusuna göre:

| | **Tarayıcı** (onnxruntime-web) · *seçilen* | **Cihaz içi** (Expo, gömülü ONNX) | **Kendi sunucu** (FastAPI / Render) · *bonus* |
|---|---|---|---|
| **1. Ağ zorunlu mu, gecikme nasıl?** | Yalnız ilk açılışta (model + çalışma zamanı indirilir). Sonra her tahmin cihazda; ölçülen ortanca **4 ms** (10 tahmin, ekran güncellemesi dahil). İlk yükleme: sayfa açılışından modelin hazır olmasına **~2,7 sn**; büyük kısmı 4,7 MB'lık çalışma zamanı (WebAssembly), model yalnız 653 bayt | Hayır, model uygulamayla gelir; tamamen çevrimdışı. Tahmin cihazda, ms düzeyinde | Her tahminde evet. Gidiş-dönüş ölçülen ortanca **274 ms** (10 istek, 259–308 ms, Türkiye'den). Ücretsiz planda 15 dk boşta kalınca uyur; ilk istek ⏳ DOLDURULACAK sn (soğuk başlatma) |
| **2. Veri cihazdan çıkar mı? (KVKK)** | Hayır. 11 davranış girdisi tarayıcıda kalır | Hayır | **Evet.** 11 girdi her sahnede sunucuya gider. Kişisel veri içermez (ad, cihaz, IP saklanmaz), ama davranış verisidir: sunucu kayıt tutmamalı, aktarım gerekçesi ve süresi yazılmalı (veri minimizasyonu) |
| **3. Model gizli kalır mı?** | Hayır. Model ve eşik herkesin indirebileceği bir dosya; katsayılar okunabilir | Hayır. Model uygulama paketinden (APK) çıkarılabilir | Sunucu modeli gizli bir kaynaktan alırsa **evet**. Ama istek-yanıt da sızdırır: çok sayıda sorguyla modelin kopyası çıkarılabilir (model çıkarma / tersine mühendislik). Hız sınırı ve yalnız karar (`mudahale`) dönmek riski azaltır. Bizim sunucumuz modeli public Hugging Face'ten aldığı için gizlilik kazancı yok |

**Karar: tarayıcı.** Gerekçe:

1. Oyun zaten tarayıcıda ve tek tahmin sahne geçişinde yapılıyor; ağa ilk açılıştan sonra gerek kalmaması, oyunun 1,5 sn'lik geçiş bütçesine uyuyor.
2. Davranış verisinin cihazdan hiç çıkmaması, v1'in "ilerleme kaydı yok, sunucuya veri yazılmaz" ilkesini (spec §3) koruyor.
3. Modelin gizli olması gerekmiyor: Bir oyuncunun B seçme olasılığı ticari ya da güvenlik açısından hassas bir bilgi değil; modeli kopyalayan biri yalnız oyunu "kandırabilir". Model kartında bu, "gizli kalması gereken bir mantık için kullanmayın" diye yazıldı.

**Sunucu ne zaman doğru seçim olurdu:** Model gizli kalmalıysa (ör. ücretli bir ürünün ayırt edici modeli) ya da tahmin, cihazda bulunmayan bir veriye (başka oyuncuların verisi) ihtiyaç duysaydı. O zaman KVKK yükü (aktarım, saklama, aydınlatma) ve ağ gecikmesi bu kazancın bedeli olurdu.

**Cihaz içi (Expo) neden seçilmedi:** Çevrimdışı çalışma bu senaryoda gerekmiyor ve v1 bir web uygulaması; mobil sürüm ayrı bir kod tabanı ve mağaza dağıtımı demek. Ders kapsamında puan getirmeyen bir maliyet.

## Sürümleme ilkeleri

Shankar vd. [4]'nin 3V'si bu projede:

- **Versioning:** Model commit'e sabit (`resolve/<commit>`) ve etiketli (`v2.1`); kod GitHub'da, veri `oturumlar.csv` olarak SHA-256'sıyla `config.json`'da. Hangi uygulama sürümünün hangi modeli kullandığı `MODEL_COMMIT`'ten okunur.
- **Validation:** Kapı eğitimden önce yazıldı (commit `227eb23`) ve `train.py`'de koda bağlı; kapıdan geçmeyen model `model/`'e yazılmaz, `yayinla.py` onu yüklemeyi reddeder. Kapı bu projede gerçekten çalıştı: v2.0'ı iki kez durdurdu. Ölçüm sayısı önceden sınırlandı (optional stopping'e karşı) ve v2.1, eğitimde hiç görmediği verilerle bir kez sınandı. Sonra parite (üç tüketici) ve regresyon.
- **Velocity:** `python train.py` → `python yayinla.py` → tek satırlık `MODEL_COMMIT` değişikliği. Veri → yayın tek oturumda biter; geri alma bir satır.

## Bilinen sınırlar

- Model yüklemedeki 10 sn sınırı yalnız `config.json` indirmesini kapsar, `model.onnx` indirmesini kapsamaz. Oyunda her sahne geçişi ayrıca 1,5 sn ile sınırlı olduğu için oyuncu beklemez; ama yavaş bir ağda model hiç yüklenmeden oyun v1 kurallarıyla sürebilir.
- v2.1'in ölçümü 17 test oturumuyla yapıldı; güven aralığı geniştir ve alt ucu 0.50'ye kadar iner (model kartı).
- Test oyuncularının çoğu senaryoyu daha önce oynamıştı ve bir kısmı eğitimdeki oyuncularla aynı kişiler. Ölçüm, senaryoyla ilk kez karşılaşan oyuncuyu tam temsil etmeyebilir.
- Arkadaş oyuncular ders arkadaşlarıdır ve bir kısmı tekrar oyundur; sonuçlar başka bir kitleye genellenmez.
