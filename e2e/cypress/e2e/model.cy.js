// spec §10.7: modelin oyunu değiştirdiği kabul örnekleri KÖ-9 … KÖ-11 ve gölge mod (§10.5).
// KÖ-9/10 modelin DAVRANIŞINI test eder: olasılık ?p= test kancasıyla sabitlenir, çünkü gerçek
// modelin hangi girdide eşiği geçeceği eğitime bağlıdır. Modelin SAYISAL doğruluğu parite.cy.js'te.
import scenario from '../../../content/scenario.json';

const [, k2] = scenario.decisions;

describe('KÖ-9 · Model riskli gördüğü deneyimli oyuncunun sayacını kaldırır', () => {
  it('p ≥ 0.50: ipucu açık, sayaç yok, yansıtma sorusu var, süre dolmaz', () => {
    cy.visit('/?p=0.9');
    cy.startGame({ level: 'experienced' });
    cy.choose('A');

    cy.getCy('progress').should('contain.text', '2 / 3');
    cy.getCy('p').should('have.attr', 'data-p', '0.9').and('have.attr', 'data-mudahale', '1');
    cy.getCy('p').should('contain.text', '0.9000');
    cy.getCy('hint').should('contain.text', k2.hints[0]);
    cy.getCy('model-soru').should('contain.text', 'DUR VE DÜŞÜN').and('contain.text', k2.hints[1]);
    cy.getCy('timer').should('not.exist');

    // 60 sn geçse de B otomatik uygulanmaz.
    cy.clock();
    cy.tick(61000);
    cy.getCy('explain-what').should('not.exist');
    cy.getCy('choice-a').should('be.visible');
  });
});

describe('KÖ-10 · Model riskli görmediği oyuncuya dokunmaz', () => {
  it('p < 0.50: v1 kuralları (ipucu kapalı, 60 sn sayaç, soru yok)', () => {
    cy.visit('/?p=0.1');
    cy.startGame({ level: 'experienced' });
    cy.choose('A');

    cy.getCy('progress').should('contain.text', '2 / 3');
    cy.getCy('p').should('have.attr', 'data-p', '0.1').and('have.attr', 'data-mudahale', '0');
    cy.getCy('hint').should('not.contain.text', k2.hints[0]);
    cy.getCy('model-soru').should('not.exist');
    cy.getCy('timer').should('be.visible');
  });
});

describe('KÖ-11 · Model yüklenemezse oyun v1 kurallarıyla devam eder', () => {
  it('Hugging Face erişilemez: hata yok, p = "—", ideal yol 08:25 ve Son A', () => {
    cy.intercept('GET', 'https://huggingface.co/**', { forceNetworkError: true });
    cy.visit('/');
    cy.startGame({ level: 'intermediate' });
    ['A', 'A', 'A'].forEach((harf) => {
      cy.getCy('p').should('contain.text', '—').and('have.attr', 'data-p', '');
      cy.getCy('model-soru').should('not.exist');
      cy.choose(harf);
    });
    cy.getCy('ending').should('be.visible');
    cy.getCy('ending-time').should('contain.text', '08:25');
    cy.contains(scenario.endings.A.title);
  });
});

describe('Gölge mod · Veri Toplama Modu\'nda model müdahale etmez', () => {
  it('?veri=1 ve p ≥ 0.50: olasılık görünür, sayaç ve kapalı ipucu yerinde', () => {
    cy.visit('/?veri=1&p=0.9');
    cy.getCy('veri-notu').should('be.visible');
    cy.startGame({ level: 'experienced' });

    cy.getCy('p').should('have.attr', 'data-p', '0.9').and('have.attr', 'data-mudahale', '0');
    cy.getCy('timer').should('be.visible');
    cy.getCy('model-soru').should('not.exist');
  });
});
