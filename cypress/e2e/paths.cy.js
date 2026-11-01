// spec.md §4: 8 yolun tamamı. Son yalnızca K3'e bağlıdır, saat üç kararın toplamıdır.
const PATHS = [
  { path: 'AAA', time: '08:25', minutes: 25, ending: 'A', costs: ['+15 dk', '+10 dk', '+0 dk'] },
  { path: 'AAB', time: '08:25', minutes: 25, ending: 'B', costs: ['+15 dk', '+10 dk', '+0 dk'] },
  { path: 'ABA', time: '08:45', minutes: 45, ending: 'A', costs: ['+15 dk', '+30 dk', '+0 dk'] },
  { path: 'ABB', time: '08:45', minutes: 45, ending: 'B', costs: ['+15 dk', '+30 dk', '+0 dk'] },
  { path: 'BAA', time: '08:30', minutes: 30, ending: 'A', costs: ['+20 dk', '+10 dk', '+0 dk'] },
  { path: 'BAB', time: '08:30', minutes: 30, ending: 'B', costs: ['+20 dk', '+10 dk', '+0 dk'] },
  { path: 'BBA', time: '09:00', minutes: 60, ending: 'A', costs: ['+20 dk', '+40 dk', '+0 dk'] },
  { path: 'BBB', time: '09:00', minutes: 60, ending: 'B', costs: ['+20 dk', '+40 dk', '+0 dk'] },
];

describe('8 yol: bitiş saati ve son', () => {
  PATHS.forEach(({ path, time, minutes, ending, costs }) => {
    it(`${path.split('').join(' → ')} = ${time}, Son ${ending}`, () => {
      cy.visit('/');
      cy.startGame();
      cy.playPath(path);

      cy.getCy('ending').should('have.attr', 'data-ending', ending);
      cy.getCy('ending-time').should('contain.text', time).and('contain.text', `T+${minutes}m`);
      cy.getCy('ending').should(
        'contain.text',
        ending === 'A' ? 'Sistem ayakta, veri güvende' : 'KVKK ihlali var',
      );
      cy.contains(`MTTR: ${minutes} DAKİKA`).should(ending === 'A' ? 'be.visible' : 'not.exist');

      cy.getCy('summary-row').should('have.length', 3).each(($row, i) => {
        cy.wrap($row).should('contain.text', costs[i]);
      });
    });
  });
});
