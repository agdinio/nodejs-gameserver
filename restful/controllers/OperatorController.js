const db_queries = require('../../config/dbqueries');

const login = (args) => {
    return db_queries.loginAdminUser(args)
}

module.exports = {
    login
}