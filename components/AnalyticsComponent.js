const EventEmitter = require('events');
const conn = require('../DbConnection')
const logger = require('../config/logger')
const {analyticsId} = require('../utilities/unique')
const {dateTimeZone} = require('../utilities/helper')
const dateFormat  = require('dateformat')

class AnalyticsComponent extends EventEmitter {
    constructor(info) {
        super();
        this.info = info
        this.timezone = 'America/Los_Angeles'
        this.initEvents();
    }

    construct(userDbComponent, gameServerComponent) {
        this.userDbComponent = userDbComponent;
        this.gameServerComponent = gameServerComponent;
    }

    timeStart(args, socket) {
        return new Promise(async (resolve) => {
            const _userId = args.userId || this.clientIP(socket);

            const cacheUserIdExists = await new Promise(r1 => {
                conn.redisClient.exists('analytics_'+_userId, (err, obj) => {
                    if (err) {
                        return r1(false);
                    }
                    if (parseInt(obj.toString()) === 1) {
                        return r1(true);
                    } else {
                        return r1(false);
                    }
                })
            })

            let _pages = []
            const _uuid = args.uuid || analyticsId()
            const _timeStart = dateTimeZone(new Date());

            if (cacheUserIdExists) {
                _pages = await new Promise(r2 => {
                    conn.redisClient.hget('analytics_'+_userId, 'pages', (err, obj) => {
                        if (obj) {
                            if (Array.isArray(JSON.parse(obj))) {
                                return r2(JSON.parse(obj));
                            } else {
                                return r2([]);
                            }
                        } else {
                            return r2([]);
                        }
                    })
                })
            }

            const pageExists = await _pages.filter(o => o.uuid === args.uuid && (o.page || '').toLowerCase() === args.page)[0]
            if (!pageExists) {
                const _event = {
                    userId: args.userId,
                    uuid: _uuid,
                    interactionUuid: args.interactionUuid,
                    timeStart: _timeStart,
                    timeStop: null,
                    page: args.page,
                    isMainPage: args.isMainPage,
                    ip: this.clientIP(socket)
                }
                _pages.push(_event)

                conn.redisClient.hset('analytics_'+_userId, 'pages', JSON.stringify(_pages), () => {
                    /**
                     * flag the user when on a livegame page but interrupted by other page.
                     */
                    if (args.interactionUuid) {
                        const _interactionMainPage =_pages.filter(o => o.uuid === args.interactionUuid && !o.timeStop && 'livegame' === (o.page || '').toLowerCase())[0]
                        if (_interactionMainPage) {
                            let prop = {};
                            prop[args.userId] = true
                            conn.redisClient.hmset('livegame_page_interruption_users', prop)
                        }
                    }
                })
                //--console.log( 'TIME START ', JSON.parse(JSON.stringify(_event || '')))
                return resolve(_event)
            } else {
                return resolve(null)
            }
        })
    }

    timeStop(args, socket) {
        const _userId = args.userId || this.clientIP(socket);
        conn.redisClient.hget('analytics_'+_userId, 'pages', async (err, obj) => {
            const _timeStop = dateTimeZone(new Date());
            let _analytics = [];
            let _event = null
            let _board = null
            if (obj) {
                if (Array.isArray(JSON.parse(obj))) {
                    _analytics = await JSON.parse(obj)
                    _event = await _analytics.filter(o => (o.page || '').toLowerCase() === (args.page || '').toLowerCase() && o.uuid === args.uuid && !o.timeStop)[0]
                    if (_event) {
                        _event.timeStop = await _timeStop

                        if (args.categoryId && args.productId) {
                            _board = {
                                uuid: args.uuid,
                                categoryId: args.categoryId,
                                productId: args.productId,
                                type: args.type,
                                value: args.value,
                                timeStart: _event.timeStart,
                                timeStop: _event.timeStop
                            }
                            _event.boards = [];
                            _event.boards.push(_board)
                        }

                        conn.redisClient.hset('analytics_'+_userId, 'pages', JSON.stringify(_analytics), () => {
                            /**
                             * flag the user when on a livegame page but interrupted by other page.
                             */
                            this.toggleLiveGameInteraction(args, _analytics);

                            this.insertToDB(_event);

                            this.insertBoardVisitDB(_board);

                            // if (args.categoryId && args.productId) {
                            //     args.timeStart = _event.timeStart
                            //     args.timeStop = _event.timeStop
                            //     this.insertBoard(args);
                            // }
                        })
                    }
                }
            }

            //--console.log( 'TIME STOP ', JSON.parse(JSON.stringify(_event || '')))
        })
    }

    clientIP(socket) {
        let ip = socket.remoteAddress;
        if (ip.indexOf(":") !== -1) {
            ip = ip.split(":")[ip.split(":").length - 1];
        }

        return ip;
    }

    toggleLiveGameInteraction(args, _analytics) {
        if (args.interactionUuid) {
            const _interactionPagesWithoutTimeStop = _analytics.filter(o => o.interactionUuid === args.interactionUuid && !o.timeStop)
            if (_interactionPagesWithoutTimeStop && _interactionPagesWithoutTimeStop.length > 0) {
                conn.redisClient.exists('livegame_page_interruption_users', (err, obj) => {
                    if (parseInt(obj.toString()) === 1) {
                        let _prop = {}
                        _prop[args.userId] = true
                        conn.redisClient.hmset('livegame_page_interruption_users', _prop)
                    }
                })
            } else {
                conn.redisClient.exists('livegame_page_interruption_users', (err, obj) => {
                    if (parseInt(obj.toString()) === 1) {
                        conn.redisClient.hdel('livegame_page_interruption_users', args.userId)
                    }
                })
            }
        }
    }

    insertToDB(args) {
        if (args && !args.uuid) {
            return;
        }

        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return
            }
            if (db) {
                db.beginTransaction(err => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        db.release()
                    }
                    conn.pool.query('insert into analytics_page(uuid, interaction_uuid, appuser_id, ip, user_agent, page, is_main_page, time_start, time_stop) values(?,?,?,?,?,?,?,?,?)',
                        [args.uuid, args.interactionUuid, args.userId, args.ip, args.userAgent, args.page, args.isMainPage, args.timeStart, args.timeStop],
                        (err, result) => {
                            if (err) {
                                db.rollback(() => {})
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                db.release();
                                return;
                            }

                            db.commit(err => {
                                if (err) {
                                    db.rollback(err => {
                                    })
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                }
                                db.release()
                            })
                            return;
                        })
                })
            }
        })
    }

    insertFlag(args) {
        if (args) {
            const _userId = args.userId || args.ip;
            conn.redisClient.hget('analytics_' + _userId, 'pages', (err, obj) => {
                let _analytics = [];
                let _event = null
                if (obj) {
                    if (Array.isArray(JSON.parse(obj))) {
                        _analytics = JSON.parse(obj)
                        _event = _analytics.filter(o => o.isMainPage && o.uuid === args.uuid)[0]
                        if (_event) {
                            _event.productId = args.productId
                            _event.purchase = args.purchase
                            _event.purchaseType = args.purchaseType
                            _event.addedToPrizeChest = args.addedToPrizeChest
                            _event.prizeChestType = args.prizeChestType
                            conn.redisClient.hset('analytics_'+_userId, 'pages', JSON.stringify(_analytics), () => {
                                this.insertFlagDB(_event);
                            })
                        }
                    }
                }
            })
        }

    }

    insertBoardVisitDB(args) {
        if (args && Object.keys(args).length > 0) {
            conn.pool.query('insert into analytics_prizeboard_prize_visit(page_uuid, category_id, product_id, `type`, value, time_start, time_stop) values(?,?,?,?,?,?,?)',
                [args.uuid, args.categoryId, args.productId, args.type, args.value, args.timeStart, args.timeStop],
                (err, result) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return
                    }
                })
        }
    }

    insertFlagDB(args) {
        conn.pool.query('insert into analytics_page_flag(page_uuid, product_id, purchase, purchase_type, added_to_prizechest, prizechest_type, date_added) values(?,?,?,?,?,?,?)',
            [args.uuid, args.productId, args.purchase, args.purchaseType, args.addedToPrizeChest, args.prizeChestType, dateTimeZone(new Date())],
            (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return;
                }
            })
    }

    setPendingGamePlay(args) {
        if (args.userId && args.gameId) {
            const _key = (args.userId +'||'+args.gameId).toLowerCase()
            if (args.isSet) {
                let prop = {}
                prop[_key] = true
                conn.redisClient.hmset('pending_game_plays', prop);
            } else {
                conn.redisClient.exists('pending_game_plays', (err, obj) => {
                    if (parseInt(obj.toString()) === 1) {
                        conn.redisClient.hdel('pending_game_plays', _key)
                    }
                })
            }
        }

        // conn.redisClient.hget('u'+args.userId, args.gameId, (err, obj) => {
        //     if (err) {
        //         logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        //         return;
        //     }
        //     if (obj) {
        //         console.log('UserDbComponent line 644', JSON.stringify(JSON.parse(obj), null, '\t') )
        //     }
        // })
    }

    initEvents() {
        this.on('event.play.resolve', hostResolvedPlay => {

            conn.redisClient.hgetall('pending_game_plays', (err, ids) => {
                if (ids) {
                    for (let key in ids) {
                        const userId = key.split('||')[0]
                        const gameId = key.split('||')[1]

                        conn.redisClient.hget('u'+userId, gameId, async (err1, objUserPlays) => {
                            if (err1) {
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            } else {
                                if (objUserPlays) {
                                    const _userPlays = JSON.parse(objUserPlays);
                                    if (_userPlays && Array.isArray(_userPlays)) {
                                        const _userPlay = await _userPlays.filter(o => o.questionId === hostResolvedPlay.id)[0]
                                        if (_userPlay) {
                                            _userPlay.isPending = false;
                                            _userPlay.isLocked = true;
                                            _userPlay.length = 0;
                                            _userPlay.ended = hostResolvedPlay.ended

                                            let _awardPoints = 0
                                            let _awardStars = 0

                                            for (let i=0; i<_userPlay.livegameAnswers.length; i++) {
                                                const _userAns = _userPlay.livegameAnswers[i];
                                                _userAns.isCredited = true;
                                                _userAns.stars = _userPlay.stars === (i + 1) ? 1 : 0;

                                                const _hostAns = await hostResolvedPlay.correctAnswers.filter(o => o.id === _userAns.id)[0];
                                                if (_hostAns) {
                                                    _userAns.correctAnswer = _hostAns.correctAnswer.value
                                                    if ((_userAns.answer || '').toLowerCase() === (_hostAns.correctAnswer.value || '').toLowerCase()) {
                                                        _userAns.isStarCredited = _userPlay.stars === (i + 1) ? true : false;
                                                        _awardPoints += _userAns.points || (_userPlay.feeCounterValue * process.env.PLAY_AWARD_POINTS_MULTIPLIER);
                                                        _awardStars += _userPlay.stars === (i + 1) ? 1 : 0;

                                                    }
                                                }
                                            }

                                            _userPlay.shortHand = _awardStars ? '1 STAR' : _userPlay.stars ? 'NO POINTS' : _awardPoints;

                                            const _awards = [{currency: 'points', amount: _awardPoints}, {currency: 'stars', amount: _awardStars}];

                                            this.userDbComponent.updateHistoryPlayDB({gameId: gameId, userId: userId, historyPlay: _userPlay, awards: _awards});
                                            console.log('AnalyticsComponent line 317 ---------------------', dateFormat(new Date(), 'hh:MM:ss'), JSON.stringify({gameId: gameId, userId: userId, historyPlay: _userPlay, awards: _awards}, null, '\n'))
                                        }
                                    }

                                }
                            }

                        })

                    }
                }
            })
        })
    }

    saveLastSessionTime(args) {
        this.gameServerComponent.saveLastSessionTime(args)
    }

    extractOriginalGamePlay(rawPlays) {

        return new Promise(async resolve => {
            const plays = []
            for (let n = 0; n < rawPlays.length; n++) {
                const raw = rawPlays[n]
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

            return resolve(plays)
        })



    }
}

module.exports = new AnalyticsComponent();