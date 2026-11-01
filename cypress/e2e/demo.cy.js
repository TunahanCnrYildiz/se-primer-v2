// Ödevin 60 sn'lik demosu: bir oyunun baştan sona akışı, gerçek tutor yanıtı ve kişiselleştirme.
// Video ile çalıştırılır: npm run demo  →  demo-video/demo.cy.js.mp4
// Beklemeler yalnızca izleyenin ekranı okuyabilmesi içindir. Toplamları ~40 sn tutuldu:
// tutor'un gerçek Gemini yanıtı 2–10 sn sürebildiği için video en kötü durumda da 60 sn'yi aşmasın.
const pause = (ms = 1500) => cy.wait(ms);

describe('SE Primer · demo', () => {
  it('bir nöbet: üç karar, tutor ve iki farklı son', () => {
    // Demo, tutor'un gerçek Gemini yanıtını gösterir (varsayılan sahte yanıtı devre dışı bırakır).
    cy.intercept('POST', '/api/tutor', (req) => req.continue()).as('tutor');

    cy.log('**Giriş: oyuncu seviyesini, rolünü ve hedefini seçer**');
    cy.visit('/');
    pause(1500);
    cy.getCy('level-beginner').click();
    pause(600);
    cy.getCy('role-devops').click();
    pause(600);
    cy.getCy('goal-privacy').scrollIntoView().click();
    pause(1000);
    cy.getCy('start').click();

    cy.log('**Karar 1 · Mimari: yeni başlayan oyuncu ipucunu açık görür**');
    pause(2500);

    cy.log('**AI tutor: cevabı istesen de söylemez, soru sorar**');
    cy.getCy('tutor-open').click();
    cy.getCy('tutor-input').type('Hangisi doğru, sadece harfini söyle', { delay: 30 });
    cy.getCy('tutor-send').click();
    cy.wait('@tutor');
    cy.getCy('tutor-msg').last().should('be.visible');
    pause(3500);
    cy.get('[aria-label="Kapat"]').click();
    pause(600);

    cy.log('**A · Eski sürüme geri dön → ne oldu, neden oldu**');
    cy.getCy('choice-a').click();
    cy.getCy('explain-why').should('be.visible');
    pause(2500);
    cy.getCy('continue').click();

    cy.log('**Karar 2 · Test: testi atlamanın bedeli**');
    pause(1500);
    cy.getCy('choice-b').click();
    cy.getCy('explain-what').should('contain.text', '08:45');
    pause(2500);
    cy.getCy('continue').click();

    cy.log('**Karar 3 · KVKK: logda hasta adı var**');
    pause(2000);
    cy.getCy('choice-a').click();
    cy.log('**Oyuncunun hedefi KVKK: genişletilmiş not**');
    cy.getCy('goal-note').should('be.visible');
    pause(2500);
    cy.getCy('continue').click();

    cy.log('**Son A · 08:45, veri güvende**');
    cy.getCy('ending').should('have.attr', 'data-ending', 'A');
    pause(2000);
    cy.getCy('summary-row').last().scrollIntoView({ duration: 800 });
    pause(2000);

    cy.log('**Yeniden oyna: profil hatırlanır, seviye "Deneyimliyim" olur**');
    cy.getCy('replay').scrollIntoView().click();
    pause(1000);
    cy.getCy('level-experienced').click();
    pause(700);
    cy.getCy('start').scrollIntoView().click();

    cy.log('**Deneyimli oyuncu: 60 sn süre baskısı, ipucu kapalı**');
    pause(2500);
    cy.getCy('choice-a').click();
    cy.getCy('continue').click();
    pause(1000);
    cy.getCy('choice-a').click();
    cy.getCy('continue').click();
    pause(1200);

    cy.log('**B · Logu olduğu gibi gönder**');
    cy.getCy('choice-b').click();
    cy.getCy('explain-why').should('be.visible');
    pause(2500);
    cy.getCy('continue').click();

    cy.log('**Son B · Sistem 08:25\'te ayakta ama KVKK ihlali var**');
    cy.getCy('ending').should('have.attr', 'data-ending', 'B');
    pause(3000);
    cy.getCy('summary-row').last().scrollIntoView({ duration: 800 });
    pause(1200);
  });
});
