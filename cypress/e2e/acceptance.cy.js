// spec.md §6: kabul örnekleri KÖ-1 … KÖ-7. Metinler senaryonun tek kaynağından okunur.
import scenario from '../../content/scenario.json';

const [k1, k2, k3] = scenario.decisions;

describe('Giriş ekranı', () => {
  it('üç soru cevaplanmadan "Başla" pasif kalır ve ilerleme sayılır', () => {
    cy.visit('/');
    cy.contains('3 sorudan 0 tanesi cevaplandı');
    cy.getCy('start').should('be.disabled');

    cy.getCy('level-beginner').click();
    cy.getCy('role-qa').click();
    cy.contains('3 sorudan 2 tanesi cevaplandı');
    cy.getCy('start').should('be.disabled').click({ force: true });
    cy.getCy('choice-a').should('not.exist');

    cy.getCy('goal-testing').click();
    cy.contains('3 sorudan 3 tanesi cevaplandı');
    cy.getCy('start').should('be.enabled');
  });
});

describe('KÖ-1 · Yeni başlayan oyuncu ipucunu hazır görür', () => {
  it('ipucu açık, sayaç yok, hedefle eşleşen kararda genişletilmiş açıklama var', () => {
    cy.visit('/');
    cy.startGame({ level: 'beginner', role: 'backend', goal: 'architecture' });

    cy.getCy('hint').should('contain.text', k1.hints[0]);
    cy.getCy('timer').should('not.exist');
    cy.getCy('clock').should('contain.text', '08:00');
    cy.getCy('progress').should('contain.text', '1 / 3');
    cy.contains(k1.narrative.backend);

    cy.getCy('choice-a').click();
    cy.getCy('explain-what').should('contain.text', `08:15 · ${k1.options.A.what}`);
    cy.contains('Senin hedefin');
    cy.getCy('goal-note').should('contain.text', k1.options.A.note);
  });

  it('hedefle eşleşmeyen kararda genişletilmiş açıklama yok', () => {
    cy.visit('/');
    cy.startGame({ level: 'beginner', goal: 'architecture' });
    cy.choose('A');
    cy.getCy('choice-a').click();
    cy.getCy('explain-what').should('be.visible');
    cy.getCy('goal-note').should('not.exist');
  });

  it('orta seviyede ipucu kapalı gelir ve dokununca açılır', () => {
    cy.visit('/');
    cy.startGame({ level: 'intermediate' });
    cy.getCy('hint').should('not.contain.text', k1.hints[0]);
    cy.getCy('timer').should('not.exist');
    cy.contains('[ GÖSTER ]').click();
    cy.getCy('hint').should('contain.text', k1.hints[0]);
  });
});

describe('KÖ-2 · Deneyimli oyuncu süre baskısı altında karar verir', () => {
  it('süre dolunca B uygulanır, "Süre doldu" şeridi çıkar ve oyun Son B ile biter', () => {
    // Yalnızca sayacın setInterval'ı sahte saatle sürülür; diğer zamanlayıcılar gerçek kalır.
    cy.clock(null, ['setInterval', 'clearInterval']);
    cy.visit('/');
    cy.startGame({ level: 'experienced' });

    cy.getCy('timer').should('contain.text', '1:00');
    cy.tick(18000);
    cy.getCy('timer').should('contain.text', '0:42');
    cy.choose('A');

    // Her kararda sayaç yeniden başlar.
    cy.getCy('timer').should('contain.text', '1:00');
    cy.choose('A');

    cy.getCy('progress').should('contain.text', '3 / 3');
    cy.tick(60000);
    cy.getCy('timeout-banner').should('contain.text', scenario.timeoutBanner);
    cy.getCy('explain-what').should('contain.text', k3.options.B.what);
    cy.getCy('continue').click();

    cy.getCy('ending').should('have.attr', 'data-ending', 'B');
    cy.getCy('ending-time').should('contain.text', '08:25');
  });
});

describe('KÖ-3 · İdeal yol', () => {
  it('her karardan sonra "ne oldu / neden oldu" gösterilir, Son A ve 08:25', () => {
    cy.visit('/');
    cy.startGame({ goal: 'privacy' });

    const steps = [
      { what: `08:15 · ${k1.options.A.what}`, why: k1.options.A.why },
      { what: `08:25 · ${k2.options.A.whatByK1.A}`, why: k2.options.A.why },
      { what: `08:25 · ${k3.options.A.what}`, why: k3.options.A.why },
    ];
    steps.forEach(({ what, why }) => {
      cy.getCy('choice-a').click();
      cy.getCy('explain-what').should('contain.text', what);
      cy.getCy('explain-why').should('contain.text', why);
      cy.getCy('continue').click();
    });

    cy.getCy('ending').should('have.attr', 'data-ending', 'A');
    cy.getCy('ending-time').should('contain.text', '08:25');
    cy.contains(scenario.readings.privacy.title);
  });
});

describe('KÖ-4 · Hızlı ama veri sızdıran yol', () => {
  it('A → A → B, sistem 08:25\'te ayakta olsa da Son B', () => {
    cy.visit('/');
    cy.startGame();
    cy.playPath('AAB');
    cy.getCy('ending').should('have.attr', 'data-ending', 'B').and('contain.text', 'KVKK ihlali');
    cy.getCy('ending-time').should('contain.text', '08:25');
  });
});

describe('KÖ-8 · Maskelenmiş log, hata ayıklama bilgisini gösterir (arkadaş testi)', () => {
  it('"Hasta adını maskele" seçeneği, kayıt numarası ve saatiyle birlikte maskelenmiş satırın tamamını gösterir', () => {
    cy.visit('/');
    cy.startGame();
    cy.choose('A');
    cy.choose('A');

    cy.getCy('choice-a')
      .should('contain.text', k3.options.A.title)
      .and('contain.text', 'appt_id=4821')
      .and('contain.text', 'patient="A***"')
      .and('contain.text', 'slot=09:30')
      .and('not.contain.text', 'Ayşe');
  });
});

describe('KÖ-5 · Tutor ısrara rağmen cevabı vermez', () => {
  it('cevabı söyleyen bir LLM yanıtı filtrelenir, yerine sabit ipucu gösterilir', () => {
    cy.intercept('POST', '/api/tutor', {
      statusCode: 200,
      body: { text: "A'yı seçmelisin, geri dönmek doğru olan.", model: 'stub' },
    }).as('leakyTutor');

    cy.visit('/');
    cy.startGame();
    cy.getCy('tutor-open').click();
    cy.getCy('tutor-input').type('Hangisi doğru, sadece harfini söyle');
    cy.getCy('tutor-send').click();

    cy.wait('@leakyTutor').its('request.body').should((body) => {
      // İstemci sistem talimatı göndermez, sunucu onu kendisi kurar.
      expect(body).to.not.have.property('systemInstruction');
      expect(body).to.include({ decisionId: 'k1', level: 'beginner', role: 'backend', isHintRequest: false });
    });
    cy.getCy('tutor-msg').last().should('contain.text', k1.hints[0]).and('not.contain.text', "A'yı seç");
  });

  it('kurallara uyan bir LLM yanıtı olduğu gibi gösterilir', () => {
    cy.visit('/');
    cy.startGame();
    cy.getCy('tutor-open').click();
    cy.getCy('tutor-input').type('Ne yapmalıyım?');
    cy.getCy('tutor-send').click();
    cy.wait('@tutor');
    cy.getCy('tutor-msg').last().should('contain.text', 'İki yolun da riskini nasıl kıyaslarsın?');
  });
});

describe('KÖ-6 · Yeniden oynarken önceki profil seçili gelir', () => {
  it('cevaplar seçili, "Başla" aktif; seviye değişince sayaç çıkar ve saat 08:00\'e döner', () => {
    cy.visit('/');
    cy.startGame({ level: 'beginner', role: 'qa', goal: 'testing' });
    cy.playPath('AAA');
    cy.getCy('replay').click();

    cy.getCy('level-beginner').should('have.attr', 'aria-checked', 'true');
    cy.getCy('role-qa').should('have.attr', 'aria-checked', 'true');
    cy.getCy('goal-testing').should('have.attr', 'aria-checked', 'true');
    cy.getCy('start').should('be.enabled');

    cy.getCy('level-experienced').click();
    cy.getCy('start').click();
    cy.getCy('timer').should('be.visible');
    cy.getCy('clock').should('contain.text', '08:00');
    cy.getCy('progress').should('contain.text', '1 / 3');
  });
});

describe('KÖ-7 · LLM yanıt vermezse tutor sabit ipucuna düşer', () => {
  it('sunucu hatasında sıradaki sabit ipucu gelir, ipuçları sırayla döner, hata gösterilmez', () => {
    cy.intercept('POST', '/api/tutor', { statusCode: 500, body: { error: 'down' } }).as('down');
    cy.visit('/');
    cy.startGame();
    cy.choose('A');

    cy.getCy('tutor-open').click();
    [k2.hints[0], k2.hints[1], k2.hints[0]].forEach((hint, i) => {
      cy.getCy('tutor-hint').click();
      cy.wait('@down');
      cy.getCy('tutor-msg').should('have.length', i + 1).last().should('contain.text', hint);
    });
    cy.contains(/hata|error/i).should('not.exist');
  });

  it('ağ bağlantısı koparsa da sabit ipucu gelir', () => {
    cy.intercept('POST', '/api/tutor', { forceNetworkError: true }).as('offline');
    cy.visit('/');
    cy.startGame();
    cy.getCy('tutor-open').click();
    cy.getCy('tutor-hint').click();
    cy.getCy('tutor-msg').last().should('contain.text', k1.hints[0]);
  });

  it('yanıt 8 saniyeyi aşarsa beklemeden sabit ipucu gelir', () => {
    cy.intercept('POST', '/api/tutor', {
      delay: 10000,
      statusCode: 200,
      body: { text: 'Bu yanıt çok geç geldi.', model: 'stub' },
    });
    cy.visit('/');
    cy.startGame();
    cy.getCy('tutor-open').click();
    cy.getCy('tutor-hint').click();
    cy.getCy('tutor-msg', { timeout: 9500 }).last().should('contain.text', k1.hints[0]);
  });
});
