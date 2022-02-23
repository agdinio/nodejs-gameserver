const controller = require('../controllers/GameController')

module.exports = {
    createGame: async (args) => {
        return await controller.create(args);
    },
    updateGame: async (args) => {
        return await controller.update(args);
    },
    readGames: async (args) => {
        return await controller.read(args);
    },
    readGameById: async (args) => {
        return await controller.readGameById(args);
    },
    saveParticipants: (args) => {
        console.log(args)
        return 'GOTCHA'
    },
    savePrePicks: (args) => {
        console.log(args)
        return 'GOTCHA'
    },
    deleteGame: async (args) => {
        return await controller.deleteGame(args)
    },
    updateLeap: async (args) => {
        return await controller.updateLeap(args)
    },
    readRecordedGames: async (args) => {
        return await controller.readRecordedGames(args)
    },
    readVideoFootages: async (args) => {
        return await controller.readVideoFootages(args)
    },
    readGameEvents: async (args) => {
        return await controller.readGameEvents(args)
    }
}