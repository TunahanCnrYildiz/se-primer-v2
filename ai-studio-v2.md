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
