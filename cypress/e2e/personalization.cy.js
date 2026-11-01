// spec.md §3: anlatı profile göre uyarlanır. Rol sahne metnini, hedef genişletilmiş notu ve okuma önerisini belirler.
import scenario from '../../content/scenario.json';

const [k1, k2, k3] = scenario.decisions;
const ROLES = ['backend', 'devops', 'qa'];
const GOALS = scenario.decisions.map((d, index) => ({ goal: d.goal, index }));

describe('Rol: sahne metni role göre değişir', () => {
  ROLES.forEach((role) => {
    it(`${role}: üç kararın anlatısı bu role ait`, () => {
      cy.visit('/');
      cy.startGame({ role });

      cy.contains(k1.narrative[role]);
      cy.choose('B');
      cy.contains(k2.narrativeByK1.B[role]);
      cy.choose('A');
      cy.contains(k3.narrative[role]);
      cy.contains(k3.logLine);

      // Diğer rollerin metni görünmez.
      ROLES.filter((r) => r !== role).forEach((other) => {
        cy.contains(k3.narrative[other]).should('not.exist');
      });
    });
  });
});

describe('Hedef: genişletilmiş not ve okuma önerisi hedefe göre', () => {
  GOALS.forEach(({ goal, index }) => {
    it(`${goal}: not yalnızca ${scenario.decisions[index].code} kararında, okuma önerisi son ekranda`, () => {
      cy.visit('/');
      cy.startGame({ goal });

      scenario.decisions.forEach((decision, i) => {
        cy.getCy('choice-a').click();
        cy.getCy('explain-what').should('be.visible');
        if (i === index) {
          cy.getCy('goal-note').should('contain.text', decision.options.A.note);
          cy.contains('Senin hedefin');
        } else {
          cy.getCy('goal-note').should('not.exist');
        }
        cy.getCy('continue').click();
      });

      cy.getCy('ending').should('be.visible');
      cy.contains(scenario.readings[goal].title);
    });
  });
});
