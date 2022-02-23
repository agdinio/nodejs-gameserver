const ID = require('../utilities/unique')
const PlayTypes = ['LivePlay', 'GameMaster', 'Sponsor', 'Prize', 'Announce']

class Play {
    constructor(play) {
        this.id = play.id || ID()
        this.type = play.type || PlayTypes[0]
        this.predeterminedName = play.predeterminedName || null
        this.questionStatement = play.questionStatement || 'Question'
        this.choices = play.choices || []
        this.header = play.header || ''
        this.middle = play.middle || ''
        this.bottom = play.bottom || ''
    }
}

module.exports = Play