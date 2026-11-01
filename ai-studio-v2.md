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

## Prompt 3 · Modelle çıkarım ve müdahale (spec §10.2–10.6)

Amaç: Model sahneye girişte tarayıcıda (onnxruntime-web) çalışır, `p ≥ eşik` ise oyun müdahale eder. Model adresi tek bir sabitte durur. Kapıdan geçmiş bir model yayınlanana kadar sabit `YOK` kalır ve uygulama v1 kurallarıyla çalışır (KÖ-11). Desen, başlangıç reposundaki `web/index.html`'den uyarlandı; fark, adresin `main` yerine commit'e sabit olması.

```text
Add on-device model inference to this app with onnxruntime-web. Read all points
before writing code. Gameplay texts, the tutor, the server, the CSV download and all
existing data-cy attributes must stay exactly as they are. Do not change anything else.

1. Dependency: add "onnxruntime-web": "1.31.1" (exact version, no ^) to package.json.
   Import it as: import * as ort from 'onnxruntime-web';
   Before creating any session set:
     ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/';
     ort.env.wasm.numThreads = 1;

2. New file src/services/model.ts with these exact constants:
     export const MODEL_REPO = 'TunahanCnr/se-primer-v2';
     export const MODEL_COMMIT = 'YOK';
   Base URL: `https://huggingface.co/${MODEL_REPO}/resolve/${MODEL_COMMIT}/`
   - loadModel(): starts once when the app starts (call it from App on mount) and is
     cached. If MODEL_COMMIT === 'YOK' or the page URL has model=kapali, it resolves to
     null without any network request. Otherwise it fetches base + 'config.json', then
     creates ort.InferenceSession from base + 'model.onnx'. Any error or more than 10 s
     → resolves to null (console.warn only, never show an error to the player).
   - The feature ORDER and the threshold come from config.json: config.features[i].name
     and config.decision_threshold. Never hard-code them.
   - predictP(features: Record<string, number>): Promise<number | null>. Builds
     new ort.Tensor('float32', Float32Array.from(config.features.map(f => features[f.name])),
     [1, config.features.length]), runs session.run({ input: tensor }) and returns
     Number(result.probabilities.data[1]). Returns null if the model is null.
   - Test hook: if the page URL has p=<number between 0 and 1> (e.g. ?p=0.9), predictP
     returns that number instead (no model needed). Used by automated tests only.
   - Read URL parameters once at startup.

3. Measurements: the per-decision measurements (karar_suresi_sn, ipucu_acti,
   tutor_mesaj, secim, sure_doldu, aciklama_sn) and the onboarding measurements
   (oyun_no, giris_sn, giris_degisiklik) must be tracked in EVERY mode, in memory only,
   exactly as they are tracked today. The CSV download button stays data-mode only.

4. Features, computed right before each decision screen is shown (decision index i,
   sahne_no = i + 1). Use exactly these 11 names:
   - seviye: 0 beginner, 1 intermediate, 2 experienced
   - sahne_no: 1, 2, 3
   - hedef_eslesir: 1 if (goal architecture and sahne_no 1) or (goal testing and
     sahne_no 2) or (goal privacy and sahne_no 3), else 0
   - tekrar_oyun: 1 if oyun_no > 1, else 0
   - giris_sn, giris_degisiklik: the values fixed when "Başla" was pressed
   - onceki_b_sayisi: number of earlier decisions in this game with secim "B"
   - onceki_karar_suresi_sn, onceki_ipucu_acti, onceki_tutor_mesaj, onceki_aciklama_sn:
     the karar_suresi_sn, ipucu_acti, tutor_mesaj, aciklama_sn of the PREVIOUS decision
     of this game; 0 for sahne_no 1.
   All seconds rounded to one decimal exactly like in the CSV (Number(x.toFixed(1))).

5. When: for K1 inside the "Başla" handler, for K2 and K3 inside the "Devam" handler of
   the explanation sheet. Compute the features, await predictP (wait at most 1500 ms;
   if the model is still loading or the time is exceeded, use null), store
   { p, mudahale } in state, THEN show the decision screen. mudahale is true only if
   p !== null and p >= decision_threshold and data collection mode (?veri=1) is OFF.
   In data collection mode the model still runs and p is shown, but mudahale is always
   false (shadow mode).

6. Decision screen (SceneScreen gets new props modelP: number | null, mudahale: boolean):
   - Model line: directly under the top status bar, a small muted monospace line with
     data-cy="p" and attributes data-p (String(p) with full precision, or "" if null)
     and data-mudahale ("1" or "0"). Text: "MODEL · p = 0.7134" (4 decimals) or
     "MODEL · —" when p is null.
   - If mudahale is false: everything exactly as today (v1 rules).
   - If mudahale is true:
     a) the hint card starts OPEN for every level;
     b) for "Deneyimliyim" the 60 s timer is NOT shown and NOT started, so B is never
        applied automatically on this screen;
     c) directly above the hint card show a card with data-cy="model-soru": small label
        "DUR VE DÜŞÜN" (same style as the "İPUCU" label) and the text decision.hints[1]
        (the second fixed Socratic hint of this decision). Same colors and radius as the
        hint card, no new colors.

7. Model test panel: if the page URL has model-test=1, render ONLY a simple panel
   instead of the game (same background and fonts):
   - title "Model test paneli" and a muted line with MODEL_REPO and MODEL_COMMIT
   - a textarea with data-cy="model-input" where a JSON object with the 11 feature
     names is pasted
   - a button with data-cy="model-run" and text "Hesapla"
   - an output with data-cy="p", data-p (full precision String(p), or "") and text
     "p = 0.123456" (6 decimals), or "model yüklenemedi" if the model is null, or
     "geçersiz girdi" if the JSON is invalid or a feature is missing.
   In this panel the ?p= test hook is IGNORED: it always uses the real model.

Again: do not change gameplay texts, the tutor, the server, the CSV format, styles
outside the new elements, or any existing data-cy attribute. Do not change anything else.
```

**Kontrol listesi (yayındaki adreste):**
1. `?p=0.9` + "Deneyimliyim": K1'de `MODEL · p = 0.9000`, ipucu kartı açık, sayaç **yok**, üstte "DUR VE DÜŞÜN" kartı.
2. `?p=0.1` + "Deneyimliyim": `MODEL · p = 0.1000`, ipucu kapalı, 60 sn sayaç var, "DUR VE DÜŞÜN" yok.
3. Parametresiz: `MODEL · —`, oyun v1 ile aynı (model henüz yayında değil, KÖ-11).
4. `?veri=1&p=0.9`: `p = 0.9000` görünür ama müdahale **yok** (gölge mod). CSV biçimi değişmemiş.
5. `?model-test=1`: panel açılır, "Hesapla" → "model yüklenemedi" (model henüz yayında değil).
