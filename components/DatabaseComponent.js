const conn = require('../DbConnection')
const ID = require('../utilities/unique').ID
const logger = require('../config/logger')
const { timestampToDate, dateTimeZone } = require('../utilities/helper')
const CryptoJS = require('crypto-js')
const db_queries = require('../config/dbqueries')
const AnalyticsComponent = require('./AnalyticsComponent');

class DatabaseComponent {
    constructor(environment) {
        this.environment = environment;
        this.Progress = ''
    }

    setHostChannel(channel) {
        this.hostChannel = channel
    }

    updateCache(key, attr, value) {
        conn.redisClient.hget(key, attr, (err, obj) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return
            }

            conn.redisClient.hset(key, attr, value)
        })

    }

    readGameInfo(args, isHost) {
        return new Promise((resolve, reject) => {

            const permissionDesc = args.isViewRecordedEvent ? 'call sp_automation_read_game_info(?)' : 'call sp_read_game_info(?)'

            conn.pool.query(permissionDesc, [args.gameId], async (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (!result || !result[0] || result[0].length < 1) {
                    return reject('Record not found')
                } else if (result.length > 1) {
                    const participants = []
                    for (let i = 0; i < result[1].length; i++) {
                        const p = result[1][i]
                        participants.push({
                            id: p.id,
                            sequence: p.sequence,
                            name: p.name,
                            initial: p.initial,
                            topColor: p.top_color,
                            bottomColor: p.bottom_color,
                            score: p.score
                        })
                    }

                    const presets = []
                    for (let j = 0; j < result[2].length; j++) {
                        const raw = result[2][j]
                        let preset = await presets.filter(o => o.id === raw.game_preset_id)[0]
                        if (preset) {
                            preset.values.push(raw.choice)
                        } else {
                            preset = {
                                id: raw.game_preset_id,
                                name: raw.name,
                                type: raw.type,
                                question: raw.question,
                                values: []
                            }
                            preset.values.push(raw.choice)
                            presets.push(preset)
                        }
                    }

                    const baseOptions = []
                    for (let k = 0; k < result[3].length; k++) {
                        const raw = result[3][k]
                        let baseOption = await baseOptions.filter(o => o.id === raw.game_base_option_id)[0]
                        if (baseOption) {
                            baseOption.values.push(raw.choice)
                        } else {
                            baseOption = {
                                id: raw.game_base_option_id,
                                choice: raw.base_choice,
                                question: raw.question,
                                values: []
                            }
                            baseOption.values.push(raw.choice)
                            baseOptions.push(baseOption)
                        }
                    }

                    const timePeriods = []
                    for (let l = 0; l < result[4].length; l++) {
                        const raw = result[4][l]
                        timePeriods.push({
                            name: raw.name,
                            type: raw.type,
                            header: raw.header,
                            middle: raw.middle,
                            bottom: raw.bottom
                        })

                    }

                    const interruptionPeriods = []
                    for (let m = 0; m < result[5].length; m++) {
                        const raw = result[5][m]
                        interruptionPeriods.push({
                            name: raw.name,
                            type: raw.type,
                            header: raw.header,
                            middle: raw.middle,
                            bottom: raw.bottom
                        })

                    }

                    const sportTypes = []
                    if (result[13]) {
                        for (let i=0; i<result[13].length; i++) {
                            const raw = result[13][i];
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
                    }

                    const plays = []
                    if (isHost) {
                        for (let n = 0; n < result[6].length; n++) {
                            const raw = result[6][n]
                            let play = await plays.filter(o => o.id === raw.parent_question_id)[0]
                            if (play) {
                                let _multiChoice = await play.multiplierChoices.filter(o => o.id === raw.multi_question_id)[0]
                                if (_multiChoice) {
                                    await _multiChoice.choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                } else {
                                    let _choices = []
                                    await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                    await play.multiplierChoices.push({
                                        id: raw.multi_question_id,
                                        preset: raw.multi_preset,
                                        question: raw.multi_question,
                                        choices: _choices,
                                        type: raw.multi_type,
                                        locked: raw.multi_locked
                                    })
                                }

                                if (raw.date_ended) {
                                    if (play.result) {
                                        if (play.result.correctAnswers) {
                                            if (raw.choice_is_correct_answer) {
                                                play.result.resultTitle += (play.result.resultTitle ? ', ' + raw.choice_value : raw.choice_value)
                                                play.result.correctAnswers.push({
                                                    id: raw.multi_question_id,
                                                    correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                                })
                                            }
                                        }

                                    }



                                }

                            } else {
                                const _announcements = []
                                if ('announce' === raw.type.toLowerCase()) {
                                    _announcements.push({area: 'header', value: raw.announce_header})
                                    _announcements.push({area: 'middle', value: raw.announce_middle})
                                    _announcements.push({area: 'bottom', value: raw.announce_bottom})
                                }
                                play = {
                                    gameId: raw.game_id,
                                    id: raw.parent_question_id,
                                    playTitle: raw.parent_question,
                                    participantId: raw.participant_id,
                                    type: raw.type,
                                    award: raw.award,
                                    sponsorId: raw.sponsor_id,
                                    presetId: raw.preset_id,
                                    isPresetTeamChoice: raw.is_preset_teamchoice ? true : false,
                                    lockedReuse: raw.locked_reuse ? true : false,
                                    points: raw.points,
                                    tokens: raw.tokens,
                                    stars: raw.stars,
                                    starMax: raw.star_max,
                                    inProcess: raw.in_process ? true : false,
                                    current: raw.current ? true : false,
                                    resultConfirmed: raw.result_confirmed ? true : false,
                                    // started: raw.date_started ? new Date(raw.date_started).getTime() : null,
                                    // ended: raw.date_ended ? new Date(raw.date_ended).getTime() : null,
                                    started: raw.date_started || null, //--analytics
                                    ended: raw.date_ended || null, //--analytics
                                    multiplierChoices: [],
                                    result: {},
                                    announcements: _announcements,
                                    gamePlayId: raw.game_play_id,
                                    sequence: raw.sequence,
                                }

                                let _choices = []
                                await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                await play.multiplierChoices.push({
                                    id: raw.multi_question_id,
                                    preset: raw.multi_preset,
                                    question: raw.multi_question,
                                    choices: _choices,
                                    type: raw.multi_type,
                                    locked: raw.multi_locked
                                })

                                if (raw.date_ended) {
                                    play.result = {
                                        id: raw.multi_question_id,
                                        type: raw.multi_type,
                                        resultTitle: raw.choice_is_correct_answer ? raw.choice_value : '',
                                        correctAnswers: []
                                    }
                                    if (raw.choice_is_correct_answer) {
                                        play.result.correctAnswers.push({
                                            id: raw.multi_question_id,
                                            correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                        })
                                    }
                                }

                                await plays.unshift(play)
                            }
                        }

                    }

                    if (isHost) {
                        return resolve({
                            progress: result[0][0].progress,
                            dateEndSession: result[0][0].date_end_session,
                            participants: participants,
                            presets: presets,
                            baseOptions: baseOptions,
                            timePeriods: timePeriods,
                            interruptionPeriods: interruptionPeriods,
                            plays: plays,
                            venue: result[7][0],
                            prePicks: result[8],
                            recordedPlays: result[9] || [],
                            leapType: result[0][0].leap_type,
                            lastSessionTime: result[0][0].last_session_time || 0,
                            lastSequence: result[0][0].last_sequence || 0,
                            originalPlays: result[10] || [],
                            HCommLastHeaderSequence: result[0][0].hcomm_last_header_sequence,
                            HCommLastPlaySequence: result[0][0].hcomm_last_play_sequence,
                            HCommLastWait: result[0][0].hcomm_last_wait,
                            videoName: result[0][0].video_name,
                            videoPath: result[0][0].video_path,
                            recordedPlayCount: result[0][0].recorded_play_count,
                            sponsorPackages: result[11] || [],
                            automationPlays: result[12] || [],
                            sportTypes: sportTypes,
                            isFootageRecorded: result[0][0].is_footage_recorded
                        });
                    } else {
                        return resolve({
                            progress: result[0][0].progress,
                            dateEndSession: result[0][0].date_end_session,
                            participants: participants,
                            presets: presets,
                            baseOptions: baseOptions,
                            timePeriods: timePeriods,
                            interruptionPeriods: interruptionPeriods,
                            venue: result[7][0],
                            leapType: result[0][0].leap_type,
                            videoName: result[0][0].video_name,
                            videoPath: result[0][0].video_path
                        });
                    }
                }
            })
        })
    }

    pullPlays(gameId) {
        return new Promise(resolve => {

            conn.redisClient.hget('g'+gameId, 'plays', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                if (obj) {
                    return resolve({gameId: gameId, plays: JSON.parse(obj)})
                } else {
                    return resolve(null)
                }
            })
        })
    }

    assignIdToMultiplierChoices(multiplierChoices) {

        for (let i=0; i<multiplierChoices.length; i++) {
            let choices = multiplierChoices[i]
            if (i === 0) {
                choices.id = ID()
            }

            for (let j=0; j<choices.choices.length; j++) {
                let choice = choices.choices[j]
                if (choice.nextId) {
                    let choiceToChangeId = multiplierChoices.filter(o => o.id === choice.nextId)[0]
                    if (choiceToChangeId) {
                        const newId = ID()
                        choice.nextId = newId
                        choiceToChangeId.id = newId
                    }
                }
            }
        }

        return multiplierChoices
    }


    addPlay(play) {
        return new Promise(async resolve => {
            if ('automation' === play.executionType && play.id) {
                /**
                 * AUTOMATION
                 */
                const _isAutomationPlayExists = await conn.redisClient.hget('g'+play.gameId, 'automationPlays', async (errAPlay, objAPlay) => {
                    if (errAPlay) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errAPlay)
                        return false;
                    }
                    if (objAPlay) {
                        const aPlays = JSON.parse(objAPlay)
                        if (aPlays && Array.isArray(aPlays) && aPlays.length > 0) {
                            const exists = await aPlays.filter(o => o.parent_question_id === play.id)[0]
                            if (exists) {
                                return true;
                            }
                        }
                    }
                    return false;
                })

                const rawPlays = await new Promise(res => {
                    conn.redisClient.hget('g' + play.gameId, 'originalPlays', async (err1, obj1) => {
                        if (obj1) {
                            return res(JSON.parse(obj1))
                        }
                        return res([])
                    })
                })
                AnalyticsComponent.extractOriginalGamePlay(rawPlays).then(async extractedPlays => {
                    if (extractedPlays) {
                        const _originalPlay = await extractedPlays.filter(o => o.id === play.id)[0]
                        if (_originalPlay) {
                            if ('announce' === (play.type || '').toLowerCase()) {
                                _originalPlay.index = play.id
                            }
                            _originalPlay.inProcess = false
                            _originalPlay.current = false
                            _originalPlay.resultConfirmed = false
                            _originalPlay.started = null
                            _originalPlay.ended = null
                            _originalPlay.result = {comment: '', correctValue: -1}
                            _originalPlay.sponsor = play.sponsor
                            _originalPlay.sponsorId = play.sponsorId
                            _originalPlay.stars = play.stars

                            conn.redisClient.hget('g' + play.gameId, 'plays', async (err, obj) => {
                                if (err) {
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    return resolve(null);
                                }

                                let _playStack = []
                                if (obj) {
                                    _playStack = await JSON.parse(obj)
                                    if (!_isAutomationPlayExists) {await _playStack.unshift(_originalPlay)}
                                } else {
                                    if (!_isAutomationPlayExists) {await _playStack.unshift(_originalPlay)}
                                }

                                conn.redisClient.hset('g' + _originalPlay.gameId, 'plays', JSON.stringify(_playStack), () => {
                                    this.insertPlayDuringAutomation(play)
                                })

                                const response = {gameId: _originalPlay.gameId, plays: _playStack}
                                return resolve(response)

                            })

                        } else {
                            return resolve(null)
                        }
                    }


                })
                /**
                 * END AUTOMATION
                 */
            } else {
                /**
                 * NORMAL GAME
                 */
                if ('announce' === (play.type || '').toLowerCase()) {
                    const newId = ID()
                    play.id = newId
                    play.index = newId
                } else {
                    const newMultiplierChoices = this.assignIdToMultiplierChoices(play.multiplierChoices)
                    play.id = newMultiplierChoices[0].id
                    play.multiplierChoices = newMultiplierChoices
                    play.inProcess = false
                    play.current = false
                    play.resultConfirmed = false
                    play.started = null
                    play.ended = null
                    play.result = {comment: '', correctValue: -1}
                }
///////////////////////////////////////////////////////
                const generatedId = await this.addPlayDB(play);
                if (generatedId) {
                    conn.redisClient.hget('g' + play.gameId, 'plays', (err, obj) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return resolve(null);
                        }

                        let _playStack = []
                        if (obj) {
                            _playStack = JSON.parse(obj)
                            play.gamePlayId = generatedId;
                            play.sequence = _playStack.length;
                            _playStack.unshift(play)
                        } else {
                            play.gamePlayId = generatedId;
                            play.sequence = 1;
                            _playStack.unshift(play)
                        }

                        conn.redisClient.hset('g' + play.gameId, 'plays', JSON.stringify(_playStack), () => {
                            //TODO SAVE TO DB

                            /**
                             * DURING RECORDING TO BE USED FOR AUTOMATION
                             */
                            if ('recording' === play.executionType && play.recordedAutomation) {
                                play.recordedAutomation.playId = play.id
                                this.insertRecordedAutomation(play)
                            }
                        })

                        return resolve({gameId: play.gameId, plays: _playStack})
                    })
                } else {
                    return resolve(null)
                }

                ///////////////////////////////////////////////////////

            }
        })

    }

    updatePlay(play) {
        return new Promise(resolve => {

            conn.redisClient.hget('g'+play.gameId, 'plays', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    _playStack = JSON.parse(obj)
                    let idxToUpdate = _playStack.findIndex(o => o.id === play.id)
                    if (idxToUpdate > -1) {
                        _playStack[idxToUpdate] = play

                        conn.redisClient.hset('g'+play.gameId, 'plays', JSON.stringify(_playStack), () => {
                            //TODO UPDATE DB
                            this.updatePlayDB([play])

                        })

                        resolve({gameId: play.gameId, plays: _playStack})
                    }
                } else {
                    resolve(null)
                }
            })
        })
    }

    playStackUpdate(args) {
        return new Promise(resolve => {

            conn.redisClient.hget('g'+args.gameId, 'plays', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    _playStack = JSON.parse(obj)
                    for (let i=0; i<args.plays.length; i++) {
                        const play = args.plays[i];
                        const idxToUpdate = _playStack.findIndex(o => o.id === play.id)
                        if (idxToUpdate > -1) {
                            _playStack[idxToUpdate].participantId = await play.participantId
                            await conn.redisClient.hset('g'+play.gameId, 'plays', JSON.stringify(_playStack))
                            //TODO UPDATE DB
                            this.playStackUpdateDB([play])
                            resolve({gameId: play.gameId, plays: _playStack})
                        }
                    }
                } else {
                    resolve(null)
                }
            })
        })
    }

    removePlay(params) {
        return new Promise(resolve => {

            conn.redisClient.hget('g'+params.gameId, 'plays', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    _playStack = JSON.parse(obj)
                    let idxToUpdate = _playStack.findIndex(o => o.id === params.id)
                    if (idxToUpdate > -1) {
                        _playStack.splice(idxToUpdate, 1)

                        conn.redisClient.hset('g'+params.gameId, 'plays', JSON.stringify(_playStack), () => {
                            //TODO UPDATE DB
                            this.removePlayDB(params)
                        })

                        resolve({gameId: params.gameId, plays: _playStack})
                    }
                } else {
                    resolve(null)
                }
            })
        })
    }

    gameStart(args) {
        return new Promise(resolve => {
            if ('recording, automation'.match(args.executionType)) {
                /**
                 * AUTOMATION GAME
                 */
                conn.pool.query('call sp_automation_reset_appuser_game_play(?)', [args.gameId], (errReset, resultReset) => {
                    if (errReset) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errReset)
                        return resolve(null);
                    } else {
                        conn.redisClient.hgetall('g'+args.gameId, (err, obj) => {
                            if (err) {
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                return resolve(null);
                            }

                            if (obj) {
                                this.Progress = 'live'

                                const Info = {
                                    gameId: obj.gameId,
                                    progress: this.Progress,
                                    progressStates: JSON.parse(obj.progressStates),
                                    participants: JSON.parse(obj.participants),
                                    preset: JSON.parse(obj.preset),
                                    baseOptions: JSON.parse(obj.baseOptions),
                                    //defaults: JSON.parse(obj.defaults),
                                    timePeriods: JSON.parse(obj.timePeriods),
                                    interruptionPeriods: JSON.parse(obj.interruptionPeriods),
                                    venue: JSON.parse(obj.venue),
                                    resetPlayHistory: true,
                                    recordedPlays: JSON.parse(obj.recordedPlays),
                                    sportTypes: JSON.parse(obj.sportTypes),
                                    sponsorPackages: JSON.parse(obj.sponsorPackages)
                                }

                                conn.redisClient.hset('g'+args.gameId, 'progress', this.Progress, () => {
                                    //TODO UPDATE DB
                                    this.updateProgressDB({gameId: args.gameId, progress: this.Progress})
                                })

                                return resolve(Info)
                            } else {
                                return resolve(null)
                            }
                        })
                    }
                })

            } else {
                /**
                 * NORMAL GAME
                 */
                conn.redisClient.hgetall('g'+args.gameId, (err, obj) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve(null);
                    }

                    if (obj) {
                        this.Progress = 'live'

                        const Info = {
                            gameId: obj.gameId,
                            progress: this.Progress,
                            progressStates: JSON.parse(obj.progressStates),
                            participants: JSON.parse(obj.participants),
                            preset: JSON.parse(obj.preset),
                            baseOptions: JSON.parse(obj.baseOptions),
                            //defaults: JSON.parse(obj.defaults),
                            timePeriods: JSON.parse(obj.timePeriods),
                            interruptionPeriods: JSON.parse(obj.interruptionPeriods),
                            venue: JSON.parse(obj.venue),
                            sportTypes: JSON.parse(obj.sportTypes),
                            sponsorPackages: JSON.parse(obj.sponsorPackages)
                        }

                        conn.redisClient.hset('g'+args.gameId, 'progress', this.Progress, () => {
                            //TODO UPDATE DB
                            this.updateProgressDB({gameId: args.gameId, progress: this.Progress})
                        })

                        return resolve(Info)
                    } else {
                        return resolve(null)
                    }
                })
            }
        })
    }

    goPlay(play) {
        return new Promise(async resolve => {

            if ('automation' === play.executionType && play.isNew) {
                /**
                 * AUTOMATION PLAY
                 */
                delete play.isNew
                const rawPlays = await new Promise(res => {
                    conn.redisClient.hget('g'+play.gameId, 'originalPlays', async(err1, obj1) => {
                        if (obj1) {
                            return res(JSON.parse(obj1))
                        }
                        return res([])
                    })
                })
                AnalyticsComponent.extractOriginalGamePlay(rawPlays).then(async extractedPlays => {
                    if (extractedPlays) {
                        const _originalPlay = await extractedPlays.filter(o => o.id === play.id)[0]
                        if (_originalPlay) {
                            if ('announce' === (play.type || '').toLowerCase()) {
                                _originalPlay.index = play.id
                            } else {
                                _originalPlay.result = {comment: '', correctValue: -1}
                            }
                            _originalPlay.inProcess = false
                            _originalPlay.current = false
                            _originalPlay.resultConfirmed = false

                            conn.redisClient.hget('g' + play.gameId, 'plays', async (err, obj) => {
                                if (err) {
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    return resolve(null);
                                }

                                if (obj) {
                                    const _playStack = await JSON.parse(obj)
                                    const _isAutomationPlayExists = await conn.redisClient.hget('g'+play.gameId, 'automationPlays', async (errAPlay, objAPlay) => {
                                        if (errAPlay) {
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errAPlay)
                                            return false;
                                        }
                                        if (objAPlay) {
                                            const aPlays = JSON.parse(objAPlay)
                                            if (aPlays && Array.isArray(aPlays) && aPlays.length > 0) {
                                                const exists = await aPlays.filter(o => o.parent_question_id === play.id)[0]
                                                if (exists) {
                                                    return true;
                                                }
                                            }
                                        }
                                        return false;
                                    })

                                    if (!_isAutomationPlayExists) {await _playStack.unshift(_originalPlay)}

                                    let currentPlay = await _playStack.filter(o => o.current && o.inProcess)[0]
                                    if (currentPlay) {
                                        currentPlay.inProcess = ('announce'=== currentPlay.type.toLowerCase() ? false : true)
                                        currentPlay.current = false
                                        currentPlay.resultConfirmed = ('announce'=== currentPlay.type.toLowerCase() ? true : false)
                                        currentPlay.ended = dateTimeZone(new Date()) //--analytics
                                        const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                                        if (_videoFootage) {
                                            currentPlay.footageEnd = _videoFootage.currentTime
                                        }
                                    }

                                    const playToGo = await _playStack.filter(o => o.id === play.id)[0]
                                    if (playToGo) {
                                        playToGo.inProcess = true
                                        playToGo.current = true
                                        playToGo.resultConfirmed = false
                                        playToGo.started = dateTimeZone(new Date()) //--analytics
                                        playToGo.ended = null
                                        const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                                        if (_videoFootage) {
                                            playToGo.footageStart = _videoFootage.currentTime
                                        }
                                    }

                                    conn.redisClient.hset('g' + play.gameId, 'plays', JSON.stringify(_playStack), () => {
                                        //TODO SAVE/UPDATE DB
                                        this.updatePlayDB([playToGo, currentPlay])
                                        //-----this.insertPlayDuringAutomation(play)
                                    })

                                    const result = {
                                        game: {gameId: play.gameId, plays: _playStack},
                                        current: playToGo || play,
                                        previous: currentPlay
                                    }
                                    return resolve(result)

                                } else {
                                    return resolve(null)
                                }
                            })
                        }
                    } else {
                        return resolve(null)
                    }
                });

            } else {
                /**
                 * NORMAL PLAY
                 */
                conn.redisClient.hget('g' + play.gameId, 'plays', async (err, obj) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve(null);
                    }

                    let _playStack = []
                    if (obj) {
                        _playStack = JSON.parse(obj)

                        //IF PLAY CAME FROM ASSEMBLY PANEL.
                        if (!play.id) {
                            const newId = ID()
                            play.id = newId
                            play.index = newId
                            play.isNew = true
                            _playStack.unshift(play)
                        } else {
                            // if ('automation' === play.executionType) {
                            //     delete play.isNew
                            //     this.insertPlayDuringAutomation(play);
                            //     _playStack.unshift(play)
                            // }
                        }

                        let currentPlay = await _playStack.filter(o => o.current && o.inProcess)[0]
                        if (currentPlay) {
                            currentPlay.inProcess = ('announce'=== currentPlay.type.toLowerCase() ? false : true)
                            currentPlay.current = false
                            currentPlay.resultConfirmed = ('announce'=== currentPlay.type.toLowerCase() ? true : false)
                            currentPlay.ended = dateTimeZone(new Date()) //--analytics
                            const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                            if (_videoFootage) {
                                currentPlay.footageEnd = _videoFootage.currentTime
                            }
                        }

                        const playToGo = await _playStack.filter(o => o.id === play.id)[0]
                        let _playToGo = null
                        if (playToGo) {
                            playToGo.inProcess = true
                            playToGo.current = true
                            //playToGo.started = new Date().getTime()
                            playToGo.started = dateTimeZone(new Date()) //--analytics
                            const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                            if (_videoFootage) {
                                playToGo.footageStart = _videoFootage.currentTime
                            }

                            _playToGo = JSON.parse(JSON.stringify(playToGo))
                            delete playToGo.isNew
                        }

                        conn.redisClient.hset('g' + play.gameId, 'plays', JSON.stringify(_playStack), () => {
                            //TODO SAVE/UPDATE DB

                            this.updatePlayDB([_playToGo, currentPlay])

                            /**
                             * DURING RECORDING TO BE USED FOR AUTOMATION
                             */
                            if ('recording' === play.executionType && play.recordedAutomation) {
                                play.recordedAutomation.playId = play.id
                                this.insertRecordedAutomation(play)
                            }
                        })


                        const result = {
                            game: {gameId: play.gameId, plays: _playStack},
                            current: playToGo || play,
                            previous: currentPlay
                        }
                        return resolve(result)

                    } else {
                        return resolve(null)
                    }
                })
            }


        })
    }

    resolvePlay(play) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+play.gameId, 'plays', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    let _editorEvents  = null
                    if (play.editorEvents) {
                        _editorEvents = await JSON.parse(JSON.stringify(play.editorEvents))
                        delete play.editorEvents
                    }


                    _playStack = JSON.parse(obj)

                    const playToResolve =  await _playStack.filter(o => o.id === play.id && !o.current && o.inProcess && !o.resultConfirmed)[0]
                    if (playToResolve) {
                        playToResolve.inProcess = false
                        playToResolve.resultConfirmed = true
                        //playToResolve.ended = new Date().getTime()
                        //playToResolve.ended = dateTimeZone(new Date()) //--analytics
                        playToResolve.result = play.result
                        playToResolve.executionType = play.executionType

                        play.result.points = playToResolve.points
                        play.result.tokens = playToResolve.tokens
                        play.result.stars = playToResolve.stars
                        play.result.starMax = playToResolve.starMax
                        play.result.started = playToResolve.started
                        play.result.ended = playToResolve.ended

                        AnalyticsComponent.emit('event.play.resolve', play.result);
                    }

                    conn.redisClient.hset('g'+play.gameId, 'plays', JSON.stringify(_playStack), () => {
                        //TODO UPDATE DB
                        this.resolvePlayDB(playToResolve)

                        //-- RELLY AUTOMATION
                        if ('recording' === play.executionType) {
                            this.insertRecordedAutomationResolved({gameId: play.gameId, playId: play.id, editorEvents: _editorEvents})
                        }
                    })

                    const result = { game: {gameId: play.gameId, plays: _playStack}, resolved: playToResolve }
                    resolve(result)
                } else {
                    resolve(null)
                }
            })
        })
    }

    endCurrentPlay(play) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+play.gameId, 'plays', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    let _editorEvents = null
                    if (play.editorEvents) {
                        _editorEvents = await JSON.parse(JSON.stringify(play.editorEvents))
                        delete play.editorEvents
                    }

                    _playStack = JSON.parse(obj)
                    const playToEnd = _playStack.filter(o => o.id === play.id && o.current && o.inProcess)[0]
                    if (playToEnd) {
                        playToEnd.inProcess = false
                        playToEnd.current = false
                        playToEnd.resultConfirmed = true
                        //playToEnd.ended = new Date().getTime()
                        playToEnd.ended = dateTimeZone(new Date()) //--analytics
                        playToEnd.result = play.result
                        delete playToEnd.isNew

                        if (play.result && play.result.points) {
                            play.result.points = playToEnd.points || 0
                        }
                        if (play.result && play.result.tokens) {
                            play.result.tokens = playToEnd.tokens || 0
                        }
                        if (play.result && play.result.stars) {
                            play.result.stars = playToEnd.stars || 0
                        }
                        if (play.result && play.result.starMax) {
                            play.result.starMax = playToEnd.starMax
                        }
                        if (play.result && play.result.started) {
                            play.result.started = playToEnd.started
                        }
                        if (play.result && play.result.ended) {
                            play.result.ended = playToEnd.ended
                        }
                        const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                        if (_videoFootage) {
                            play.footageEnd = _videoFootage.currentTime
                            playToEnd.footageEnd = _videoFootage.currentTime
                            playToEnd.footageQuickResolved = _videoFootage.currentTime
                        }

                        AnalyticsComponent.emit('event.play.resolve', play.result);
                    }

                    const playToGo = _playStack.filter(o => o.id === play.nextId && !o.current && !o.inProcess)[0]
                    if (playToGo) {
                        playToGo.inProcess = true
                        playToGo.current = true
                        //playToGo.started = new Date().getTime()
                        playToGo.started = dateTimeZone(new Date()) //--analytics
                        const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                        if (_videoFootage) {
                            playToGo.footageStart = _videoFootage.currentTime
                        }
                    }

                    conn.redisClient.hset('g'+play.gameId, 'plays', JSON.stringify(_playStack), () => {
                        //TODO UPDATE DB
                        this.updatePlayDB([playToGo, playToEnd])
                        this.resolvePlayDB(playToEnd)

                        //-- RELLY AUTOMATION
                        if ('recording' === play.executionType) {
                            this.insertRecordedAutomationResolved({gameId: play.gameId, playId: play.id, editorEvents: _editorEvents})
                        }
/*
                        /!**
                         * DURING RECORDING TO BE USED FOR AUTOMATION
                         *!/
                        if (playToGo && playToGo.gameId) {
                            const _recordedAutomation = {
                                gameId: playToGo.gameId,
                                playId: playToGo.id,
                                evt: 'click',
                                refId: `go-button-${playToGo.type}-${playToGo.id}`,
                                wait: 1
                            }
                            this.insertRecordedAutomation(_recordedAutomation)
                        }
*/
                    })

                    const result = {game: {gameId: play.gameId, plays: _playStack}, current: playToGo, previous: playToEnd}
                    resolve(result)
                } else {
                    resolve(null)
                }
            })
        })
    }

    pullCurrentPlay(gameId) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+gameId, 'plays', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    _playStack = JSON.parse(obj)

                    const currentPlay = _playStack.filter(o => o.current && o.inProcess)[0]
                    resolve(currentPlay)
                } else {
                    resolve(null)
                }
            })
        })
    }

    resetSession(gameId) {
        return new Promise(resolve => {

            conn.redisClient.flushall((err, reply) => {
                console.log('Redis FLUSHALL:', reply)
            })

            this.Progress = 'active'

            conn.redisClient.hgetall('g'+gameId, (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                let _playStack = []
                if (obj) {
                    _playStack = JSON.parse(obj.plays)
                    conn.redisClient.hset('g'+gameId, 'progress', this.Progress)

                    resolve({gameId: gameId, plays: _playStack})
                } else {
                    resolve(null)
                }
            })
        })
    }

    gameEnd(args) {
        return new Promise(resolve => {

            /*
                        conn.redisClient.flushall((err, reply) => {
                            console.log('Redis FLUSHALL:', reply)
                        })
            */

            // conn.redisClient.hget('g'+args.gameId, 'progress', async (err, obj) => {
            //     if (err) {
            //         logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            //         return resolve(null);
            //     }
            //
            //     this.Progress = 'postgame';
            //
            //     await conn.redisClient.hset('g'+args.gameId, 'progress', this.Progress)
            //
            //     //TODO UPDATE DB
            //     this.updateProgressDB({gameId: args.gameId, progress: this.Progress, isEnded: true})
            //
            //     resolve({progress: this.Progress, dateEndSession: dateTimeZone(new Date())})
            //
            // })


            conn.redisClient.hgetall('g' + args.gameId, async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                this.Progress = 'recording' === args.executionType ? 'pending' : 'postgame';

                if (obj) {
                    const _plays = await JSON.parse(obj.plays)

                    let currentPlay = await _plays.filter(o => o.current && o.inProcess)[0]
                    if (currentPlay) {
                        currentPlay.inProcess = ('announce' === currentPlay.type.toLowerCase() ? false : true)
                        currentPlay.current = false
                        currentPlay.resultConfirmed = ('announce' === currentPlay.type.toLowerCase() ? true : false)
                        currentPlay.ended = dateTimeZone(new Date())
                        const _videoFootage = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                        if (_videoFootage) {
                            currentPlay.footageEnd = _videoFootage.currentTime
                        }

                        this.updatePlayDB([currentPlay])
                    }


                    await conn.redisClient.hset('g' + args.gameId, 'progress', this.Progress)
                    await conn.redisClient.hset('g' + args.gameId, 'plays', JSON.stringify(_plays))

                    //TODO UPDATE DB
                    this.updateProgressDB({gameId: args.gameId, progress: this.Progress, isEnded: true, isFootageRecorded: args.isFootageRecorded})

                    resolve({
                        progress: this.Progress,
                        dateEndSession: dateTimeZone(new Date()),
                        plays: _plays,
                        current: null,
                        previous: currentPlay
                    })
                }
            })

        }).finally(async _=> {
            if ('automation' === args.executionType) {
                const vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0]
                if (vstore) {
                    vstore.timeStop()
                    const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                    if (idxToRemove > -1) {
                        conn.videoFootages.splice(idxToRemove, 1);
                    }
                }
            }
        })
    }

    addPlayDB(play) {
		return db_queries.addPlay(play)
    }

    updatePlayDB(plays) {
        for (let i = 0; i < plays.length; i++) {
            const play = plays[i]

            if (play && Object.keys(play).length > 0) {
                if (play.isNew) {
                    this.addPlayDB(play)
                    return
                }

                conn.pool.query('call sp_update_game_play(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [
                        play.gameId,
                        play.id,
                        play.participantId,
                        play.type,
                        play.award,
                        (play.sponsorId && !isNaN(parseInt(play.sponsorId)) && play.sponsorId > 0 ? play.sponsorId : null),
                        play.presetId,
                        play.isPresetTeamChoice,
                        play.lockedReuse,
                        play.points,
                        play.tokens,
                        play.stars,
                        play.starMax,
                        play.inProcess,
                        play.current,
                        play.resultConfirmed,
                        //play.started ? new Date(play.started) : null,
                        //play.ended ? new Date(play.ended) : null
                        play.started || null, //--analytics
                        play.ended || null, //--analytics
                        //play.started ? play.ended ? null : dateTimeZone(new Date()) : null,
                        //play.ended ? dateTimeZone(new Date()) : null
                        null, //--play.footageStart,
                        null, //--play.footageEnd,
                        play.footageQuickResolved,
                        play.footageSlowResolved,
                        play.playTitle || null
                    ]
                    , (err, result) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        }
                    })
            }
        }

    }

    playStackUpdateDB(plays) {

        for (let i = 0; i < plays.length; i++) {
            const play = plays[i]

            if (play && Object.keys(play).length > 0) {
                conn.pool.query('update game_play set participant_id = ? where game_id = ? and parent_question_id = ?',
                    [play.participantId, play.gameId, play.id]
                    , (err, result) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        }
                    })
            }

        }

    }

    updateProgressDB(args) {
		db_queries.updateGameStage(args)
    }

    removePlayDB(params) {
        if (params.gameId && params.id) {
            const query = 'automation' === params.executionType ? 'call sp_automation_delete_game_play(?,?)' : 'call sp_delete_game_play(?,?)'
            conn.pool.query(query, [params.gameId, params.id], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return
                }
            })
        }
    }

    async resolvePlayDB(play) {

        if (play && play.id) {

            if (play.result && play.result.id) {

                const _videoFootage = await conn.videoFootages.filter(o => o.gameId === play.gameId)[0];
                if (_videoFootage) {
                    play.footageSlowResolved = _videoFootage.currentTime
                }

                if (play.result.correctAnswers && play.result.correctAnswers.length > 0) {
                    play.result.correctAnswers.forEach(ans => {
                        if (ans && ans.id) {
                            conn.pool.query('call sp_resolve_game_play(?,?,?,?,?,?,?,?,?)',
                                [
                                    play.gameId,
                                    play.result.id,
                                    play.inProcess,
                                    play.resultConfirmed,
                                    //play.ended ? new Date(play.ended) : null,
                                    play.ended || null, //--analytics
                                    ans.id,
                                    ans.correctAnswer.value,
                                    play.type,
                                    play.footageSlowResolved
                                ], (err, result) => {
                                    if (err) {
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    }
                                })
                        }
                    })
                }
            }
        }
    }

    resolvePrePick(args) {
        conn.pool.query('call sp_resolve_prepick(?,?,?)', [args.gameId, args.prePickId, args.correctChoice], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return
            }
        })
    }

    insertPlayDuringAutomation(play) {
        return new Promise(resolve => {
            conn.pool.query('call sp_automation_create_game_play(?,?)', [play.gameId, play.id], async (err, result) => {
                if (err) {
                    conn.pool.query('call sp_automation_create_game_play(?,?)', [play.gameId, play.id], async (err2, res) => {
                        if (err2) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err2)
                            return resolve(null)
                        }
                        console.log('automation play added err:' + play.id)
                        if (res && res[0]) {
                            let plays = []
                            for (let n = 0; n < res[0].length; n++) {
                                const raw = res[0][n]
                                let play = await plays.filter(o => o.id === raw.parent_question_id)[0]
                                if (play) {
                                    let _multiChoice = await play.multiplierChoices.filter(o => o.id === raw.multi_question_id)[0]
                                    if (_multiChoice) {
                                        await _multiChoice.choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                    } else {
                                        let _choices = []
                                        await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                        await play.multiplierChoices.push({
                                            id: raw.multi_question_id,
                                            preset: raw.multi_preset,
                                            question: raw.multi_question,
                                            choices: _choices,
                                            type: raw.multi_type,
                                            locked: raw.multi_locked
                                        })
                                    }

                                    if (raw.date_ended) {
                                        if (play.result) {
                                            if (play.result.correctAnswers) {
                                                if (raw.choice_is_correct_answer) {
                                                    play.result.resultTitle += (play.result.resultTitle ? ', ' + raw.choice_value : raw.choice_value)
                                                    play.result.correctAnswers.push({
                                                        id: raw.multi_question_id,
                                                        correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                                    })
                                                }
                                            }

                                        }
                                    }

                                } else {
                                    const _announcements = []
                                    if ('announce' === raw.type.toLowerCase()) {
                                        _announcements.push({area: 'header', value: raw.announce_header})
                                        _announcements.push({area: 'middle', value: raw.announce_middle})
                                        _announcements.push({area: 'bottom', value: raw.announce_bottom})
                                    }
                                    play = {
                                        gameId: raw.game_id,
                                        id: raw.parent_question_id,
                                        playTitle: raw.parent_question,
                                        participantId: raw.participant_id,
                                        type: raw.type,
                                        award: raw.award,
                                        sponsorId: raw.sponsor_id,
                                        presetId: raw.preset_id,
                                        isPresetTeamChoice: raw.is_preset_teamchoice ? true : false,
                                        lockedReuse: raw.locked_reuse ? true : false,
                                        points: raw.points,
                                        tokens: raw.tokens,
                                        stars: raw.stars,
                                        starMax: raw.star_max,
                                        inProcess: raw.in_process ? true : false,
                                        current: raw.current ? true : false,
                                        resultConfirmed: raw.result_confirmed ? true : false,
                                        started: raw.date_started || null, //--analytics
                                        ended: raw.date_ended || null, //--analytics
                                        multiplierChoices: [],
                                        result: {},
                                        announcements: _announcements
                                    }

                                    let _choices = []
                                    await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                    await play.multiplierChoices.push({
                                        id: raw.multi_question_id,
                                        preset: raw.multi_preset,
                                        question: raw.multi_question,
                                        choices: _choices,
                                        type: raw.multi_type,
                                        locked: raw.multi_locked
                                    })

                                    if (raw.date_ended) {
                                        play.result = {
                                            id: raw.multi_question_id,
                                            type: raw.multi_type,
                                            resultTitle: raw.choice_is_correct_answer ? raw.choice_value : '',
                                            correctAnswers: []
                                        }
                                        if (raw.choice_is_correct_answer) {
                                            play.result.correctAnswers.push({
                                                id: raw.multi_question_id,
                                                correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                            })
                                        }
                                    }

                                    await plays.unshift(play)
                                }
                            }

                            return resolve(plays[0])
                        }
                    })

                }
                console.log('automation play added:' + play.id)
                if (result && result[0] && 1 === 2) {
                    let plays = []
                    for (let n = 0; n < result[0].length; n++) {
                        const raw = result[0][n]
                        let play = await plays.filter(o => o.id === raw.parent_question_id)[0]
                        if (play) {
                            let _multiChoice = await play.multiplierChoices.filter(o => o.id === raw.multi_question_id)[0]
                            if (_multiChoice) {
                                await _multiChoice.choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                            } else {
                                let _choices = []
                                await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                                await play.multiplierChoices.push({
                                    id: raw.multi_question_id,
                                    preset: raw.multi_preset,
                                    question: raw.multi_question,
                                    choices: _choices,
                                    type: raw.multi_type,
                                    locked: raw.multi_locked
                                })
                            }

                            if (raw.date_ended) {
                                if (play.result) {
                                    if (play.result.correctAnswers) {
                                        if (raw.choice_is_correct_answer) {
                                            play.result.resultTitle += (play.result.resultTitle ? ', ' + raw.choice_value : raw.choice_value)
                                            play.result.correctAnswers.push({
                                                id: raw.multi_question_id,
                                                correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                            })
                                        }
                                    }

                                }
                            }

                        } else {
                            const _announcements = []
                            if ('announce' === raw.type.toLowerCase()) {
                                _announcements.push({area: 'header', value: raw.announce_header})
                                _announcements.push({area: 'middle', value: raw.announce_middle})
                                _announcements.push({area: 'bottom', value: raw.announce_bottom})
                            }
                            play = {
                                gameId: raw.game_id,
                                id: raw.parent_question_id,
                                playTitle: raw.parent_question,
                                participantId: raw.participant_id,
                                type: raw.type,
                                award: raw.award,
                                sponsorId: raw.sponsor_id,
                                presetId: raw.preset_id,
                                isPresetTeamChoice: raw.is_preset_teamchoice ? true : false,
                                lockedReuse: raw.locked_reuse ? true : false,
                                points: raw.points,
                                tokens: raw.tokens,
                                stars: raw.stars,
                                starMax: raw.star_max,
                                inProcess: raw.in_process ? true : false,
                                current: raw.current ? true : false,
                                resultConfirmed: raw.result_confirmed ? true : false,
                                started: raw.date_started || null, //--analytics
                                ended: raw.date_ended || null, //--analytics
                                multiplierChoices: [],
                                result: {},
                                announcements: _announcements
                            }

                            let _choices = []
                            await _choices.push({value: raw.choice_value, nextId: raw.choice_next_id, sequence: raw.choice_sequence})
                            await play.multiplierChoices.push({
                                id: raw.multi_question_id,
                                preset: raw.multi_preset,
                                question: raw.multi_question,
                                choices: _choices,
                                type: raw.multi_type,
                                locked: raw.multi_locked
                            })

                            if (raw.date_ended) {
                                play.result = {
                                    id: raw.multi_question_id,
                                    type: raw.multi_type,
                                    resultTitle: raw.choice_is_correct_answer ? raw.choice_value : '',
                                    correctAnswers: []
                                }
                                if (raw.choice_is_correct_answer) {
                                    play.result.correctAnswers.push({
                                        id: raw.multi_question_id,
                                        correctAnswer: { value: raw.choice_value, nextId: raw.choice_next_id }
                                    })
                                }
                            }

                            await plays.unshift(play)
                        }
                    }

                    return resolve(plays[0])
                }

                return resolve(null)

            })
        })

    }

    //-- RELLY AUTOMATION
    async insertRecordedAutomationResolved(args) {
        if (args.editorEvents && args.editorEvents.length > 0) {
            let editors = []
            let vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0]
            for (let i=0; i<args.editorEvents.length; i++) {
                const _editor = args.editorEvents[i]

                if (vstore) {
                    if (_editor.isIncrementHeaderPlaySequence) {
                        ++vstore.headerPlaySequence
                    }
                    if (_editor.isIncrementPlaySequence) {
                        ++vstore.playSequence
                    }
                    if (_editor.isIncrementSequence) {
                        _editor.sequence = ++vstore.sequence
                    }

                    if (_editor.isUseGlobalTimestampWait) {
                        _editor.wait = await vstore.timestampWait
                        vstore.timestampWait = 0
                    } else {
                        _editor.wait = await _editor.timestampWait
                    }
                }

                editors.push([
                    _editor.gameId,
                    _editor.playId,
                    _editor.evt,
                    _editor.refId,
                    _editor['wait'],
                    _editor.value,
                    _editor.sequence,
                    _editor.isPreviousPlayEnded || false
                ])
            }

            if (vstore) {
                this.hostChannel.publish({
                    event: 'host.automation.set.sequences',
                    data: {headerPlaySequence: vstore.headerPlaySequence, playSequence: vstore.playSequence, sequence: vstore.sequence}
                })
            }

            conn.pool.getConnection((errx, db) => {
                if (errx) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errx)
                    return
                }
                if (db) {
                    db.beginTransaction(err => {
                        if (err) {
                            db.release()
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                            return
                        }
                        conn.pool.query('insert into automation_recorded_play(' +
                            'game_id, ' +
                            'play_id, ' +
                            '`event`, ' +
                            'ref_id, ' +
                            '`wait`, ' +
                            'event_select_value, ' +
                            'sequence, ' +
                            'is_previous_play_ended) values ?', [editors], (err2, result) => {
                            if (err2) {
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err2}`)
                                return;
                            }

                            db.commit((err3) => {
                                if (err3) {
                                    db.rollback(() => {
                                    })
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err3}`)
                                }
                                db.release();
                                return;
                            })
                        })


                    })
                }

            })

        }
    }

    //-- RELLY AUTOMATION
    insertRecordedAutomation(args) {
        return new Promise(resolve => {
            conn.pool.getConnection((errx, db) => {
                if (errx) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errx)
                    return resolve(true)
                }
                if (db) {
                    db.beginTransaction(async err => {
                        if (err) {
                            db.release()
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                            return resolve(true)
                        }

                        let vstore = await conn.videoFootages.filter(o => o.gameId === args.recordedAutomation.gameId)[0]
                        if (args.editorEvents && args.editorEvents.length > 0) {
                            let lessWait = 0
                            let editors = []
                            for (let i=0; i<args.editorEvents.length; i++) {
                                const _editor = await args.editorEvents[i]
                                //-- RELLY AUTOMATION
                                if (vstore) {
                                    if (_editor.isIncrementHeaderPlaySequence) {
                                        ++vstore.headerPlaySequence
                                    }
                                    if (_editor.isIncrementPlaySequence) {
                                        ++vstore.playSequence
                                    }
                                    if (_editor.isIncrementSequence) {
                                        _editor.sequence = ++vstore.sequence
                                    }
                                    if (_editor.isZeroWait) {
                                        _editor.wait = 0
                                    } else {
                                        //_editor.wait = await _editor.isPreviousPlayEnded ? 0 : await (vstore.timestampWait || _editor.timestampWait)
                                        _editor.wait = 0.5
                                        lessWait += 0.5
                                    }
                                }

                                editors.push([
                                    _editor.gameId,
                                    _editor.playId,
                                    _editor.evt,
                                    _editor.refId,
                                    _editor['wait'],
                                    _editor.value,
                                    _editor.sequence,
                                    _editor.isPreviousPlayEnded || false
                                ])
                            }

                            //-- RELLY AUTOMATION
                            if (vstore) {
                                this.hostChannel.publish({
                                    event: 'host.automation.set.sequences',
                                    data: {headerPlaySequence: vstore.headerPlaySequence, playSequence: vstore.playSequence, sequence: vstore.sequence}
                                })
                            }

                            db.query('insert into automation_recorded_play(' +
                                'game_id, ' +
                                'play_id, ' +
                                '`event`, ' +
                                'ref_id, ' +
                                '`wait`, ' +
                                'event_select_value, ' +
                                'sequence, ' +
                                'is_previous_play_ended) values ?', [editors], async (err2, result) => {
                                if (err2) {
                                    db.rollback(() => {
                                    })
                                    db.release()
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err2}`)
                                    return;
                                }

                                if (args.recordedAutomation && Object.keys(args.recordedAutomation).length > 0) {
                                    //-- RELLY AUTOMATION
                                    const vstore = await conn.videoFootages.filter(o => o.gameId === args.recordedAutomation.gameId)[0]
                                    if (vstore) {
                                        if (args.recordedAutomation.isIncrementHeaderPlaySequence) {
                                            ++vstore.headerPlaySequence
                                        }
                                        if (args.recordedAutomation.isIncrementPlaySequence) {
                                            ++vstore.playSequence
                                        }
                                        if (args.recordedAutomation.isIncrementSequence) {
                                            args.recordedAutomation.sequence = ++vstore.sequence
                                        }
                                        if (args.recordedAutomation.isZeroWait) {
                                            args.recordedAutomation.wait = 0
                                        } else {
                                            if (args.recordedAutomation.refId.includes('playitem-addtostack-button')) {
                                                const _initial_w = await (vstore.timestampWait || args.recordedAutomation.timestampWait)
                                                const _final_w = _initial_w > lessWait ? await (_initial_w - lessWait) : _initial_w
                                                args.recordedAutomation.wait = await args.recordedAutomation.isPreviousPlayEnded ? 0 : _final_w
                                            } else {
                                                args.recordedAutomation.wait = await args.recordedAutomation.isPreviousPlayEnded ? 0 : (vstore.timestampWait || args.recordedAutomation.timestampWait)
                                            }
                                        }
                                        vstore.timestampWait = 0

                                        if ('startendmodal-button-end'.match(args.recordedAutomation.refId)) {
                                            vstore.timeStop()
                                            const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.recordedAutomation.gameId);
                                            if (idxToRemove > -1) {
                                                conn.videoFootages.splice(idxToRemove, 1);
                                            }
                                        } else {
                                            this.hostChannel.publish({
                                                event: 'host.automation.set.sequences',
                                                data: {headerPlaySequence: vstore.headerPlaySequence, playSequence: vstore.playSequence, sequence: vstore.sequence}
                                            })
                                        }
                                    }

                                    db.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
                                        [
                                            args.recordedAutomation.gameId,
                                            args.recordedAutomation.playId,
                                            args.recordedAutomation.evt,
                                            args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                                            args.recordedAutomation['wait'],
                                            args.recordedAutomation.value,
                                            args.recordedAutomation.sequence,
                                            args.recordedAutomation.isPreviousPlayEnded || false
                                        ],
                                        (err3, result) => {
                                            if (err3) {
                                                db.rollback(() => {
                                                })
                                                db.release()
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err3}`)
                                                return resolve(true)
                                            }

                                            db.commit((err4) => {
                                                if (err4) {
                                                    db.rollback(() => {
                                                    })
                                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err4}`)
                                                }
                                                db.release();
                                                return resolve(true)
                                            })
                                        })
                                } else {
                                    db.commit((err5) => {
                                        if (err5) {
                                            db.rollback(() => {
                                            })
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err5}`)
                                        }
                                        db.release();
                                        return resolve(true)
                                    })
                                }
                            })

                            //--------------------------
                            const _gameId = args.recordedAutomation && args.recordedAutomation.gameId ? args.recordedAutomation.gameId : args.gameId;
                            const _playId = args.recordedAutomation && args.recordedAutomation.playId ? args.recordedAutomation.playId : args.playId;
                            if (_gameId && _playId) {
                                conn.redisClient.hget('g'+_gameId, 'plays', async (errredis, obj) => {
                                    if (errredis) {
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errredis)
                                    } else {
                                        let _playStack = []
                                        if (obj) {
                                            _playStack = JSON.parse(obj)
                                            const p = await _playStack.filter(o => o.id === _playId)[0]
                                            if (p) {
                                                delete p.editorEvents

                                                conn.redisClient.hset('g'+_gameId, 'plays', JSON.stringify(_playStack))
                                            }
                                        }

                                    }
                                })
                            }
                            //--------------------------
                            return;
                        } else {
                            if (args.recordedAutomation && Object.keys(args.recordedAutomation).length > 0) {
                                //-- RELLY AUTOMATION
                                const vstore = await conn.videoFootages.filter(o => o.gameId === args.recordedAutomation.gameId)[0]
                                if (vstore) {
                                    if (args.recordedAutomation.isIncrementHeaderPlaySequence) {
                                        ++vstore.headerPlaySequence
                                    }
                                    if (args.recordedAutomation.isIncrementPlaySequence) {
                                        ++vstore.playSequence
                                    }
                                    if (args.recordedAutomation.isIncrementSequence) {
                                        args.recordedAutomation.sequence = ++vstore.sequence
                                    }
                                    if (args.recordedAutomation.isZeroWait) {
                                        args.recordedAutomation.wait = 0
                                    } else {
                                        args.recordedAutomation.wait = await args.recordedAutomation.isPreviousPlayEnded ? 0 : (vstore.timestampWait || args.recordedAutomation.timestampWait)
                                    }
                                    vstore.timestampWait = 0

                                    if ('startendmodal-button-end'.match(args.recordedAutomation.refId)) {
                                        vstore.timeStop()
                                        const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.recordedAutomation.gameId);
                                        if (idxToRemove > -1) {
                                            conn.videoFootages.splice(idxToRemove, 1);
                                        }
                                    } else {
                                        this.hostChannel.publish({
                                            event: 'host.automation.set.sequences',
                                            data: {headerPlaySequence: vstore.headerPlaySequence, playSequence: vstore.playSequence, sequence: vstore.sequence}
                                        })
                                    }
                                }

                                db.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
                                    [
                                        args.recordedAutomation.gameId,
                                        args.recordedAutomation.playId,
                                        args.recordedAutomation.evt,
                                        args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                                        args.recordedAutomation['wait'],
                                        args.recordedAutomation.value,
                                        args.recordedAutomation.sequence,
                                        args.recordedAutomation.isPreviousPlayEnded || false
                                    ],
                                    (err6, result6) => {
                                        if (err6) {
                                            db.rollback(() => {
                                            })
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err6}`)
                                            return resolve(true)
                                        }

                                        db.commit((err9) => {
                                            if (err9) {
                                                db.rollback(() => {
                                                })
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err9}`)
                                            }
                                            db.release();
                                            return resolve(true)
                                        })
                                    })
                            }
                        }

                    })
                }
            })
        })
    }

    insertRecordedAutomationOLD2(args) {
        conn.pool.getConnection((errx, db) => {
            if (errx) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errx)
                return;
            }
            if (db) {
                db.beginTransaction(err => {
                    if (err) {
                        db.release()
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                        return;
                    }

                    if (args.editorEvents && args.editorEvents.length > 0) {
                        let editors = []
                        args.editorEvents.forEach(_editor => {
                            editors.push([
                                _editor.gameId,
                                _editor.playId,
                                _editor.evt,
                                _editor.refId,
                                _editor['wait'],
                                _editor.value,
                                _editor.sequence,
                                _editor.isPreviousPlayEnded || false
                            ])
                        })
                        db.query('insert into automation_recorded_play(' +
                            'game_id, ' +
                            'play_id, ' +
                            '`event`, ' +
                            'ref_id, ' +
                            '`wait`, ' +
                            'event_select_value, ' +
                            'sequence, ' +
                            'is_previous_play_ended) values ?', [editors], (err2, result) => {
                            if (err2) {
                                db.rollback(() => {
                                })
                                db.release()
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err2}`)
                                return;
                            }

                            if (args.recordedAutomation && Object.keys(args.recordedAutomation).length > 0) {
                                db.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
                                    [
                                        args.recordedAutomation.gameId,
                                        args.recordedAutomation.playId,
                                        args.recordedAutomation.evt,
                                        args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                                        args.recordedAutomation['wait'],
                                        args.recordedAutomation.value,
                                        args.recordedAutomation.sequence,
                                        args.recordedAutomation.isPreviousPlayEnded || false
                                    ],
                                    (err3, result) => {
                                        if (err3) {
                                            db.rollback(() => {
                                            })
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err3}`)
                                            return;
                                        }

                                        db.commit((err4) => {
                                            if (err4) {
                                                db.rollback(() => {
                                                })
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err4}`)
                                            }
                                            db.release();
                                        })
                                    })
                            } else {
                                db.commit((err5) => {
                                    if (err5) {
                                        db.rollback(() => {
                                        })
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err5}`)
                                    }
                                    db.release();
                                })
                            }
                        })

                        //--------------------------
                        const _gameId = args.recordedAutomation && args.recordedAutomation.gameId ? args.recordedAutomation.gameId : args.gameId;
                        const _playId = args.recordedAutomation && args.recordedAutomation.playId ? args.recordedAutomation.playId : args.playId;
                        if (_gameId && _playId) {
                            conn.redisClient.hget('g'+_gameId, 'plays', async (errredis, obj) => {
                                if (errredis) {
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + errredis)
                                } else {
                                    let _playStack = []
                                    if (obj) {
                                        _playStack = JSON.parse(obj)
                                        const p = await _playStack.filter(o => o.id === _playId)[0]
                                        if (p) {
                                            delete p.editorEvents

                                            conn.redisClient.hset('g'+_gameId, 'plays', JSON.stringify(_playStack))
                                        }
                                    }

                                }
                            })
                        }
                        //--------------------------
                        return;
                    } else {
                        if (args.recordedAutomation && Object.keys(args.recordedAutomation).length > 0) {
                            db.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
                                [
                                    args.recordedAutomation.gameId,
                                    args.recordedAutomation.playId,
                                    args.recordedAutomation.evt,
                                    args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                                    args.recordedAutomation['wait'],
                                    args.recordedAutomation.value,
                                    args.recordedAutomation.sequence,
                                    args.recordedAutomation.isPreviousPlayEnded || false
                                ],
                                (err6, result) => {
                                    if (err6) {
                                        db.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
                                            [
                                                args.recordedAutomation.gameId,
                                                args.recordedAutomation.playId,
                                                args.recordedAutomation.evt,
                                                args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                                                args.recordedAutomation['wait'],
                                                args.recordedAutomation.value,
                                                args.recordedAutomation.sequence,
                                                args.recordedAutomation.isPreviousPlayEnded || false
                                            ], (err7, result7) => {
                                                if (err7) {
                                                    db.rollback(() => {
                                                    })
                                                    db.release()
                                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err7}`)
                                                    return;
                                                }
                                                db.commit((err8) => {
                                                    if (err8) {
                                                        db.rollback(() => {
                                                        })
                                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err8}`)
                                                    }
                                                    db.release();
                                                    return;
                                                })
                                            })
                                    }

                                    db.commit((err9) => {
                                        if (err9) {
                                            db.rollback(() => {
                                            })
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err9}`)
                                        }
                                        db.release();
                                        return;
                                    })
                                })
                        }
                    }

                })
            }
        })

    }

    async insertRecordedAutomationOLD(args) {
        // const vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        // if (vstore) {
        //     if (args.refId.match(new RegExp('go-button-', 'gi')) ||
        //         args.refId.match(new RegExp('header-button-end', 'gi'))) {
        //         args['wait'] = await vstore.currentTime;
        //         vstore.resetCurrentTime();
        //     } else if (args.refId.match(new RegExp('end-button-', 'gi'))) {
        //         //args['wait'] = 0;
        //         args['wait'] = await vstore.currentTime;
        //         vstore.resetCurrentTime();
        //     }
        // }

        conn.pool.query('call sp_automation_create_recorded_play(?,?,?,?,?,?,?,?)',
            [
                args.gameId,
                args.playId,
                args.evt,
                args.recordedAutomation.isGo ? (args.recordedAutomation.refId + args.recordedAutomation.playId) : args.recordedAutomation.refId,
                args['wait'],
                args.value,
                args.sequence,
                args.isPreviousPlayEnded
            ],
            (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return
                }
            })
    }

    async saveLastSessionTime(args) {
        const vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            args.lastSessionTime = vstore.currentTime
            vstore.timeStop();
            const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
            if (idxToRemove > -1) {
                conn.videoFootages.splice(idxToRemove, 1);
            }
        } else {
            args.lastSessionTime = null
        }

        conn.pool.query('call sp_automation_update_hcomm(?,?,?,?,?)',
            [args.gameId, args.lastSessionTime, args.HCommLastHeaderSequence, args.HCommLastPlaySequence, args.HCommLastWait],
            (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return
                }
            })
    }

    async saveLastSequences(args) {
        const vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0]
        if (vstore) {
            console.log('Databasecomponent line 1959', vstore)
            conn.pool.query('call sp_automation_save_last_sequences(?,?,?,?,?,?)',
                [args.gameId, vstore.currentTime, vstore.headerPlaySequence, vstore.playSequence, parseInt(vstore.timestampWait || 0), vstore.sequence],
                (err, result) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    }

                    vstore.timeStop()
                })
        }
    }

    recordingReset(args) {
        return new Promise(resolve => {
            conn.pool.query('call sp_automation_reset_recorded_plays(?)', [args.gameId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(false)
                }
                return resolve(true)
            })

        })
    }

    // gameResume(args) {
    //     return new Promise(resolve => {
    //         conn.pool.query('select last_session_time from affiliate where `code` = ? and date_start_session is not null and (is_footage_recorded = 0 or date_end_session is null)', [args.gameId], (err, result) => {
    //             if (err) {
    //                 logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
    //                 return resolve(null)
    //             }
    //
    //             console.log('DatabaseComponent line 1220', result)
    //         })
    //
    //     })
    //
    // }

    //--TO BE DELETED
    saveRecordedPlays(args) {
        conn.pool.getConnection((err, db) => {
            if (err) {
                db.release()
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return
            }
            if (db) {
                db.beginTransaction(err2 => {
                    if (err2) {
                        db.release()
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err2)
                        return
                    }

                    for (let i=0; i<args.plays.length; i++) {
                        const raw = args.plays[i];
                        db.query('insert into automation_recorded_play(game_id, play_id, event, ref_id, wait, event_select_value) values(?,?,?,?,?,?)',
                            [
                                args.gameId,
                                raw.playId,
                                raw.evt,
                                raw.refId,
                                raw['wait'],
                                raw.value
                            ], (err3, result) => {
                                if (err3) {
                                    db.rollback(() => {})
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err3)
                                    db.release()
                                    return
                                }

                                db.commit((err4) => {
                                    if (err4) {
                                        db.rollback(() => {})
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err4``)
                                        db.release()
                                        return
                                    }

                                    db.release()
                                    return
                                })
                            })
                    }
                })
            }
        })
    }

    movePlay(args) {
        return new Promise(resolve => {
            conn.pool.query('call sp_move_play(?,?)', [args.gameId, args.plays], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }
                return resolve(result);
            })

        })
    }

}

module.exports = DatabaseComponent
