const conn = require('../../DbConnection')
const logger = require('../../config/logger')
const db_queries = require('../../config/dbqueries')
const moment = require('moment-timezone')

const create = (args) => {
	return db_queries.createGame(args)
}

const update = (args) => {
	return db_queries.updateGame(args)
}

const read = (args) => {
    let games = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_games(?)', [args.sportType], (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve([])
                    }

                    if (result && result.length > 0) {

                        result[0].forEach(row => {
                            const game = games.filter(o => o.gameId === row.gameId)[0]
                            if (game) {

                                if (game.participants) {
                                    if (game.participants.findIndex(o => o.participantId === row.participantId) < 0) {
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

                                if (game.prePicks) {
                                    if (game.prePicks.findIndex(o => o.prePickId === row.prePickId) < 0) {
                                        game.prePicks.push({
                                            prePickId: row.prePickId,
                                            gameId: row.gameId,
                                            sequence: row.ppSequence,
                                            questionHeader: row.ppQuestionHeader,
                                            questionDetail: row.ppQuestionDetail,
                                            choiceType: row.ppChoiceType,
                                            choices: row.ppChoices,
                                            points: row.ppPoints,
                                            tokens: row.ppTokens,
                                            forParticipant: row.ppForParticipant,
                                            shortHand : row.ppShortHand,
                                            type: row.ppType,
                                            backgroundImage: row.ppBackgroundImage,
                                            info: row.ppInfo,
                                            sponsorId: row.ppSponsorId
                                        })
                                    }
                                } else {
                                    let prePicks = []
                                    prePicks.push({
                                        prePickId: row.prePickId,
                                        gameId: row.gameId,
                                        sequence: row.ppSequence,
                                        questionHeader: row.ppQuestionHeader,
                                        questionDetail: row.ppQuestionDetail,
                                        choiceType: row.ppChoiceType,
                                        choices: row.ppChoices,
                                        points: row.ppPoints,
                                        tokens: row.ppTokens,
                                        forParticipant: row.ppForParticipant,
                                        shortHand : row.ppShortHand,
                                        type: row.ppType,
                                        backgroundImage: row.ppBackgroundImage,
                                        info: row.ppInfo,
                                        sponsorId: row.ppSponsorId
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

                                let prePicks = []
                                prePicks.push({
                                    prePickId: row.prePickId,
                                    gameId: row.gameId,
                                    sequence: row.ppSequence,
                                    questionHeader: row.ppQuestionHeader,
                                    questionDetail: row.ppQuestionDetail,
                                    choiceType: row.ppChoiceType,
                                    choices: row.ppChoices,
                                    points: row.ppPoints,
                                    tokens: row.ppTokens,
                                    forParticipant: row.ppForParticipant,
                                    shortHand : row.ppShortHand,
                                    type: row.ppType,
                                    backgroundImage: row.ppBackgroundImage,
                                    info: row.ppInfo,
                                    sponsorId: row.ppSponsorId
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
                                    //dateStart: new Date(row.gameDateStart).toString(),
                                    //dateAnnounce: new Date(row.gameDateAnnounce).toString(),
                                    //datePrePicks: new Date(row.gameDatePrePicks).toString(),
                                    dateStart: moment(row.gameDateStart).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    dateAnnounce: moment(row.gameDateAnnounce).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    datePrePicks: moment(row.gameDatePrePicks).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    countryCode: row.gameCountryCode,
                                    stateCode: row.gameStateCode,
                                    stateName: row.gameStateName,
                                    city: row.gameCity,
                                    latlong: row.gameLatLong,
                                    stadium: row.gameStadium,
                                    participants: participants,
                                    prePicks: prePicks,
                                    dateStartSession: row.dateStartSession ? moment(row.dateStartSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                                    dateEndSession: row.dateEndSession ? moment(row.dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null
                                })
                            }
                        })
                    }

                    return resolve(games)
                })
            }
        })
    })
}

const readGameById = (args) => {
    let game = null
    let participants = []
    let prePicks = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_game_by_id(?)', [args.gameId], (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve([])
                    }

                    console.log('GameController line 193', moment(result[0][0].dateStartSession).utc(false).format('YYYY-MM-DD HH:mm:ss')  )

                    if (result && result.length > 0) {
                        game = {
                            gameId: result[0][0].gameId,
                            stage: result[0][0].gameStage,
                            sportType: result[0][0].gameSportType,
                            subSportGenre: result[0][0].gameSubSportGenre,
                            isLeap: result[0][0].gameIsLeap ? true : false,
                            leapType: result[0][0].gameLeapType,
                            videoFootageId: result[0][0].videoFootageId,
                            videoFootageName: result[0][0].videoFootageName,
                            videoFootagePath: result[0][0].videoFootagePath,
                            formattedTimeStart: result[0][0].formattedTimeStart,
                            timeStart: new Date(result[0][0].gameTimeStart).toString(),
                            dateStart: moment(result[0][0].gameDateStart).utc(false).format('YYYY-MM-DD 00:00:00'),
                            dateAnnounce: moment(result[0][0].gameDateAnnounce).utc(false).format('YYYY-MM-DD 00:00:00'),
                            datePrePicks: moment(result[0][0].gameDatePrePicks).utc(false).format('YYYY-MM-DD 00:00:00'),
                            countryCode: result[0][0].gameCountryCode,
                            stateCode: result[0][0].gameStateCode,
                            stateName: result[0][0].gameStateName,
                            city: result[0][0].gameCity,
                            latlong: result[0][0].gameLatLong,
                            stadium: result[0][0].gameStadium,
                            participants: [],
                            prePicks: [],
                            dateStartSession: result[0][0].dateStartSession ? moment(result[0][0].dateStartSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                            dateEndSession: result[0][0].dateEndSession ? moment(result[0][0].dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null
                        }

                        result[0].forEach(row => {

                            const participantExists = participants.filter(o => o.participantId === row.participantId)[0]
                            if (!participantExists) {
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
                            }

                            const ppExists = prePicks.filter(o => o.prePickId === row.prePickId)[0]
                            if (!ppExists) {
                                prePicks.push({
                                    prePickId: row.prePickId,
                                    gameId: row.gameId,
                                    sequence: row.ppSequence,
                                    questionHeader: row.ppQuestionHeader,
                                    questionDetail: row.ppQuestionDetail,
                                    choiceType: row.ppChoiceType,
                                    choices: row.ppChoices,
                                    points: row.ppPoints,
                                    tokens: row.ppTokens,
                                    forParticipant: row.ppForParticipant,
                                    shortHand : row.ppShortHand,
                                    type: row.ppType,
                                    backgroundImage: row.ppBackgroundImage,
                                    info: row.ppInfo,
                                    sponsorId: row.ppSponsorId
                                })
                            }

                        })

                        game.participants = participants
                        game.prePicks = prePicks
                    }

                    return resolve(game)
                })
            }
        })
    })
}

const deleteGame = (args) => {
    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(false)
            }
            if (db) {
                db.query('call sp_delete_game(?)', [args.gameId], (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve(false)
                    }

                    return resolve(true)
                })
            }

        })
    })
}

const updateLeap = (args) => {
    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(false)
            }
            if (db) {
                db.query('update affiliate set is_leap = ?, leap_type = ? where `code` = ?', [args.isLeap, args.leapType, args.gameId], (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve(false)
                    }
                    if (result.affectedRows) {
                        return resolve(true)
                    }

                    return resolve(false)
                })
            }
        })
    })
}

const readRecordedGames = () => {
    let games = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_recorded_games()', (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve([])
                    }

                    if (result && result.length > 0) {

                        result[0].forEach(row => {
                            const game = games.filter(o => o.gameId === row.gameId)[0]
                            if (game) {

                                if (game.participants) {
                                    if (game.participants.findIndex(o => o.participantId === row.participantId) < 0) {
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
                                    // dateStart: new Date(row.gameDateStart).toString(),
                                    // dateAnnounce: new Date(row.gameDateAnnounce).toString(),
                                    // datePrePicks: new Date(row.gameDatePrePicks).toString(),
                                    dateStart: moment(row.gameDateStart).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    dateAnnounce: moment(row.gameDateAnnounce).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    datePrePicks: moment(row.gameDatePrePicks).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    countryCode: row.gameCountryCode,
                                    stateCode: row.gameStateCode,
                                    stateName: row.gameStateName,
                                    city: row.gameCity,
                                    latlong: row.gameLatLong,
                                    stadium: row.gameStadium,
                                    participants: participants,
                                    prePicks: []

                                })
                            }
                        })
                    }

                    return resolve(games)
                })
            }
        })
    })
}

const readVideoFootages = () => {
    return new Promise(resolve => {
        conn.pool.query('select video_footage_id as videoFootageId, name as videoFootageName, path as videoFootagePath from game_video_footage', (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (result) {
                const _videos = []
                for (let i=0; i<result.length; i++) {
                    _videos.push({
                        videoFootageId: result[i].videoFootageId,
                        videoFootageName: result[i].videoFootageName,
                        videoFootagePath: result[i].videoFootagePath
                    })
                }
                return resolve(_videos)
            } else {
                return resolve([])
            }
        })
    })
}

const readGameEvents = (args) => {
    let games = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_games_for_admin(?,?)', [args.sportType, args.subSportGenre], (err, result) => {
                    db.release();
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve([])
                    }

                    if (result && result.length > 0) {

                        result[0].forEach(row => {
                            const game = games.filter(o => o.gameId === row.gameId)[0]
                            if (game) {

                                if (game.participants) {
                                    if (game.participants.findIndex(o => o.participantId === row.participantId) < 0) {
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

                                if (game.prePicks) {
                                    if (game.prePicks.findIndex(o => o.prePickId === row.prePickId) < 0) {
                                        game.prePicks.push({
                                            prePickId: row.prePickId,
                                            gameId: row.gameId,
                                            sequence: row.ppSequence,
                                            questionHeader: row.ppQuestionHeader,
                                            questionDetail: row.ppQuestionDetail,
                                            choiceType: row.ppChoiceType,
                                            choices: row.ppChoices,
                                            points: row.ppPoints,
                                            tokens: row.ppTokens,
                                            forParticipant: row.ppForParticipant,
                                            shortHand : row.ppShortHand,
                                            type: row.ppType,
                                            backgroundImage: row.ppBackgroundImage,
                                            info: row.ppInfo,
                                            sponsorId: row.ppSponsorId
                                        })
                                    }
                                } else {
                                    let prePicks = []
                                    prePicks.push({
                                        prePickId: row.prePickId,
                                        gameId: row.gameId,
                                        sequence: row.ppSequence,
                                        questionHeader: row.ppQuestionHeader,
                                        questionDetail: row.ppQuestionDetail,
                                        choiceType: row.ppChoiceType,
                                        choices: row.ppChoices,
                                        points: row.ppPoints,
                                        tokens: row.ppTokens,
                                        forParticipant: row.ppForParticipant,
                                        shortHand : row.ppShortHand,
                                        type: row.ppType,
                                        backgroundImage: row.ppBackgroundImage,
                                        info: row.ppInfo,
                                        sponsorId: row.ppSponsorId
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

                                let prePicks = []
                                prePicks.push({
                                    prePickId: row.prePickId,
                                    gameId: row.gameId,
                                    sequence: row.ppSequence,
                                    questionHeader: row.ppQuestionHeader,
                                    questionDetail: row.ppQuestionDetail,
                                    choiceType: row.ppChoiceType,
                                    choices: row.ppChoices,
                                    points: row.ppPoints,
                                    tokens: row.ppTokens,
                                    forParticipant: row.ppForParticipant,
                                    shortHand : row.ppShortHand,
                                    type: row.ppType,
                                    backgroundImage: row.ppBackgroundImage,
                                    info: row.ppInfo,
                                    sponsorId: row.ppSponsorId
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
                                    //dateStart: new Date(row.gameDateStart).toString(),
                                    //dateAnnounce: new Date(row.gameDateAnnounce).toString(),
                                    //datePrePicks: new Date(row.gameDatePrePicks).toString(),
                                    dateStart: moment(row.gameDateStart).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    dateAnnounce: moment(row.gameDateAnnounce).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    datePrePicks: moment(row.gameDatePrePicks).utc(false).format('YYYY-MM-DD 00:00:00'),
                                    countryCode: row.gameCountryCode,
                                    stateCode: row.gameStateCode,
                                    stateName: row.gameStateName,
                                    city: row.gameCity,
                                    latlong: row.gameLatLong,
                                    stadium: row.gameStadium,
                                    participants: participants,
                                    prePicks: prePicks,
                                    dateStartSession: row.dateStartSession ? moment(row.dateStartSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                                    dateEndSession: row.dateEndSession ? moment(row.dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null
                                })
                            }
                        })
                    }

                    return resolve(games)
                })
            }
        })
    })
}

module.exports = {
    create,
    update,
    read,
    readGameById,
    deleteGame,
    updateLeap,
    readRecordedGames,
    readVideoFootages,
    readGameEvents
}