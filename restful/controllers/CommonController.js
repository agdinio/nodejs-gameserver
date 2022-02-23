const db_queries = require('../../config/dbqueries');

const readCitiesByState = (args) => {
    return db_queries.readCitiesByState(args.stateCode)
}

module.exports = {
    readCitiesByState
}