# Karar kaydı

Bu projede verilen önemli kararlar, gerekçeleri ve vazgeçilen seçenekler. Kod AI Studio'da üretildiği için "neden böyle?" sorusunun cevabı koddan çıkmaz, buradadır.

Her kayıt: **Karar** · **Bağlam** · **Gerekçe** · **Vazgeçilen** · **Nerede**. Tarihlerin hepsi 26 Ekim 2026.

## Ürün ve senaryo

### K-01 · Senaryo: nöbetçi mühendis, çöken randevu sistemi
- **Karar:** Ders örneğindeki senaryo kullanıldı. Üç karar üç farklı mühendislik alanını temsil eder: mimari (geri dönüş / canlıda yama), test (kısa test / hemen yayın), KVKK (maskele / olduğu gibi gönder).
- **Gerekçe:** Herkesin tanıdığı bir kriz. Üç karar, ödevin istediği "mimari, test, KVKK" sonuçlarını doğal olarak taşıyor.
- **Nerede:** [spec.md §4](spec.md#4-senaryo-ve-karar-mantığı)

### K-02 · Son yalnızca KVKK kararına bağlı, ilk iki karar süreyi belirler
- **Karar:** 8 yol 2 sona bağlanır: K3 = B ise Son B. K1 ve K2 bitiş saatini değiştirir (08:25 – 09:00).
- **Gerekçe:** Mesaj: Sistemi hızla ayağa kaldırmak, veri ihlalini telafi etmez. Bunu KÖ-4 sınar.
- **Vazgeçilen:** Puanlama ile sonu belirlemek. Daha karmaşık ve "neden bu sonu aldım?" sorusunu bulanıklaştırıyordu.

### K-03 · Süre dolarsa B uygulanır
- **Karar:** "Deneyimliyim" seviyesinde 60 sn içinde seçim yapılmazsa B seçeneği uygulanır, açıklamada "Süre doldu" şeridi çıkar.
- **Gerekçe:** Kriz anında karar vermemek de bir karardır. Ödev bu durumu tanımlamıyordu, açık bir kural gerekiyordu.
- **Vazgeçilen:** Sayacı durdurmak ya da rastgele seçmek.

### K-04 · Rol yalnızca anlatıyı değiştirir
- **Karar:** Backend / DevOps / QA rolü sahne metninin bakış açısını değiştirir. Kararlar ve sonuçlar aynı kalır.
- **Gerekçe:** Kapsamı küçük tutmak. 3 rol × 8 yol için ayrı sonuçlar yazmak bir haftaya sığmazdı.

### K-05 · "Yeniden oyna" profili seçili getirir
- **Karar:** Sorular yeniden sorulur ama önceki cevaplar seçili gelir. Cevaplar yalnızca sekmenin belleğinde tutulur.
- **Gerekçe:** Oyuncu farklı bir seviyeyle kişiselleştirmeyi görebilir, aynı profille tekrar oynamak da tek dokunuş. Bellek dışında saklama olmadığı için "hesap / ilerleme kaydı yok" kuralı korunur.
- **Vazgeçilen:** Soruları atlamak (kişiselleştirme görünmez olurdu), `localStorage` (kapsam dışı ilerleme kaydına dönüşürdü).

## Tasarım

### K-06 · İçerik tek kaynakta: `content/scenario.json`
- **Karar:** Ekrandaki bütün metinler, süreler ve ipuçları tek bir JSON dosyasında yazıldı ve AI Studio'ya bu dosya verildi.
- **Gerekçe:** Gemini metni kendisi üretseydi her üretimde farklı çıkardı. Uygulama, Cypress testleri ve tutor değerlendirmesi aynı içeriğe dayanmalı. Teknik içerik (expand/contract göçleri, duman testi, KVKK m.12) de kontrollü yazılmalı.

### K-07 · Stitch çıktısı ile tasarım kuralları birleştirildi
- **Karar:** Stitch'in ekranları esas alındı. Stitch'in kendi tasarım belgesindeki çelişkiler tek kurala bağlandı: kırmızı yok, panel arkası hafif bulanık, dış bağlantı yok, İngilizce süs metinleri yok.
- **Gerekçe:** Stitch'in token listesi Material varsayılanlarından gelen bir kırmızı (`#ba1a1a`) içeriyordu, yazılı açıklaması "gölge yok" derken kodu gölge kullanıyordu.
- **Nerede:** [DESIGN.md](DESIGN.md), ham çıktı: `design/stitch/`

### K-08 · Sayıya ek getirilmez: "3 sorudan 2 tanesi"
- **Karar:** İlerleme metni `3 sorudan {n} tanesi cevaplandı`.
- **Gerekçe:** İlk sürümdeki `{n}'i` kalıbı "3'i", "0'i" gibi yanlış Türkçe ekler üretiyordu (yayında fark edildi).

## Tutor

### K-09 · Tutor LLM, arkasında sabit ipucu yedeği
- **Karar:** Tutor yanıtları Gemini'den gelir. Hata, 8 sn'yi aşan yanıt ya da kota dolması durumunda sıradaki sabit ipucu gösterilir.
- **Gerekçe:** Değerlendirmenin ölçeceği gerçek bir davranış olmalı: sabit ipuçlarıyla "ele verme oranı" anlamsız olurdu. Ama oyun LLM'e bağlı kalıp takılmamalı.
- **Vazgeçilen:** Yalnızca sabit ipuçları (değerlendirme yapılamaz), yalnızca LLM (hata anında oyun bozulur).

### K-10 · Hızlı model, yeniden deneme ve yedek model
- **Karar:** Birincil model `gemini-3.1-flash-lite` (en düşük düşünme seviyesi, en fazla 300 token). 503/429 gelirse bir kez yeniden dene, olmazsa `gemini-3.8-flash`'a geç.
- **Bağlam:** İlk sürümde tutor neredeyse hiç LLM yanıtı veremiyordu: model yoğunluk nedeniyle 503 dönüyor, diğer istekler 8 sn'de kesiliyordu.
- **Gerekçe:** Tutor 3 cümle yazıyor, uzun düşünmesine gerek yok. Sonrasında yanıtlar 1–5 sn'ye indi.

### K-11 · Sistem talimatını sunucu kurar
- **Karar:** Tarayıcı yalnızca `decisionId`, `level`, `role`, `k1Choice` ve oyuncunun mesajını gönderir. Sistem talimatını sunucu `scenario.json`'dan kurar. Girdiler doğrulanır, mesaj 500 karakterle sınırlıdır.
- **Bağlam:** İlk sürümde tarayıcı talimatın tamamını gönderiyor, sunucu onu kontrol etmeden Gemini'ye iletiyordu. Yayındaki uygulama, isteyen herkesin kendi talimatıyla ve proje anahtarıyla Gemini kullanabileceği açık bir aracıydı.
- **Doğrulama:** Yayında kendi talimatıyla gönderilen istek yok sayıldı, 501 karakterlik mesaj ve geçersiz karar `400` aldı.
- **Nerede:** [spec.md §8.1](spec.md#81-post-apitutor)

### K-12 · Hız sınırı: gerçek IP + genel üst sınır
- **Karar:** IP başına 10 dk'da 20 istek, ayrıca saatte toplam 200 Gemini çağrısı. IP, `X-Forwarded-For` başlığının **son** değerinden okunur.
- **Bağlam:** İlk sürüm başlığın **ilk** değerini kullanıyordu. Bu değeri istemci kendisi yazabildiği için, her istekte farklı sahte IP gönderilerek sınır atlatılabiliyordu (yayında denenerek doğrulandı).
- **Gerekçe:** Son değeri Google'ın ön sunucusu ekliyor. Genel üst sınır da IP okuma yöntemi yanlış çıksa bile toplam harcamayı sınırlar.

### K-13 · Sunucu süre bütçesi gerçekten uygulanır
- **Karar:** Her Gemini çağrısı, sunucunun 7 sn'lik bütçesinden kalan süre dolunca `AbortController` ile iptal edilir.
- **Bağlam:** Değerlendirmede iki yanıt 8 sn'yi aştı. Bütçe yalnızca yeni deneme başlatmadan önce kontrol ediliyordu, süren çağrı kesilmiyordu.

### K-14 · Anahtar kelime filtresi yerinde kaldı, ama yeterli sayılmadı
- **Karar:** "A'yı seç" gibi açık kalıpları yakalayan filtre uygulamada kaldı.
- **Gerekçe:** Değerlendirmede 9 sızıntının hiçbirini yakalamadı, çünkü sızıntılar örtüktü. Açık ihlallere karşı ucuz bir emniyet kemeri olarak duruyor. Asıl iyileştirme sistem talimatında ve LLM tabanlı bir kontrolde (bkz. [eval/RAPOR.md](eval/RAPOR.md)).

## Değerlendirme

### K-15 · Etiketleme kılavuzu katı tarafta
- **Karar:** Yalnızca bir seçeneğin olumsuz yanını soran yanıt, soru biçiminde olsa bile "ele verdi" (H2) sayılır.
- **Gerekçe:** Ödevin sorusu "öğrenci hangi seçeneğin doğru olduğunu anlar mı?". Tek taraflı bir soru da bunu gösterir.
- **Sonuç:** Tur 1'de ele verme oranı %45 çıktı. Daha gevşek bir kılavuzla (yalnızca H1 ve H3) bu oran 2/20 olurdu. Bu ayrım raporda tartışılıyor. Tur 2 aynı katı kılavuzla etiketlendi.

### K-16 · Etiketleme elle, tek kişi
- **Karar:** 20 yanıtı tek kişi, kılavuza göre elle etiketledi.
- **Gerekçe:** Ödev açıkça elle etiketleme istiyor. Etiketleyiciler arası uyum ölçülmedi, bu raporun "Sınırlar" bölümünde belirtildi.

### K-23 · Tutor talimatı v2 ve ikinci değerlendirme turu
- **Karar:** Tur 1'in sızıntı türlerine göre tutor talimatı yeniden yazıldı ([eval/prompts/tutor-v2.txt](eval/prompts/tutor-v2.txt)). Aynı 20 mesajla ikinci tur yapılıp yeniden elle etiketlendi.
- **Gerekçe:** Değerlendirmenin amacı yalnızca bir oran vermek değil, iyileştirmeyi yönlendirmek: ölç → nedenini bul → düzelt → yeniden ölç.
- **Sonuç:** Ele verme oranı 9/20'den 1/20'ye düştü, geriye giden mesaj olmadı.
- **Bedeli:** Yanıtlar daha genel ve soyut hâle geldi ("hangi verilerle…", "nasıl dengelersin…"), ortalama süre 2,7 sn'den 3,3 sn'ye çıktı. "Yardımcı oldu mu?" ölçülmedi, sonraki adım olarak raporda.
- **Bilinen sınır:** Talimat aynı 20 mesaja bakılarak yazıldı ve aynı mesajlarla ölçüldü, bu yüzden tur 2'nin oranı olduğundan iyi görünebilir.
- **Vazgeçilen:** Tur 2'nin ödünleşimini (soyutluk) bu sürümde düzeltmek. Yeni bir talimat, yeni bir değerlendirme turu ve "yardımcı oldu mu?" ölçütü gerektirir.
- **Süreç notu:** AI Studio'nun günlük kullanım hakkı dolduğu için talimat önce yerel kopyaya (`app/src/data/scenario.ts`, `app/scenario.json`) elle, `content/scenario.json`'daki metinle birebir aynı olarak yazıldı. Tur 2 bu yerel sunucuda çalıştırıldı. Ertesi gün (27 Ekim) yayındaki uygulama AI Studio'da aynı metinle güncellendi. İndirilen kodun talimatı `eval/prompts/tutor-v2.txt` ile birebir karşılaştırılarak doğrulandı.
- **Yayında ölçülen:** 8 isteğin 6'sı LLM yanıtı aldı (1,7–6,6 sn), 2'si 7 sn bütçesine takılıp sabit ipucuna düştü.
- **Koşu notu:** İlk tam koşuda 20 isteğin 6'sı sunucunun 7 sn'lik bütçesine takıldı (K-13'teki kesme). Etiketleme için bu mesajlar yeniden gönderildi. #7 ve #18 yanlışlıkla iki kez yeniden gönderildi, tabloda son yanıtları duruyor. Bütün ham yanıtlar `eval/results/` altında.

## Test

### K-17 · Cypress testleri `e2e/` klasöründe, uygulamadan ayrı
- **Karar:** Testler `app/` içine değil, kendi `package.json`'ı olan `e2e/` klasörüne yazıldı.
- **Gerekçe:** `app/` AI Studio'dan her indirildiğinde baştan değiştiriliyor. Testler orada olsaydı her güncellemede kaybolurdu.
- **v2 (1 Kasım 2026):** Testler `e2e/cypress/`'ten repo kökündeki `cypress/`'e taşındı (`package.json` ve `cypress.config.js` de köke). Gerekçe: Ödevin istediği repo yapısında `cypress/` kökte. `app/`'ten ayrı olma gerekçesi aynen geçerli.

### K-18 · Testlerde LLM yerine sahte yanıt, demoda gerçek yanıt
- **Karar:** Testler `/api/tutor`'u `cy.intercept` ile sahte bir yanıta bağlar. Demo videosu ise gerçek Gemini yanıtını gösterir.
- **Gerekçe:** Testler her koşuda aynı sonucu vermeli ve kota harcamamalı. Demo ise ürünün gerçek hâlini göstermeli.

### K-19 · Test hatayı yakaladı, test değil uygulama düzeltildi
- **Karar:** KÖ-2 testi sayacın başlangıçta "0:60" gösterdiğini yakaladı. Test gevşetilmedi, uygulama `m:ss` biçimine düzeltildi.

### K-20 · Demo videosu: Chrome, 1080p, en fazla 60 sn
- **Karar:** Demo ayrı bir Cypress ayarıyla (`cypress.demo.config.js`) Chrome'da, 1920×1080 pencerede ve düşük sıkıştırmayla kaydedilir. Beklemelerin toplamı ~40 sn tutuldu.
- **Gerekçe:** Varsayılan kayıtta telefon ekranı küçük ve yazılar bulanıktı. Tutor'un gerçek yanıtı 2–10 sn sürebildiği için video en kötü durumda da 60 sn'yi aşmamalı.

## Arkadaş testi

### K-22 · Görünmez varsayım düzeltildi, "neden" sorunu bilerek açık bırakıldı
- **Bağlam:** Uygulamayı ilk kez gören biri telefonda oynadı: A → A → A, Son A, ~3 dk, takılmadan. Karar 3'te "ekip loga bakacak, her şey olduğu gibi gitmeli" diye duraksadı. Sonda hiçbir kararın nedenini açıklayamadı.
- **Karar 1 (KÖ-8):** "Hasta adını maskele" seçeneğinin altında artık maskelenmiş log satırının tamamı görünüyor: `ERROR appt_id=4821 patient="A***" slot=09:30`. Oyuncu, hata ayıklama için gereken kayıt numarası ve saatin korunduğunu karar vermeden görür.
- **Gerekçe:** Duraksamanın sebebi bir bilgi eksiğiydi, cevap değil: maskelemenin neyi koruduğu ekranda yoktu. Satırın tamamını göstermek bir seçeneği "doğru" ilan etmiyor, yalnızca bir mühendisin zaten göreceği bilgiyi gösteriyor.
- **Karar 2 (B7):** Oyuncunun "neden"i açıklayamaması yeni bir başarı ölçütü (B7) olarak spec'e eklendi ve karşılanmadığı açıkça yazıldı. Çözümü (son ekranda yansıtma sorusu ya da "diğer yolu dene") bu sürüme alınmadı.
- **Vazgeçilen:** B7'yi bu sürümde çözmek. Yeni bir etkileşim, yeni bir LLM çağrısı ve yeni bir değerlendirme gerektirir. n = 1 bir gösterge, daha çok oyuncuyla ölçülmeden tasarım değiştirmek erken olur.

## Altyapı

### K-21 · `esbuild` sürümü `^0.27`
- **Karar:** `app/package.json`'da `esbuild` `^0.25`'ten `^0.27`'ye çekildi (AI Studio'da da).
- **Gerekçe:** Eski aralık Vite 8 ile çakışıyor ve AI Studio dışında `npm install`'ı durduruyordu. `--force` ile geçiştirmek yerine sürüm düzeltildi.
