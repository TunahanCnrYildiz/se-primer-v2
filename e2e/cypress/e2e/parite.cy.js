// Diferansiyel test (spec §10.7, B9): uygulama ile Python oracle'ı aynı model.onnx'e aynı
// girdiyi verir, olasılık farkı toleransın altında kalmalıdır. Beklenen değerler
// tests/parite.json'dan gelir (python tests/parite.py --uret). Uygulama tarafı model test
// panelidir (?model-test=1); panel ?p= test kancasını yok sayar, her zaman gerçek modeli çalıştırır.
const PARITE = '../tests/parite.json';
// Ölçülen farklar kanıt olarak buraya yazılır (RELEASE.md bu dosyaya başvurur).
const SONUC = '../tests/parite-tarayici.json';

describe('Parite · tarayıcı (onnxruntime-web) ↔ Python (onnxruntime)', () => {
  it('5 referans girdide |Δ| < tolerans', () => {
    cy.readFile(PARITE).then(({ tolerance, cases, model_sha256 }) => {
      const sonuclar = [];
      cy.visit('/?model-test=1');
      cases.forEach(({ name, input, p: beklenen }) => {
        cy.getCy('model-input')
          .clear()
          .type(JSON.stringify(input), { delay: 0, parseSpecialCharSequences: false });
        cy.getCy('model-run').click();
        // Model ilk tahminde yüklenir; data-p dolana kadar bekle.
        cy.getCy('p', { timeout: 20000 })
          .should('have.attr', 'data-p')
          .and('match', /^\d/)
          .then((dataP) => {
            const fark = Math.abs(Number(dataP) - beklenen);
            cy.log(`${name}: tarayıcı ${dataP} · python ${beklenen} · |Δ| ${fark.toExponential(1)}`);
            sonuclar.push({ name, python: beklenen, tarayici: Number(dataP), abs_diff: fark });
            expect(fark, name).to.be.lessThan(tolerance);
          });
        // Sonraki vaka eski sonucu okumasın.
        cy.getCy('model-input').clear();
        cy.getCy('model-run').click();
        cy.getCy('p').should('have.attr', 'data-p', '');
      });
      cy.then(() => {
        const enBuyuk = Math.max(...sonuclar.map((s) => s.abs_diff));
        cy.writeFile(SONUC, {
          consumer: 'onnxruntime-web 1.31.1 (Cypress, Electron)',
          model_sha256,
          tolerance,
          max_abs_diff: enBuyuk,
          model_kaynagi: Cypress.expose('YEREL_MODEL') ? `yerel: ${Cypress.expose('YEREL_MODEL')}` : 'Hugging Face (commit\'e sabit URL)',
          cases: sonuclar,
        });
      });
    });
  });
});
