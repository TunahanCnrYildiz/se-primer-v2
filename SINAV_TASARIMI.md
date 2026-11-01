# Sınav tasarımı: "Aynı mı?" sorusunun kâhini

Bu soru kitaptan değil, kendi yaşadığım bir olaydan çıktı: Bir ekip arkadaşımla geliştirdiğimiz RAG tabanlı tarım asistanının vektör deposunu sunucuya taşırken "onun deposu benimkiyle aynı mı?" sorusunu cevaplamak zorunda kaldık. Tanım sormuyor; öğrencinin bir ölçümün neyi kanıtlayıp neyi kanıtlamadığını gerekçelendirmesini istiyor.

## Soru (25 puan)

Mehmet bir RAG asistanı geliştirdi: Belgeler parçalara bölünüp vektörlere çevrilmiş ve bir vektör deposunda tutuluyor. Soru gelince depodan en ilgili parçalar bulunuyor, bir dil modeli cevabı bu parçalardan yazıyor. Sistemi sunucuya Ali kuruyor. Kapsayıcı ilk açılışta depoyu bir bağlantıdan indiriyor; log indirmeyi **917 MB** olarak gösteriyor, indirme bitince de `vector_store` için **1.3G** yazıyor. Ali diskteki boyuta kendisi bakıyor ve **790 MB** buluyor. Mehmet önce "indirmiş ama doğru dosyalamamış" diyor. Ertesi gün fikrini değiştiriyor: "Boyut yerine parça sayısına bakalım; **81.426** çıkmalı, temiz kurulumda bu sayı çıktı ve sağlama toplamları da tutuyor."

**(a)** Ali'nin 790 MB ölçümü deponun eksik olduğunu gösterir mi? Mehmet neden boyut yerine parça sayısını ölçüt yaptı?
**(b)** Ali'nin sunucusunda da 81.426 çıksa, iki deponun aynı olduğu kanıtlanmış olur mu? Sağlama toplamı neyi ekler?
**(c)** İki sistemin aynı davrandığını göstermek için ikisine aynı 300 soruyu soracaksınız. Neyi karşılaştırırsınız, neyi "aynı" sayarsınız? Dil modelinin yazdığı cevapları birebir karşılaştırmak neden kötü bir test olur?
**(d)** İki depo birebir aynı çıksa, sistemin doğru tarım tavsiyesi verdiği kanıtlanmış olur mu?

## Beklenen kavramlar

- **(a) Test kâhini:** Testin sonucunu söyleyen ölçütün kendisi güvenilir olmalı. Log, ölçüm yapılan yer ve dosya sistemi farklı olabileceği için boyut "aynı mı?" sorusuna kesin cevap vermez: 917 MB indirilen dosyanın, 1.3G açılmış deponun boyutudur; 790 MB ise başka bir ölçümdür. Parça sayısı, ortamdan bağımsız sayılabilen bir ölçüttür. Önce ölçüm doğrulanır, sonra sonuç çıkarılır.
- **(b) Gerekli ama yeterli değil:** Sayı aynı olup içerik farklı olabilir (ör. aynı belgeler başka bir gömme modeliyle yüklenirse sayı aynı kalır, vektörler değişir). Sağlama toplamı içeriğin de aynı olduğunu gösterir.
- **(c) Diferansiyel test ve hata toleransı:** Aynı girdiyi iki sisteme verip çıktıları karşılaştırmak, "doğru cevap"ı bilmeden "aynı mı?" sorusunu cevaplar. Karşılaştırma arama katmanında yapılmalı: Her soruda dönen parçalar aynı olmalı, benzerlik skorları küçük bir tolerans içinde kalmalı. Dil modeli aynı olsa da ürettiği cevap her seferinde birebir aynı olmaz; metin farkı depo farkının kanıtı değildir.
- **(d) Doğrulama ve geçerleme:** (a)–(c) doğrulamadır: Sunucudaki sistem, geliştirilen sistemle aynı mı? "Doğru tavsiye veriyor mu?" ise geçerlemedir ve hiçbir zaman kesin kanıtlanamaz. Çok sayıda soruyla ve cevapları değerlendirebilecek bir alan uzmanıyla yaklaşık bir doğruluk oranı ölçülür; kullanıcıya "yapay zekâ hata yapabilir" uyarısı bu yüzden gerekir.

## Çeldiriciler

- "Diskteki boyut logdakinden küçük, demek ki eksik indirilmiş." (Ölçüm doğrulanmadan sonuç çıkarmak; olayda ilk tepki buydu.)
- "Boyut aynıysa depo aynıdır." (Boyut ortama bağlıdır, kâhin olamaz.)
- "Parça sayısı aynı, o hâlde depolar kesin aynı." (Sayı içerik hakkında bir şey söylemez.)
- "Aynı soruya iki sistem farklı cevap verdi, o hâlde depolar farklı." (Üretim katmanı deterministik değildir; karşılaştırma yanlış katmanda yapılmış.)
- "Testlerin hepsi geçti, o hâlde sistem doğru tavsiye veriyor." (Doğrulama, geçerleme değildir.)

## Neden bu soru

Dört alt sorunun hiçbiri tanım ezberiyle cevaplanamaz; her biri "bu ölçüm neyi kanıtlar?" sorusunun bir başka katmanı. RAG'i hiç bilmeyen öğrenci büyük ihtimalle boyuta bakar; ezberleyen öğrenci kavramların adını sayar ama (b) ve (c)'de sayının ve metnin neyi kanıtlamadığını açıklayamaz.
