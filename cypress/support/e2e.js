const cy$ = (name) => `[data-cy="${name}"]`;

// Testler gerçek Gemini çağrısı yapmaz: varsayılan olarak sabit, kuralları çiğnemeyen
// bir tutor yanıtı döner. Tutor'u test eden senaryolar bunu kendi intercept'leriyle ezer.
beforeEach(() => {
  cy.intercept('POST', '/api/tutor', {
    statusCode: 200,
    body: { text: 'İki yolun da riskini nasıl kıyaslarsın?', model: 'stub' },
  }).as('tutor');

  // YEREL_MODEL=<klasör>: uygulamanın Hugging Face'ten istediği config.json ve model.onnx,
  // bu klasördeki dosyalarla yanıtlanır. Model yayınlanmadan önce tarayıcıdaki çıkarımı
  // denemek içindir; yayından sonra testler gerçek, commit'e sabit URL'yi kullanır.
  const yerel = Cypress.expose('YEREL_MODEL');
  if (yerel) {
    cy.readFile(`${yerel}/config.json`).then((config) => {
      cy.intercept('GET', 'https://huggingface.co/**/config.json', { body: config });
    });
    // İkili dosya fixture olarak ve kodlamasız (",null") verilmeli; body ile verilirse
    // metne çevrilir ve onnxruntime "protobuf parsing failed" der.
    // Fixture yolu cypress/fixtures'a göredir; YEREL_MODEL ise repo köküne göre.
    cy.intercept('GET', 'https://huggingface.co/**/model.onnx', {
      fixture: `../../${yerel}/model.onnx,null`,
      headers: { 'content-type': 'application/octet-stream' },
    });
  }
});

// MODEL_P=<sayı>: her cy.visit adrese ?p=<sayı> ekler (spec §10.3 test kancası).
// Regresyon koşusu MODEL_P=0 ile çalışır: model "risk yok" der, v1 kuralları geçerli kalır.
Cypress.Commands.overwrite('visit', (visit, url, options) => {
  const p = Cypress.expose('MODEL_P');
  if (p !== undefined && typeof url === 'string' && !/[?&]p=/.test(url)) {
    url += `${url.includes('?') ? '&' : '?'}p=${p}`;
  }
  return visit(url, options);
});

Cypress.Commands.add('getCy', (name, options) => cy.get(cy$(name), options));

// Giriş ekranında profili seçip oyunu başlatır.
Cypress.Commands.add('startGame', ({ level = 'beginner', role = 'backend', goal = 'architecture' } = {}) => {
  cy.getCy(`level-${level}`).click();
  cy.getCy(`role-${role}`).click();
  cy.getCy(`goal-${goal}`).click();
  cy.getCy('start').should('be.enabled').click();
  cy.getCy('choice-a').should('be.visible');
});

// Bir seçeneği seçer, açıklama panelinin açıldığını doğrular ve devam eder.
Cypress.Commands.add('choose', (letter) => {
  cy.getCy(`choice-${letter.toLowerCase()}`).click();
  cy.getCy('explain-what').should('be.visible');
  cy.getCy('continue').click();
});

Cypress.Commands.add('playPath', (path) => {
  [...path].forEach((letter) => cy.choose(letter));
  cy.getCy('ending').should('be.visible');
});
