class ParticipantStore {
    constructor(db) {
        this.db = db
    }

    getParticipants() {
        this.db.connect().then(next => {
            if (next) {
                const participants = [
                    { id: 23, name: "jayhawks", initial: "j", topColor: "#000000", bottomColor: "#7f00ff" },
                    { id: 24, name: "wildcats", initial: "w", topColor: "#000000", bottomColor: "#fe0606" }
                ]

                return participants
            }
        })
        return null
    }
}

module.exports = ParticipantStore