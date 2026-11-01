# AI Studio rehberi · v2

v1 rehberi: [ai-studio-rehber.md](ai-studio-rehber.md). v2'de uygulama, v1 projesinin AI Studio'da **Remix** ile alınmış kopyasıdır (`SE Primer v2`). v1'in yayındaki adresi (`se-primer.ai.studio`) değişmez.

> Prompt'lar AI Studio'ya gönderildikleri hâliyle korunur. Her prompt'tan sonra kod indirilip `app/` içine açılır (`.env` ve `node_modules` silinmez).

## Prompt 1 · Veri Toplama Modu

Amaç: Arkadaş oturumlarından, her karar bir satır olacak şekilde ham ölçüm toplamak (spec §10.5). Oynanış v1 ile aynı kalır. Model henüz yok.

```text
Add a "data collection mode" to this app. Gameplay, texts, timings and all existing
data-cy attributes must stay exactly as they are. Do not change anything else.

1. Activation: data collection mode is ON only when the page URL has the query
   parameter veri=1 (e.g. https://.../?veri=1). Read it once at startup. Without it,
   the app behaves exactly as today and nothing below is visible.

2. Onboarding notice (only in data mode): above the "Başla" button show a small
   muted note with data-cy="veri-notu" and this exact text:
   "Veri Toplama Modu: Ad, e-posta, cihaz ve konum bilgisi toplanmaz. Kararların
   yalnızca sen indirip gönderirsen paylaşılır."

3. Session id: every time a game starts (Başla, including after "Yeniden oyna"),
   generate a new random id: crypto.randomUUID().slice(0, 8). Do not store it in
   localStorage, cookies or on the server.

4. Measurements, one record per decision (k1, k2, k3), kept only in React state:
   - karar_suresi_sn: seconds from the moment the decision screen is shown until
     option A or B is selected (or the 60 s timer runs out). One decimal.
   - ipucu_acti: 1 if the hint card was open at any moment on this decision screen
     (including when it is open by default for "Yeni başladım"), else 0.
   - tutor_mesaj: number of tutor requests sent while on this decision screen
     (both "İpucu iste" and typed messages). Count requests, never store message text.
   - secim: "A" or "B".
   - sure_doldu: 1 if B was applied because the 60 s timer ran out, else 0.
   - aciklama_sn: seconds from the moment the explanation sheet opens for this
     decision until "Devam" is pressed. One decimal.
   Use performance.now() for all timing.

5. Ending screen (only in data mode): below the "Yeniden oyna" button add a
   secondary button with data-cy="veri-indir" and the text "Verimi indir (CSV)".
   Clicking it downloads a UTF-8 CSV file named primer-<session id>.csv, generated
   in the browser (Blob + temporary <a download>), no server call. Exactly 3 data rows,
   in the order k1, k2, k3, with this exact header:

   surum,oturum,sahne_no,seviye,rol,hedef,karar_suresi_sn,ipucu_acti,tutor_mesaj,secim,sure_doldu,aciklama_sn,kaynak

   - surum: the constant "2.0-veri"
   - sahne_no: 1, 2, 3
   - seviye: 0 = beginner, 1 = intermediate, 2 = experienced
   - rol: backend | devops | qa
   - hedef: architecture | testing | privacy
   - kaynak: the constant "gercek"
   Use "." as decimal separator and "," as field separator.

6. Under the download button show a muted line with data-cy="veri-tesekkur":
   "Dosyayı oyunu sana gönderen kişiye ilet. Teşekkürler!"

Again: do not change gameplay, texts, styles, the tutor, the server, or any existing
data-cy attribute. Do not change anything else.
```

**Kontrol listesi (önizlemede):**
1. `?veri=1` olmadan: giriş ekranında not yok, son ekranda indirme düğmesi yok.
2. `?veri=1` ile bir yol oyna. İndirilen CSV'de başlık + 3 satır olmalı. `kaynak` = `gercek`.
3. "Deneyimliyim" ile K3'te süreyi doldur: K3 satırında `secim=B`, `sure_doldu=1`, `karar_suresi_sn` ≈ 60.
4. "Yeniden oyna" → yeni oyun yeni `oturum` kimliği almalı.

## Prompt 2 · Giriş ekranı ölçümleri (spec 2.1)

Amaç: K1'den önce bilinen üç sinyali de kaydetmek (spec §10.2, girdi 4–6). Gerçek veri toplanmadan önce gönderildi.

```text
Extend the data collection mode (?veri=1) with three onboarding measurements.
Gameplay, texts, timings, styles and all existing data-cy attributes must stay exactly
as they are. Outside data collection mode nothing changes. Do not change anything else.

1. oyun_no: an in-memory counter of games started in this browser tab. The first
   "Başla" after the page loads is 1; every later "Başla" (after "Yeniden oyna")
   adds 1. Keep it only in React state (no localStorage, no cookies, no server).

2. giris_sn: seconds from the moment the onboarding screen is shown (on page load,
   and again each time "Yeniden oyna" returns to it) until "Başla" is pressed.
   Use performance.now(). One decimal.

3. giris_degisiklik: on the current onboarding screen, count how many times the
   player changes an answer that already had a value to a DIFFERENT option
   (level, role or goal). Selecting the first answer of a question does not count.
   Tapping the already-selected option does not count. After "Yeniden oyna" the
   previous answers are pre-selected, so changing one of them counts. Reset to 0
   each time the onboarding screen is shown.

4. The values are fixed when "Başla" is pressed and written on all 3 rows of that
   game's CSV. Change the CSV header to exactly:

   surum,oturum,sahne_no,seviye,rol,hedef,karar_suresi_sn,ipucu_acti,tutor_mesaj,secim,sure_doldu,aciklama_sn,oyun_no,giris_sn,giris_degisiklik,kaynak

   and change the constant surum value from "2.0-veri" to "2.1-veri". giris_sn uses
   one decimal with "." as decimal separator. Keep every other column exactly as now.

Again: do not change gameplay, texts, styles, the tutor, the server, or any existing
data-cy attribute. Do not change anything else.
```

**Kontrol listesi (yayındaki adreste, `?veri=1` ile):**
1. Sayfayı yenile, girişte seviyeyi "Yeni başladım" → "Deneyimliyim" yap, sonra rol ve hedefi seç, Başla. Oyunu bitir, CSV indir: `oyun_no=1`, `giris_degisiklik=1`, `surum=2.1-veri`, `giris_sn` saniyeyle uyumlu.
2. "Yeniden oyna" → hiçbir şeyi değiştirmeden Başla. CSV: `oyun_no=2`, `giris_degisiklik=0`, `giris_sn` küçük (birkaç saniye).
3. Başlık satırı birebir yukarıdaki gibi; her dosyada 3 satır, giriş sütunları üç satırda aynı.
