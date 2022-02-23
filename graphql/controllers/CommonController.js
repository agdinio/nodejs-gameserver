const conn = require('../../DbConnection')
const logger = require('../../config/logger')
const db_queries = require('../../config/dbqueries')
const jwt = require('jsonwebtoken')

const readCountries = (args) => {
    return db_queries.readCountries()
}

const readStates = (args) => {
	return db_queries.readStates()
}

const readCitiesByState = (args) => {	
	return db_queries.readCitiesByState(args.stateCode)
}

const readGameEventInfo = (args) => {
    return new Promise((resolve, reject) => {
        conn.pool.query('call sp_read_game_event_info', async (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return reject(err)
            }

            const sportTypes = []
            for (let i=0; i<result[1].length; i++) {
                const raw = result[1][i];
                let _sportType = await sportTypes.filter(o => o.id === raw.sportTypeId)[0]
                if (_sportType) {
                    if (_sportType.subSportGenres) {
                        if (raw.subSportGenreName) {
                            _sportType.subSportGenres.push({name: raw.subSportGenreName, code: raw.subSportGenreCode})
                        }
                    } else {
                        if (raw.subSportGenreName) {
                            _sportType.subSportGenres = [{name: raw.subSportGenreName, code: raw.subSportGenreCode}]
                        }
                    }
                } else {
                    _sportType = {
                        id: raw.sportTypeId,
                        name: raw.sportTypeName,
                        code: raw.sportTypeCode,
                        icon: raw.icon,
                        subSportGenres: []
                    }
                    if (raw.subSportGenreName) {
                        _sportType.subSportGenres.push({name: raw.subSportGenreName, code: raw.subSportGenreCode})
                    }

                    sportTypes.push(_sportType)
                }
            }

            const seasons = []
            if (result[2]) {
                for (let j=0; j<result[2].length; j++) {
                    const raw = result[2][j]
                    seasons.push({name: raw.name, code: raw.code})
                }
            }

            return resolve({states: result[0] || [], sportTypes: sportTypes, seasons: seasons})
        })
    })
}

const loginAdminUser = (args) => {
    return new Promise(async (resolve) => {
        let response = await db_queries.loginAdminUser(args)

        if (response && response.id) {
            const token = jwt.sign(
                response,
                process.env.JWT_KEY,
                {expiresIn: '1d'}
            );

            response.token = token
        }

        return resolve(response)
    })
}

module.exports = {
    readCountries,
    readStates,
    readCitiesByState,
    readGameEventInfo,
    loginAdminUser,
}
