const conn = require('../DbConnection')
const logger = require('../config/logger')
const db_queries = require('../config/dbqueries')

class AppDbComponent {
    constructor(environment) {
        this.environment = environment
    }

    readSportType(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_sport_type()', [], async (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (result) {
                    const sportTypes = []
                    for (let i=0; i<result[0].length; i++) {
                        const raw = result[0][i]
                        let _sportType = await sportTypes.filter(o => o.id === raw.sport_type_id)[0]
                        if (_sportType) {
                            if (raw.subsport_code) {
                                _sportType.subSportGenres.push({
                                    code: raw.subsport_code,
                                    name: raw.subsport_name
                                })
                            }
                        } else {
                            _sportType = {
                                id: raw.sport_type_id,
                                code: raw.code,
                                name: raw.name,
                                icon: raw.icon,
                                iconHover: raw.icon_hover,
                                subSportGenres: [],
                                sequence: raw.sequence
                            }
                            if (raw.subsport_code) {
                                _sportType.subSportGenres.push({
                                    code: raw.subsport_code,
                                    name: raw.subsport_name
                                })
                            }

                            sportTypes.push(_sportType)
                        }
                    }

                    return resolve(sportTypes)
                }
            })

        })
    }

    readGamesByCategory(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_games_by_category(?)', [args], async (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (result) {
                    const games = []
                    for (let i=0; i<result[0].length; i++) {
                        const row = result[0][i]
                        if (!row.ready_for_play) {
                            continue
                        }
                        let game = await games.filter(o => o.gameId === row.gameId)[0]
                        if (game) {
                            if (game.participants) {
                                const idx = await game.participants.findIndex(o => o.participantId === row.participantId)
                                if (idx < 0) {
                                    game.participants.push({
                                        participantId: row.participantId,
                                        gameId: row.gameId,
                                        sequence: row.partSequence,
                                        initial: row.partInitial,
                                        score: row.partScore,
                                        name: row.partName,
                                        topColor: row.partTopColor,
                                        bottomColor: row.partBottomColor
                                    })
                                }
                            } else {
                                let participants = []
                                participants.push({
                                    participantId: row.participantId,
                                    gameId: row.gameId,
                                    sequence: row.partSequence,
                                    initial: row.partInitial,
                                    score: row.partScore,
                                    name: row.partName,
                                    topColor: row.partTopColor,
                                    bottomColor: row.partBottomColor
                                })
                                game.participants = participants;
                            }
                        } else {
                            let participants = []
                            participants.push({
                                participantId: row.participantId,
                                gameId: row.gameId,
                                sequence: row.partSequence,
                                initial: row.partInitial,
                                score: row.partScore,
                                name: row.partName,
                                topColor: row.partTopColor,
                                bottomColor: row.partBottomColor
                            })

                            games.push({
                                gameId: row.gameId,
                                stage: row.gameStage,
                                sportType: row.gameSportType,
                                subSportGenre: row.gameSubSportGenre,
								isLeap: row.gameIsLeap ? true : false,
                                leapType: row.gameLeapType,
                                videoFootageId: row.videoFootageId,
                                videoFootageName: row.videoFootageName,
                                videoFootagePath: row.videoFootagePath,
                                formattedTimeStart: row.formattedTimeStart,
                                timeStart: new Date(row.gameTimeStart).toString(),
                                dateStart: new Date(row.gameDateStart).toString(),
                                dateAnnounce: new Date(row.gameDateAnnounce).toString(),
                                datePrePicks: new Date(row.gameDatePrePicks).toString(),
                                country: row.gameCountryName,
                                state: row.gameStateName,
                                city: row.gameCity,
                                latlong: row.gameLatLong,
                                stadium: row.gameStadium,
                                participants: participants,
                            })
                        }
                    }

                    return resolve(games)
                } else {
                    return resolve([])
                }
            })
        })
    }

    readPrePicksByGameId(gameId) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_prepicks_by_game_id(?)', [gameId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {

                }
            })
        })
    }

    readPrizeBoard(args) {
		const ds_settings = db_queries.readDsSettings();
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_prizeboard(?, ?)', [args.userId, ds_settings.config_language_id], async (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {
					for (let m=0; m<result[0].length; m++) {
						const _bi = result[0][m].boardImage.split('/')
						// result[0][m].boardImage = _bi[_bi.length - 1];
                        result[0][m].boardImage = result[0][m].boardImage && result[0][m].boardImage.replace(/\s+/g, '%20');
					}
                    for (let j=0; j<result[1].length; j++) {
                        const raw = await result[1][j];
                        raw.image = await raw.image && raw.image.replace(/\s+/g, '%20');
                        const images = await result[2].filter(o => o.prizeBoardPrizeId === raw.prizeBoardPrizeId) || []
                        images.sort((a, b) => a.sequence - b.sequence)
                        const _images = []
                        images.forEach(async img => {
                            const _img = await img.image.split('/')
                            await _images.push(_img[_img.length - 1] && _img[_img.length - 1].replace(/\s+/g, '%20'));
                        })
                        result[1][j].images = await _images;
                    }

                    for (let k=0; k<result[3].length; k++) {
                        const raw = result[3][k];
                        const images = await result[2].filter(o => o.prizeBoardPrizeId === raw.prizeBoardPrizeId) || []
                        images.sort((a, b) => a.sequence - b.sequence)
                        const _images = []
                        images.forEach(async img => {
                            const _img = await img.image.split('/')
                            await _images.push(_img[_img.length - 1] && _img[_img.length - 1].replace(/\s+/g, '%20'))
                        })
                        raw.images = await _images;
                        raw.agreed = raw.agreed ? true : false
                        raw.claimed = raw.claimed ? true : false
                        raw.forRedeem = raw.forRedeem ? true : false
                    }

                    const prizeBoards = result[0] || []
                    const prizeBoardPrizes = result[1] || []
                    const userPrizes = result[3] || []

                    return resolve({prizeBoards: prizeBoards, prizeBoardPrizes: prizeBoardPrizes, userPrizes: userPrizes})
                }
            })
        })
    }

    readTopEarners(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_appuser_top_earners()', (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {
                    return resolve({topCelebEarners: result[0], topEarners: result[1]})
                }
            })
        })
    }

    readPrizeChest(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_prizechest()', (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {
                    return resolve({prizeChest: result[0] || []})
                }
            })
        })
    }

    readCountries(args) {
        return db_queries.readCountries()
    }

    readZonesByCountry(args) {
        return db_queries.readZonesByCountry(args)
    }

    readCitiesByZone(args) {
        return db_queries.readCitiesByZone(args)
    }

    readTokenProducts(args) {
        return db_queries.appuser.readTokenProducts(args.userId, args.groupId)
    }

    readStarPrizeByCategory(args) {
        const ds_settings = db_queries.readDsSettings();
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_starprize_by_category(?,?,?)', [args.userId, args.prizeBoardId, ds_settings.config_language_id], async (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {
                    for (let j=0; j<result[0].length; j++) {
                        const raw = await result[0][j];
                        raw.image = await raw.image && raw.image.replace(/\s+/g, '%20');
                        const images = await result[1].filter(o => o.prizeBoardPrizeId === raw.prizeBoardPrizeId) || []
                        images.sort((a, b) => a.sequence - b.sequence)
                        const _images = []
                        images.forEach(async img => {
                            const _img = await img.image.split('/')
                            await _images.push(_img[_img.length - 1] && _img[_img.length - 1].replace(/\s+/g, '%20'));
                        })
                        result[0][j].images = await _images;
                    }

                    for (let k=0; k<result[2].length; k++) {
                        const raw = result[2][k];
                        const images = await result[2].filter(o => o.prizeBoardPrizeId === raw.prizeBoardPrizeId) || []
                        images.sort((a, b) => a.sequence - b.sequence)
                        const _images = []
                        images.forEach(async img => {
                            const _img = await img.image.split('/')
                            await _images.push(_img[_img.length - 1] && _img[_img.length - 1].replace(/\s+/g, '%20'))
                        })
                        raw.images = await _images;
                        raw.agreed = raw.agreed ? true : false
                        raw.claimed = raw.claimed ? true : false
                        raw.forRedeem = raw.forRedeem ? true : false
                    }

                    const prizeBoardPrizes = result[0] || []
                    const userPrizes = result[2] || []

                    return resolve({prizeBoardPrizes: prizeBoardPrizes, userPrizes: userPrizes})
                }
            })
        })
    }
}

module.exports = AppDbComponent;