# SE Primer v2

**Yazılım mühendisliği, oynanan bir kitap; artık oyuncusunu izleyerek uyum sağlıyor.** Bir hastanenin randevu sistemi sabah 08:00'de çöküyor ve nöbetçi mühendis sensin. Üç karar veriyorsun: mimari, test, KVKK. v1'de uyum sabit kurallara dayanıyordu (seviyene göre ipucu ve süre). v2'de buna oyuncunun oyun içindeki davranışından öğrenen küçük bir model eklendi: Bir sahneye girdiğinde model, o sahnede bedeli yüksek seçeneği (B) seçme olasılığını tahmin eder. Olasılık eşiği geçerse oyun, sen seçmeden **önce** müdahale eder: ipucu kartı açılır, süre baskısı kalkar, bir "dur ve düşün" sorusu çıkar.

| | |
|---|---|
| ▶️ **Uygulama** (telefonda aç, giriş gerekmez) | https://se-primer-v2.ai.studio |
| 🤗 **Model v2.1** (Hugging Face, commit'e sabit) | https://huggingface.co/TunahanCnr/se-primer-v2/tree/7468f86b263b779b55c05f11735eb80f08f6618f |
| 🎬 **Demo videosu** (60–90 sn) | ⏳ DOLDURULACAK |
| 📦 **Sürüm notları, dağıtım kararı, geri alma** | [RELEASE.md](RELEASE.md) |
| 🖥️ **Sunucu tüketicisi** (bonus) | https://se-primer-v2-api.onrender.com (`POST /predict`; ücretsiz plan, ilk istekte uyanması sürebilir) |

Geçen haftanın sürümü (v1) ayrı repoda ve adreste olduğu gibi duruyor: [se-primer](https://github.com/TunahanCnrYildiz/se-primer) · https://se-primer.ai.studio

## Kurulum (3 komut)

Gereksinim: Python 3.14, Node.js 20+.

```bash
pip install -r requirements.txt
npm install
npm --prefix app install
```

## Çalıştırma

| Ne | Komut | Sonuç |
|---|---|---|
| Eğit, ölç, paketle | `python train.py` | Veriyi hazırlar, eğitir, eval kapısından geçirir. Geçerse `model/` (model.onnx, config.json, model kartı). Geçmezse hata koduyla durur, `model/`'e dokunmaz |
| Yayınla | `python yayinla.py` | Yalnız kapıdan geçmiş modeli Hugging Face'e yükler, sürüm etiketini (`v2.1`) koyar, commit'i `model/yayin.json`'a yazar |
| Python oracle | `python tests/parite.py` | 5 referans girdiyi commit'e sabit modelle hesaplar, `tests/parite.json` ile karşılaştırır (`--sunucu <adres>` ile sunucuyu da) |
| Uygulama | `npm --prefix app run dev` | http://localhost:3000. Gemini anahtarı yoksa tutor sabit ipuçlarına düşer |
| E2E testler | `npm test` (uygulama açıkken) | Regresyon (v1'in 28 testi) + 8 yol gerçek modelle + KÖ-9/10/11, gölge mod + parite |
| Sunucu | `cd sunucu && uvicorn app:app` | `POST /predict` (Render'da `render.yaml` ile) |

## Uçtan uca akış

```
Veri Toplama Modu (?veri=1)          train.py                         yayinla.py
arkadaş oyunları → CSV ──► data/ham ──► hazırla → eğit → ÖLÇ ──► kapı ──► Hugging Face
                                   (bekletilen test seti, bir kez) │       (commit + v2.1 etiketi)
                                                                   ✗ → durur, model yayınlanmaz
                                                                           │ resolve/<commit>/model.onnx
                        ┌──────────────────────────────────┬───────────────┴─────────────────┐
                        ▼                                  ▼                                 ▼
          Tarayıcı · onnxruntime-web          Python oracle · onnxruntime        Sunucu · FastAPI (Render)
          (AI Studio uygulaması)              tests/parite.py                    sunucu/app.py
          müdahale: ipucu / sayaç / soru      beklenen değerler                  POST /predict
                        └────────── aynı 5 girdi, |Δ| < 1e-4 (diferansiyel test) ──────────┘
```

| Ödev adımı | Ne yapıldı | Kanıt |
|---|---|---|
| **1 · Spec** | Model gereksinimi, 11 girdi (yalnız sahneye girişte bilinenler), eval metriği ve kabul eşiği, 3 yeni kabul örneği (KÖ-9/10/11). Eşik **eğitimden önce** commit'lendi: `227eb23` (1 Kasım 2026, 12:09). Gerçek veri gelmeden önce 3 girdi eklendi, eşik aynı kaldı: `fb0675b`. v2.0 reddedildikten sonra v2.1'in tek ölçüm kuralı test verisinden önce yazıldı: `9b4f4bd` | [spec.md §10](spec.md#10-uyarlamalı-model-v2) |
| **2 · Veri** | Veri Toplama Modu (gölge mod), her karar bir satır, `kaynak` sütunu, KVKK. **48 gerçek oturum, 144 karar** (eğitim 31 oturum / 16 kişi, test 17 oturum) + 100 sentetik oturum | [data/oturumlar.csv](data/oturumlar.csv) · [data/SOZLUK.md](data/SOZLUK.md) · [data/ham/](data/ham/) |
| **3 · Eğitim + eval kapısı** | Tek komut, sabit tohum (13), sabit paket sürümleri, çıktılar bayt bayt tekrarlanabilir. Kapı gerçekten çalıştı: v2.0'ı iki kez durdurdu, v2.1 bekletilen test setinde geçti | [train.py](train.py) · [RELEASE.md](RELEASE.md#ölçümlerin-kronolojisi) |
| **4 · Artefakt** | `model.onnx` + `config.json` (özellik sırası, etiketler, metrikler, istek/yanıt JSON şeması) + model kartı | [model/](model/) |
| **5 · Yayın** | Hugging Face public repo, commit'e sabit URL, `v2.1` etiketi, reddedilen v2.0'ın kaydı, Shadow/Canary/Progressive planı, ödünleşim matrisi (ölçülmüş gecikmelerle), geri alma | [RELEASE.md](RELEASE.md) |
| **6 · Tüketim + test** | Tarayıcıda çıkarım, model kararı oyunu değiştiriyor. Python oracle, Cypress parite + regresyon, sunucu tüketicisi | [tests/](tests/) · [cypress/](cypress/) · [sunucu/](sunucu/) |
| **7 · Sınav tasarımı** | Kendi yaşadığım bir olaydan senaryo sorusu: iki geliştirici "sunucudaki vektör deposu benimkiyle aynı mı?" sorusunu cevaplamaya çalışıyor. Test kâhini, diferansiyel test, hata toleransı, doğrulama ve geçerleme; beklenen kavramlar ve çeldiriciler | [SINAV_TASARIMI.md](SINAV_TASARIMI.md) |

## Model

- **Hedef:** `secti_b`: oyuncu bu sahnede B'yi seçer mi (süre dolup B uygulanması dahil). Etiket oyunun kendisinden çıkar, elle etiketleme yok.
- **Neden bu hedef:** v1'in açık sorusu (B7) oyuncunun kararlarını sorgulamamasıydı. Desteğin en çok işe yaradığı an, oyuncu bedelli bir kararı vermek üzereyken. Gereksiz bir ipucunun bedeli, kaçırılan riskli bir kararınkinden düşük; bu yüzden kapı B-duyarlılığına da bakar.
- **Girdiler:** seviye, sahne, hedef–sahne eşleşmesi, tekrar oyun mu, giriş ekranında geçen süre ve cevap değiştirme sayısı, önceki sahnelerdeki B sayısı, karar süresi, ipucu açma, tutor isteği, açıklama ekranında kalma süresi. Bu sahnede oluşan hiçbir bilgi girdi değildir (sızıntı). Tanımlar: [data/SOZLUK.md](data/SOZLUK.md).
- **Model:** `StandardScaler → LogisticRegression(class_weight="balanced")`, `sklearn → ONNX` (opset 17, girdi `input`, çıktı `probabilities`).
- **Kapı:** ROC-AUC ≥ 0.65 ve B-duyarlılığı ≥ 0.60, ONNX ile sklearn farkı ≤ 1e-4.
- **v2.0 · reddedildi (spec §10.4):** Gerçek + sentetik veriyle eğitim, gerçek oturumlarda 5 katlı gruplanmış çapraz doğrulama. 1. ölçüm (17 oturum) ROC-AUC 0.618; önceden yazılan tek ve son 2. ölçüm (31 oturum) ROC-AUC 0.643, B-duyarlılığı 0.579 → geçemedi, yayınlanmadı.
- **v2.1 · yayında (spec §10.8):** 31 gerçek oturumla eğitim (sentetik yok), eğitimden sonra toplanan 17 oturumda bir kez ölçüm: **ROC-AUC 0.715** (%95 GA 0.50–0.85), **B-duyarlılığı 0.818**, B-kesinliği 0.375 → geçti. Sınırlar (küçük örneklem, test oyuncularının senaryoyu önceden bilmesi): [model/README.md](model/README.md).

## Veri

**Gerçek veri:** Oyunun `?veri=1` adresiyle açılan Veri Toplama Modu, her kararı bir satır olarak kaydeder ve son ekranda oyuncunun kendisinin indirip gönderdiği bir CSV üretir. Sunucuya hiçbir şey yazılmaz. Ad, e-posta, cihaz kimliği, IP ve konum toplanmaz; oturum kimliği her oyunda tarayıcıda rastgele üretilir; tutor mesajlarının metni değil yalnız sayısı tutulur. Arkadaşlardan gelen dosyalar `data/ham/` klasöründe.

**Sentetik veri:** Boru hattını gerçek veri gelmeden kurmak için; v2.0'da eğitime de girdi. **Hiçbir ölçüme girmedi.** v2.0'ın ilk ölçümünde, tekrar oyunlarda oyuncuların neredeyse hep A seçtiği görüldü; üretici bunun tersini varsayıyordu. Bu yüzden v2.1'in eğitiminde sentetik veri yok. Üretici `data/hazirla.py` → `sentetik_veri()`, **tohum 13**, **100 oturum**:

- Her oyuncunun gizli bir risk eğilimi vardır: `r ~ N(0, 1)`. Seviye, rol ve hedef eşit olasılıkla seçilir.
- Oyunların %35'i tekrar oyundur (`oyun_no = 2 + Poisson(0.3)`), kalanı ilk oyun.
- Giriş süresi: tekrar oyunda `lognormal(ln 4, 0.5)`, ilk oyunda `lognormal(ln 20 − 0.3·r, 0.5)` sn. Cevap değiştirme: tekrar oyunda `Poisson(0.4)`, ilk oyunda `Poisson(e^(−0.8 − 0.4·r))`.
- Her sahnede: ipucu açık = "Yeni başladım"da 1, diğerlerinde `Bernoulli(σ(−0.2 − 0.8·r))`. Tutor isteği `Poisson(e^(−1 − 0.5·r))`. Karar süresi `lognormal(ln 25 − 0.35·r − 0.15·seviye, 0.4)` sn. Açıklama süresi `lognormal(ln 12 − 0.4·r, 0.5)` sn.
- B olasılığı: `σ(−1.1 + 0.9·r + s − 0.6·[hedef bu sahne] − 0.5·[ipucu açık] + 0.3·önceki_B + 0.8·[tekrar oyun])`, sahne etkisi `s` = K1 0.2, K2 0.4, K3 −0.4.
- "Deneyimliyim"de karar süresi ≥ 60 sn ise süre dolar ve B uygulanır.

Katsayılar gerçek oyuncudan tahmin edilmedi, makul görülen yönler seçildi. Bu yüzden sentetik veride ölçülen bir sayı (ör. geliştirme denemesinde AUC 0.62) modelin gerçek başarısı hakkında hiçbir şey söylemez; yalnız boru hattının çalıştığını gösterir.

## Testler

| Test | Ne kanıtlar | Sonuç |
|---|---|---|
| ONNX ↔ sklearn (`train.py`) | Dağıtılan dosya eğitilen modelle aynı sayıyı verir | ✅ en büyük fark 8.1e-8 |
| Parite: tarayıcı ↔ Python (`cypress/e2e/parite.cy.js`) | İki bağımsız çalışma zamanı aynı model ve girdiyle aynı olasılığı verir (diferansiyel test, kâhin = Python) | ✅ 5/5, en büyük \|Δ\| 2.7e-8 ([kanıt](tests/parite-tarayici.json)) |
| Parite: sunucu ↔ Python (`tests/parite.py --sunucu`) | Bonus tüketici (Render) aynı sayıyı verir | ✅ 5/5, en büyük \|Δ\| 8.7e-8 ([kanıt](tests/parite-sunucu.txt)) |
| Regresyon (v1'in 28 testi, `MODEL_P=0`) | Model "risk yok" dediğinde v1 kuralları aynen geçerli | ✅ 28/28 |
| 8 yol, gerçek modelle | Müdahale olsa da karar mantığı, saatler ve sonlar değişmez | ✅ 8/8 |
| KÖ-9/10/11 + gölge mod (`cypress/e2e/model.cy.js`) | Müdahale davranışı, model yokken v1'e dönüş, veri modunda müdahale olmaması | ✅ 4/4 |

`npm test`: **41/41**, v2.1 modeli Hugging Face'ten commit'e sabit adresle indirilerek (2 Kasım 2026).

KÖ-9/10'da olasılık `?p=` test kancasıyla sabitlenir: Bu testler modelin *davranışını* sınar, *sayısal doğruluğunu* parite testi sınar.

## Repo yapısı

```
├── spec.md                 spesifikasyon (v2: §10 uyarlamalı model)
├── data/
│   ├── oturumlar.csv       eğitim verisi, her karar bir satır (gerçek + sentetik, kaynak sütunu)
│   ├── SOZLUK.md           veri sözlüğü
│   ├── hazirla.py          ham dosyaları doğrular, sentetik üretir, girdileri türetir
│   ├── ham/                Veri Toplama Modu'ndan gelen CSV'ler (48 oturum)
│   ├── v21_egitim_oturumlari.txt   v2.1'in dondurulmuş eğitim seti (31 oturum)
│   └── v21_olcum.json      v2.1'in tek ölçümünün kilidi (test oturumları + metrikler)
├── train.py                eğit → ölç → kapı → paketle
├── model/                  model.onnx, config.json, README.md (model kartı), yayin.json (commit)
├── yayinla.py              Hugging Face'e yükleme ve doğrulama
├── RELEASE.md              sürüm notları, dağıtım kararı, Shadow/Canary, geri alma
├── tests/                  parite.py (Python oracle), parite.json (5 referans girdi)
├── cypress/                E2E testler (regresyon, parite, KÖ-9/10/11)
├── sunucu/                 FastAPI tüketicisi + render.yaml (kökte)
├── app/                    AI Studio uygulaması (React + Vite + Express + onnxruntime-web)
├── ai-studio-v2.md         AI Studio'ya gönderilen v2 prompt'ları ve kontrol listeleri
├── SINAV_TASARIMI.md       vize sorusu tasarımı
├── KARARLAR.md             karar kaydı (v2: K-24 … K-35)
└── (v1'den) DESIGN.md, content/, design/, eval/, ai-studio-rehber.md
```

`app/` AI Studio'dan indirildi ve elle değiştirilmedi; her değişiklik [ai-studio-v2.md](ai-studio-v2.md)'deki bir prompt'la yapıldı ve kontrol listesiyle doğrulandı.

## Kaynaklar

1. @seyyah (2026). *huggingface-hello-web*: tabular model → ONNX → Hugging Face Hub → web, mobil, Rails. https://github.com/seyyah/huggingface-hello-web. **Uyarlananlar:** `train.py`'deki `onnx_aktar` (girdi/çıktı adları, zipmap kapalı, 1e-4 kontrolü) ve model kartı iskeleti `hf_cli.py train`'den; `yayinla.py` `hf_cli.py push-model`'den; tarayıcıdaki çıkarım deseni `web/index.html`'den; sunucu tüketicisi fikri `rails-api/`'den.
2. @seyyah (2026, 30 Ekim). *Modelden Ürüne: model geliştirme, dağıtım ve çıkarım* ve *Yazılım Testi Tartışması* (ders sunumları).
3. Amershi, S., Begel, A., Bird, C., DeLine, R., Gall, H., Kamar, E., Nagappan, N., Nushi, B., Zimmermann, T. (2019). Software Engineering for Machine Learning: A Case Study. *ICSE-SEIP*.
4. Shankar, S., Garcia, R., Hellerstein, J. M., Parameswaran, A. G. (2024). Operationalizing Machine Learning: An Interview Study. *Proc. ACM Hum.-Comput. Interact.* (CSCW). (Ön baskı: arXiv, 2022.) Velocity, Validation, Versioning.
5. Mitchell, M. vd. (2019). Model Cards for Model Reporting. *ACM FAT\**.
6. Breck, E., Cai, S., Nielsen, E., Salib, M., Sculley, D. (2017). The ML Test Score: A Rubric for ML Production Readiness and Technical Debt Reduction. *IEEE Big Data*.
7. Sommerville, I. (2016). *Software Engineering* (10. baskı). Bl. 8 Yazılım testi, Bl. 17 Dağıtık yazılım mühendisliği, Bl. 18 Hizmet odaklı yazılım mühendisliği, Bl. 25 Konfigürasyon yönetimi. Pearson.
8. Stanford HAI (2025). *AI Index Report 2025*. Çıkarım maliyetindeki düşüş.
9. Gartner (2025). Kuruluşların 2027'ye kadar göreve özel küçük modelleri genel amaçlı LLM'lerden üç kat fazla kullanacağı öngörüsü (basın bülteni).
10. Hugging Face. Hub belgeleri: model repoları, `revision`, `resolve` URL'leri. https://huggingface.co/docs/hub
11. ONNX Runtime (onnxruntime-web) ve skl2onnx belgeleri. https://onnxruntime.ai · https://onnx.ai/sklearn-onnx
12. Cypress belgeleri: E2E testler, `cy.intercept`, `data-cy` seçicileri. https://docs.cypress.io
13. 6698 sayılı Kişisel Verilerin Korunması Kanunu (2016). https://www.kvkk.gov.tr
14. Stephenson, N. (1995). *The Diamond Age: Or, A Young Lady's Illustrated Primer*. Bantam Spectra.

## Kodlama ajanı ve araç beyanı

Projeyi ben yönettim: hedefi, kabul kapısını ve kapsamı ben belirledim, araçların çıktısını kendim denedim ya da testlerle doğrulattım. Kodu ve belge taslaklarını araçlar yazdı. Kararların gerekçeleri ve vazgeçilen seçenekler [KARARLAR.md](KARARLAR.md#v2--uyarlamalı-model) (K-24 … K-35).

1. **Kararlar (ben):** Modelin hedefi (bedelli seçim riski), repo ve uygulama stratejisi, bonusun hedeflenmesi benim kararım. Kabul eşiğini (ROC-AUC ≥ 0.65, B-duyarlılığı ≥ 0.60, `class_weight="balanced"`) Claude Code önerdi; gerekçesini (küçük örneklemde AUC'nin standart hatası) sorgulayarak onayladım ve eşik eğitimden önce commit'lendi. Gerçek veri toplanmadan önce model girdilerinin genişletilmesine (spec 2.1) ben izin verdim. v2.0 ilk ölçümde geçemeyince "tek ve son ikinci ölçüm" kuralını, o da geçemeyince bekletilen test setiyle v2.1'i, ilgili ölçümlerden önce onayladım.
2. **Claude Code (Anthropic) · eğitim, test ve yayın:** Spec §10 taslağı, veri hazırlama ve sentetik üretici, `train.py`, `yayinla.py`, `tests/parite.py`, Cypress testleri, FastAPI sunucusu, README ve RELEASE taslakları bu araçla yazıldı. AI Studio'ya verdiğim prompt'ları da o hazırladı ve AI Studio'dan indirdiğim kodu spec'e göre inceledi. `SINAV_TASARIMI.md`'deki senaryo kendi yaşadığım bir olay; ölçümleri ve kavramlara verdiğim cevapları ben kurdum, Claude Code ile tartışarak netleştirdim ve yazıya döktürdüm.
3. **Google AI Studio (Gemini) · uygulama:** `app/` yalnız üç prompt'la değiştirildi: Veri Toplama Modu, giriş ekranı ölçümleri, onnxruntime-web ile çıkarım ve müdahale ([ai-studio-v2.md](ai-studio-v2.md)). Her prompt'tan sonra kontrol listesini yayındaki adreste kendim denedim (indirdiğim CSV'ler, ekran görüntüleri). Uygulama kodunu elle değiştirmedim.
4. **Düzelttirdiklerim:** "Ödevin yönergelerine uyuyor muyuz?" diye sorguladığımda ajanın çıktısında iki uyumsuzluk çıktı: Cypress testleri ödevin istediği kökteki `cypress/` yerine `e2e/cypress/` altındaydı ve `train.py` tek komutla çalışmıyordu; ikisini düzelttirdim. Başlangıç reposunun rolünü sorgulamam, oradan uyarlanan kodun kaynağının README'ye yazılmasını sağladı. Ajanın verdiği Hugging Face giriş komutu PowerShell'de çalışmadı; hatayı fark edip bildirdim.
5. **Kendim yaptıklarım ve doğrulama:** Gerçek veriyi arkadaşlarımın oyunlarıyla ben topladım; Hugging Face hesabını ve token girişini kendim yaptım. Ajanın kendi hataları (Cypress 16'da kaldırılan API, tarayıcıya bozuk giden model dosyası, işletim sistemine göre değişen SHA-256) yazdığı testler ve ölçümlerle yakalandı ve düzeltildi.
