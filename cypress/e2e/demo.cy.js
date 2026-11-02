// v2 demosu (60–90 sn): aynı sahnede (Karar 2) model iki oyuncu için iki farklı karar verir.
// Yayındaki uygulamaya karşı çalışır; model Hugging Face'ten commit'e sabit adresle iner, tutor gerçek
// Gemini yanıtıdır. Test kancası (?p=) KULLANILMAZ: ekrandaki olasılık gerçek modelin çıktısıdır.
//   npm run demo  →  demo-video/demo.cy.js.mp4  (+ demo-video/demo-p.json: videodaki iki olasılık)
// Beklemeler izleyenin ekranı okuyabilmesi içindir; oyuncu davranışını (süreler) da onlar belirler.
// TEMPO: bütün beklemeleri birlikte ölçekler (video 60–90 sn aralığında kalsın).
const TEMPO = 1.4;
const pause = (ms = 1500) => cy.wait(Math.round(ms * TEMPO));
const kararlar = [];

// Model sahneye girişte çalışır; olasılık ekrana gelene kadar bekle ve kayda geçir.
const modelKarari = (oyuncu, beklenen) =>
  cy.getCy('p', { timeout: 15000 })
    .should('have.attr', 'data-p').and('match', /^\d/)
    .then(() => cy.getCy('p').should('have.attr', 'data-mudahale', beklenen))
    .then(($p) => {
      const p = Number($p.attr('data-p'));
      kararlar.push({ oyuncu, sahne: 'Karar 2', p, mudahale: beklenen === '1' });
      cy.log(`**Model: p = ${p.toFixed(4)} → ${beklenen === '1' ? 'müdahale' : 'müdahale yok'}**`);
    });

const girisYap = () => {
  cy.visit('/');
  pause(2500);
  cy.getCy('level-experienced').click();
  pause(800);
  cy.getCy('role-backend').click();
  pause(800);
  cy.getCy('goal-architecture').scrollIntoView().click();
  pause(1000);
  cy.getCy('start').scrollIntoView().click();
  cy.getCy('choice-a').should('be.visible');
};

describe('SE Primer v2 · demo', () => {
  it('aynı sahnede iki oyuncu, modelin iki farklı kararı', () => {
    // Gerçek tutor yanıtı (destek dosyasındaki sahte yanıt devre dışı).
    cy.intercept('POST', '/api/tutor', (req) => req.continue()).as('tutor');

    cy.log('**Oyuncu 1 · Deneyimliyim: Karar 1\'de tutor\'a danışır**');
    girisYap();
    cy.log('**Karar 1: model ilk sahnede de çalışır (üstteki MODEL satırı)**');
    pause(3500);
    cy.getCy('tutor-open').click();
    pause(800);
    cy.getCy('tutor-hint').click();
    cy.wait('@tutor');
    cy.getCy('tutor-msg').last().should('be.visible');
    pause(4500);
    cy.get('[aria-label="Kapat"]').click();
    pause(1000);
    cy.getCy('choice-a').click();
    cy.getCy('explain-why').should('be.visible');
    pause(3500);
    cy.getCy('continue').click();

    cy.log('**Karar 2 · Model düşük risk görür: v1 kuralları, ipucu kapalı, 60 sn sayaç işler**');
    modelKarari('Oyuncu 1 (tutor\'a danıştı, A seçti)', '0');
    cy.getCy('timer').should('be.visible');
    cy.getCy('model-soru').should('not.exist');
    pause(7000);

    cy.log('**Oyuncu 2 · Deneyimliyim: Karar 1\'i danışmadan, hızla B seçer**');
    girisYap();
    pause(1500);
    cy.getCy('choice-b').click();
    cy.getCy('explain-why').should('be.visible');
    pause(2500);
    cy.getCy('continue').click();

    cy.log('**Karar 2 · Aynı sahne, model yüksek risk görür: sayaç kalkar, ipucu açılır, "dur ve düşün"**');
    modelKarari('Oyuncu 2 (danışmadı, hızla B seçti)', '1');
    cy.getCy('timer').should('not.exist');
    cy.getCy('model-soru').should('be.visible');
    pause(5000);
    cy.getCy('model-soru').scrollIntoView({ duration: 600 });
    pause(6000);

    cy.then(() => cy.writeFile('demo-video/demo-p.json', {
      uygulama: 'https://se-primer-v2.ai.studio', kararlar,
    }));
  });
});
