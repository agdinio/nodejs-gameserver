const controller = require('../controllers/CommonController')
const jwt = require('jsonwebtoken')

module.exports = {
    readCountries: async (args) => {
      return await controller.readCountries(args)
    },
    readCitiesByState: async (args) => {
        return await controller.readCitiesByState(args);
    },
    readStates: async (args) => {
      return await controller.readStates(args);
    },
    readGameEventInfo: async (args) => {
        return await controller.readGameEventInfo(args);
    },
    loginAdminUser: async (args, context) => {
        return await controller.loginAdminUser(args)
    }
}
