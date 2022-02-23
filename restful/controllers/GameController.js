const conn = require('../../DbConnection');
const moment = require('moment-timezone')
const db_queries = require('../../config/dbqueries');
const logger = require('../../config/logger');
const { timestampToDate, lineNumber, dateTimeZone } = require('../../utilities/helper');
const ID = require('../../utilities/unique').ID;

const readGameEventInfo = (args) => {
    return new Promise((resolve, reject) => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `HOST SUBSCRIBE: ${err}`)
                return reject(err)
            }

            if (db) {
                db.query('call sp_read_game_event_info()', async (err, result) => {
                    db.release()
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
                                    _sportType.subSportGenres.push({name: raw.subSportGenreName, code: raw.subSportGenreCode, sequence: raw.subSportSequence})
                                }
                            } else {
                                if (raw.subSportGenreName) {
                                    _sportType.subSportGenres = [{name: raw.subSportGenreName, code: raw.subSportGenreCode, sequence: raw.subSportSequence}]
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
                                _sportType.subSportGenres.push({name: raw.subSportGenreName, code: raw.subSportGenreCode, sequence: raw.subSportSequence})
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
            }
        })
    })
}

const readGames = (args) => {
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

const readGameEvents = (args) => {
    let games = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_games_for_admin(?,?,?,?,?,?,?)', [args.sportType, args.subSportGenre, args.excludedGameId, args.stage, args.season, args.startDate, args.endDate], (err, result) => {
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
                                    dateEndSession: row.dateEndSession ? moment(row.dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                                    isFootageRecorded: row.isFootageRecorded,
                                    playCount: row.playCount
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
                            dateEndSession: result[0][0].dateEndSession ? moment(result[0][0].dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                            playCount: result[0][0].playCount || 0
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
                        game.sponsorPackages = result[1] || []
                    }

                    return resolve(game)
                })
            }
        })
    })
}

const createGame = (args) => {
    return db_queries.createGame(args)
}

const updateGame = (args) => {
    return db_queries.updateGame(args)
}

const deleteGame = (args) => {
    return new Promise(resolve => {
        conn.pool.query('call sp_delete_game(?)', [args.gameId], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(false)
            }

            return resolve(true)
        })
    })
}

const readGamePlaysByGameId = args => {
    return new Promise((resolve, reject) => {
        conn.pool.query('call sp_read_game_plays_by_game_id(?,?)', [args.gameId, null], async (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return reject(err)
            }
            if (result) {
                return resolve(result)
            } else {
                return resolve(null)
            }
        })
    })
}

const importPlaystackEXISTING = args => {
    return new Promise((resolve, reject) => {
        conn.pool.query('call sp_read_game_plays_by_game_id(?,?)', [args.source, args.destination], async (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return reject(err)
            }
            if (result) {
                const res = await importToDestination(args, result);
                return resolve(res)
            } else {
                return resolve(null)
            }
        })
    })
}

const importPlaystack = args => {
    return new Promise((resolve, reject) => {
        conn.pool.query('call sp_read_game_plays_by_game_id(?,?)', [args.source, args.destination], async (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return reject(err)
            }
            if (result) {

                const ctr =args.playsToImport.length - 1
                pickPlaysToImport(ctr)

                async function pickPlaysToImport(i) {
                    if (i >=0) {
                        const playToImport = args.playsToImport[i];

                        if (playToImport.checked === 0) {

                            for (let j=result[1].length-1; j>=0; j--) {
                                const playMul = result[1][j];
                                if (playMul.game_play_id === playToImport.game_play_id) {
                                    for (let k=result[2].length-1; k>=0; k--) {
                                        if (result[2][k].question_id === playMul.question_id) {
                                            result[2].splice(k, 1)
                                        }
                                    }

                                    result[1].splice(j, 1)
                                }
                            }

                            const playToRemoveIdx = await result[0].findIndex(o => o.game_play_id === playToImport.game_play_id)
                            if (playToRemoveIdx > -1) {
                                result[0].splice(playToRemoveIdx, 1)
                            }

                        }
                        pickPlaysToImport(i - 1)

                    } else {
                        const res = await importToDestination(args, result);
                        return resolve(res)
                    }
                }

            } else {
                return resolve(null)
            }
        })




    })
}


const readPrePickPresets = args => {
    return new Promise((resolve, reject) => {
        conn.pool.query('call sp_read_prepick_presets(?)', [args.sportTypeId], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return reject(err);
            }
            if (result && result[0]) {
                return resolve(result[0]);
            }

            return resolve(null);
        })
    })
}

const importToDestination = (args, result) => {
    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(null)
            }
            if (db) {
                db.beginTransaction(async err2 => {
                    if (err2) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err2)
                        db.release()
                        return resolve(null)
                    }

                    const PLAY = [...result[0]]
                    const PLAY_MULTIPLIER_CHOICES = [...result[2]];


                    createPlay(0)

                    async function createPlay(h) {
                        if (h < PLAY.length) {
                            const play = PLAY[h];
                            const newId = ID();
                            const newParticipant = await result[3].filter(o => o.sequence === play.participant_sequence)[0]

                            if ('announce' === play.type.toLowerCase()) {
                                db.query('call sp_create_game_play_announce(?,?,?,?,?,?,?,?,?,?)',
                                    [
                                        args.destination,
                                        newId,
                                        play.type,
                                        play.sponsor_id,
                                        play.announce_header,
                                        play.announce_middle,
                                        play.announce_bottom,
                                        0,
                                        0,
                                        dateTimeZone(new Date())
                                    ], (errAnnounce, resultAnnounce) => {
                                        if (errAnnounce) {
                                            db.rollback(() => {})
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errAnnounce)
                                            return resolve(null)
                                        }

                                        console.log('imported announce play added:' + newId)
                                        createPlay(h + 1)
                                    })
                            } else {

                                db.query('call sp_create_game_play(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                                    [
                                        args.destination,
                                        newId,
                                        play.parent_question,
                                        newParticipant.participant_id || 0,
                                        play.type,
                                        play.award,
                                        play.sponsor_id,
                                        play.preset_id,
                                        play.is_preset_teamchoice,
                                        play.locked_reuse,
                                        play.points,
                                        play.tokens,
                                        play.stars,
                                        play.star_max,
                                        0,
                                        0,
                                        0,
                                        dateTimeZone(new Date())
                                    ], async (errPlay, resultPlay) => {
                                        if (errPlay) {
                                            db.rollback(() => {})
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errPlay)
                                            return resolve(null)
                                        }

                                        if (resultPlay && resultPlay[0]) {
                                            const generatedId = resultPlay[0][0].insertId

                                            const _playMuls = await result[1].filter(o => o.game_play_id === play.game_play_id);
                                            const _newPlayMuls = []
                                            if (_playMuls && Array.isArray(_playMuls)) {
                                                for (let i=0; i<_playMuls.length; i++) {
                                                    const pMul = _playMuls[i];
                                                    const newMulId = pMul.preset !== 'multiplier' ? newId : ID();
                                                    _newPlayMuls.push([
                                                        generatedId,
                                                        newMulId,
                                                        0,
                                                        pMul.preset,
                                                        pMul.question,
                                                        pMul.type
                                                    ])

                                                    const _choices = await PLAY_MULTIPLIER_CHOICES.filter(o => o.question_id === pMul.question_id)
                                                    if (_choices && Array.isArray(_choices)) {
                                                        for (let j=0; j<_choices.length; j++) {
                                                            _choices[j].question_id = newMulId
                                                        }
                                                    }
                                                }
                                            }

                                            db.query('insert into game_play_multiplier(game_play_id, question_id, locked, preset, question, `type`) values ?',
                                                [_newPlayMuls], async (errPlayMul, resultPlayMul) => {
                                                    if (errPlayMul) {
                                                        db.rollback(() => {})
                                                        db.release()
                                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errPlayMul)
                                                        return resolve(null)
                                                    }
                                                })

                                            console.log('imported play added:' + newId)
                                            createPlay(h + 1)
                                        }
                                    })
                            }

                        } else {
                            const res = await createMultiplierChoices();
                            return resolve(res)
                        }
                    }

                    function createMultiplierChoices() {
                        return new Promise(async resolve => {
                            const _newPlayMulChoices = []
                            for (let k=0; k<PLAY_MULTIPLIER_CHOICES.length; k++) {
                                const pMulChoices = PLAY_MULTIPLIER_CHOICES[k];
                                let insertNextPlayId = null
                                if (pMulChoices.next_play_id) {
                                    const p = await result[2].filter(o => o.original_question_id === pMulChoices.next_play_id)[0]
                                    if (p) {
                                        insertNextPlayId = p.question_id
                                    }
                                }
                                _newPlayMulChoices.push([
                                    pMulChoices.question_id,
                                    pMulChoices.value,
                                    insertNextPlayId,
                                    pMulChoices.sequence
                                ])
                            }

                            if (_newPlayMulChoices.length > 0) {
                                db.query('insert into game_play_multiplier_choice(question_id, value, next_play_id, sequence) values ?',
                                    [_newPlayMulChoices],
                                    (errMulChoices, resultMulChoices) => {
                                        if (errMulChoices) {
                                            db.rollback(() => {})
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errMulChoices)
                                            return resolve(null)
                                        }

                                        db.commit((errPlayCommit) => {
                                            if (errPlayCommit) {
                                                db.rollback(() => {})
                                                db.release()
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errPlayCommit)
                                                return resolve(null)
                                            }
                                            db.release()
                                            return resolve({playCount: PLAY.length})
                                        })
                                    })
                            } else {
                                db.commit((errPlayCommit) => {
                                    if (errPlayCommit) {
                                        db.rollback(() => {})
                                        db.release()
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errPlayCommit)
                                        return resolve(null)
                                    }
                                    db.release()
                                    return resolve({playCount: PLAY.length})
                                })
                            }
                        })
                    }

                })

            }
        });
    })

}

const readSponsorsBySportType = args => {
    return new Promise(resolve => {
        conn.pool.query('call sp_read_sponsors_by_sport_type(?)', [args.sportTypeId], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(null)
            }

            return resolve(result[0] || [])
        })
    })
}

const readVideoFootages = (args) => {
    return new Promise(resolve => {
        conn.pool.query('call sp_read_game_video_footages()', (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (result && result[0]) {
                return resolve(result[0])
            } else {
                return resolve([])
            }
        })
    })
}

const readImportFilterArgs = (args) => {
    return new Promise(resolve => {
        conn.pool.query('call sp_read_import_filter_args(?,?)', [args.sportType, args.subSportGenre], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }

            return resolve(result);
        })
    })
}

const readGameEventsForImport = (args) => {
    let games = []

    return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve([])
            }
            if (db) {
                db.query('call sp_read_games_for_admin(?,?,?)', [args.sportType, args.subSportGenre, args.excludedGameId], (err, result) => {
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
                                    dateEndSession: row.dateEndSession ? moment(row.dateEndSession).utc(false).format('YYYY-MM-DD HH:mm:ss') : null,
                                    isFootageRecorded: row.isFootageRecorded,
                                    playCount: row.playCount
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
    readGameEventInfo,
    readGames,
    readGameEvents,
    readGameById,
    createGame,
    updateGame,
    deleteGame,
    readGamePlaysByGameId,
    importPlaystack,
    readPrePickPresets,
    readSponsorsBySportType,
    readVideoFootages,
    readImportFilterArgs,
    readGameEventsForImport
}

