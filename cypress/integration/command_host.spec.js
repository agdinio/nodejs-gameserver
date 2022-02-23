let list = []

describe(Cypress.env('gameId'), () => {
  it(`GET Recorded Plays for ${Cypress.env('gameId')}`, () => {
    cy.request({
      method: 'GET',
      url: `http://sportocotoday.com:6604/automation/recorded_plays?game_id=${Cypress.env('gameId')}`,
    }).then(res => {
      cy.log('================================' + Cypress.env('url'))
      expect(res.status).equal(200)
      expect(res.body).to.be.a('array')

      if (res.body && Array.isArray(res.body) && res.body.length > 0) {
        list = res.body

        cy.visit(Cypress.env('url'))
        cy.wait(3000)
        cy.clearLocalStorage()

        iteratePlay(0)
      }
    })
  })
})

const iteratePlay = i => {
  if (i < list.length) {
    const play = list[i]

    if (play.ref_id && play.event) {
      if (play.is_previous_play_ended || play.event.toLowerCase() == 'delay') {
        cy.wait(play.wait * 1000)
      } else {
        if (play.event.toLowerCase() == 'click') {
          cy.wait(play.wait * 1000)
          cy.get(`#${play.ref_id}`).click({ force: true })
        } else if (play.event.toLowerCase() == 'select') {
          cy.wait(play.wait * 1000)
          cy.get(`#${play.ref_id}`).select(play.event_select_value, { force: true })
        } else if (play.event.toLowerCase() == 'input') {
          if (
            play.ref_id.includes('editor-readonly-1-Announce') ||
            play.ref_id.includes('editor-readonly-2-Announce') ||
            play.ref_id.includes('editor-readonly-3-Announce')
          ) {
            const editorId = play.ref_id.replace('readonly-', '')
            cy.get(`#${editorId}`).within(() => {
              cy.get(`.ql-blank`)
                .eq(0)
                .invoke('prop', 'innerHTML', play.event_select_value)
            })
            cy.get(`#${play.ref_id}`).invoke('prop', 'innerHTML', play.event_select_value)
          } else {
            cy.wait(play.wait * 1000)
            cy.get(`#${play.ref_id}`).type(play.event_select_value, { force: true })
          }
        }
      }
    }

    iteratePlay(i + 1)
  }
}

/*
before(() => {
  cy.visit('http://localhost:1030/?info=396bb3047679849b1085138c5621f6b8199153c109e46826c6536b69711b4cbcd3ea4b528d17d23768523ff52e4b47ebb9b204463a5a131de5c79a0453405d55e9480257e369f0d7824fd1c86e9d093eccc95701ebb71344455616bde3d3cf0ab634f6736b6d16fa33227a81397e5e950f3797f9ae53e0a5fe4444ab6d59ccec3a6114f195b8c874898c7f83d3d8949f&headless=true');
  cy.clearLocalStorage();
  cy.waitForReact();
});

  it('Start the PlayStack', () => {
    console.log('>>>>>>>>>>>', list)
    if (list > 0) {
      cy.hCommClick(0.5, 'header-team-zwe-0');
      cy.hCommClick(1, 'header-button-liveplay-0');
      cy.hCommClick(0.5, 'playitem-addtostack-button-LivePlay-0');
      cy.hCommClick(1, 'header-button-liveplay-1');

      cy.wait(100000)
    }
  })
*/

/*
describe('Host Command', () => {

  it('Visit the URL', function () {
    cy.visit('http://localhost:1030/?info=396bb3047679849b1085138c5621f6b8199153c109e46826c6536b69711b4cbcd3ea4b528d17d23768523ff52e4b47ebb9b204463a5a131de5c79a0453405d55e9480257e369f0d7824fd1c86e9d093eccc95701ebb71344455616bde3d3cf0ab634f6736b6d16fa33227a81397e5e950f3797f9ae53e0a5fe4444ab6d59ccec3a6114f195b8c874898c7f83d3d8949f&headless=true');
    cy.wait(1000);
  });

});
*/
