const conn = require('../DbConnection')
const logger = require('../config/logger')
const CryptoJS = require('crypto-js')
const { timestampToDate } = require('../utilities/helper')
const db_queries = require('../config/dbqueries')
const {anonymousUserToken} = require('../utilities/unique')


class UserDbComponent {
    constructor(environment) {
        this.environment = environment
    }

    login(args) {
        return db_queries.appuser.login(args)
    }

    signup(args) {
        return new Promise(resolve => {
            let _user = null
            return db_queries.appuser.create(args)
                .then(response => {
                    if (response) {
                        _user = response
                        return this.convertAnonymousIntoRealUser(args.anonymousUserId, response.userId)
                    }
                }).then(response2 => {
                    if (response2) {
                        _user.points = response2.points
                        _user.tokens = response2.tokens
                        _user.stars = response2.stars
                        return resolve(_user)
                    } else {
                        return resolve(null)
                    }
                })
        })
    }

    /* FORGOT PASSWORD */
    forgotPassword(args){
        if(args.type === 'email'){
            return db_queries.appuser.emailVerfication(args)
        }
        if(args.type === 'phone'){
            return db_queries.appuser.phoneVerfication(args)
        }
         
    }

    /* RESET PASSWORD */
    resetPassword(args){
        return db_queries.appuser.resetPassword(args) 
    }
    /* Code Verification */
    codeVerification(args){
        return db_queries.appuser.codeVerification(args) 
    }
    convertAnonymousIntoRealUser(anonymousUserId, userId) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_convert_anonymous_into_real_user(?,?)', [anonymousUserId, userId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result && result[0] && result[0].length > 0) {
                    return resolve(result[0][0])
                } else {
                    return resolve(null)
                }
            })
        })
    }

    getHistoryPlaysWORKING(args) {
        return new Promise(resolve => {
            conn.redisClient.hget('u'+args.userId, args.gameId, (err, obj) => {
                if (err) {
                    return resolve([])
                }
                if (obj) {
                    return resolve(JSON.parse(obj))
                } else {
                    return resolve([])
                }
            })
        })
    }

    getHistoryPlays(args) {
        return new Promise(resolve => {
            conn.pool.query('call sp_read_appuser_liveplay(?,?)', [args.userId, args.gameId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve([]);
                }

                if (result && result.length > 0) {
                    const historyPlays = []
                    for (let i=0; i<result[0].length; i++) {
                        const item = result[0][i]
                        let hPlay = historyPlays.filter(o => o.questionId === item.parent_question_id)[0]
                        if (hPlay) {
                            if (hPlay.livegameAnswers) {
                                if (item.m_question_id) {
                                    hPlay.livegameAnswers.push({
                                        answer: item.m_answer,
                                        correctAnswer: item.m_correct_answer,
                                        feeCounterValue: item.fee_counter,
                                        id: item.m_question_id,
                                        isCredited: item.m_is_credited,
                                        isStarCredited: item.m_is_star_credited,
                                        multiplier: item.m_multiplier,
                                        shortHand: item.m_shorthand,
                                        points: item.m_points,
                                        tokens: item.m_tokens,
                                        stars: item.m_stars
                                    })
                                }
                            }
                        } else {
                            hPlay = {
                                answer: '',
                                correctAnswer: '',
                                //ended: item.date_ended ? new Date(item.date_ended).getTime() : null,
                                ended: item.date_ended || null, //--analytics
                                extraPoints: 0,
                                feeCounterValue: item.fee_counter,
                                isPending: item.is_pending ? true : false,
                                isPresetTeamChoice: item.is_preset_teamchoice ? true : false,
                                isMissedPlayHasShown: item.is_missed_play_has_shown ? true : false,
                                isStar: item.is_star ? true : false,
                                multiplier: item.multiplier,
                                questionId: item.parent_question_id,
                                shortHand: item.shorthand,
                                stars: item.stars,
                                //started: item.date_started ? new Date(item.date_started).getTime() : null,
                                started: item.date_started || null, //--analytics
                                length: item.date_ended ? 0 : 1,
                                isLocked: item.is_locked ? true : false,
                                type: item.type,
                                livegameAnswers: []
                            }
                            if (item.m_question_id) {
                                hPlay.livegameAnswers.push({
                                    answer: item.m_answer,
                                    correctAnswer: item.m_correct_answer,
                                    feeCounterValue: item.fee_counter,
                                    id: item.m_question_id,
                                    isCredited: item.m_is_credited ? true : false,
                                    isStarCredited: item.m_is_star_credited ? true : false,
                                    multiplier: item.m_multiplier,
                                    shortHand: item.m_shorthand,
                                    points: item.m_points,
                                    tokens: item.m_tokens,
                                    stars: item.m_stars
                                })
                            }

                            historyPlays.push(hPlay)
                        }
                    }

                    setTimeout(() => {
                        conn.redisClient.hset('u'+args.userId, args.gameId, JSON.stringify(historyPlays))
                        return resolve(historyPlays)
                    }, 0)
                } else {
                    return resolve([])
                }
            })
        })
    }

    addHistoryPlay(args) {
        return new Promise((resolve, reject) => {

            conn.redisClient.hget('u'+args.userId, args.gameId, (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err);
                }
                let hplays = []
                if (obj) {
                    hplays = JSON.parse(obj)
                    hplays.push(args.historyPlay)
                } else {
                    hplays.push(args.historyPlay)
                }
                conn.redisClient.hset('u'+args.userId, args.gameId, JSON.stringify(hplays), () => {
                    //TODO: SAVE TO MYSQL
                    // for (let x=0; x<2000; x++) {
                    //     this.addHistoryPlayDB(args)
                    // }

                    this.addHistoryPlayDB(args)

                    //this.sample()
                })

                return resolve(hplays)
            })

        })
    }

    addHistoryPlayORIG(args) {
        return new Promise((resolve, reject) => {

            conn.redisClient.hgetall('u'+args.userId, (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err);
                }

                if (obj) {
                    let hplays = []
                    const item = Object.assign({}, obj)
                    if (item[args.gameId]) {
                        hplays = JSON.parse(item[args.gameId])
                        hplays.push(args.historyPlay)
                        item[args.gameId] = JSON.stringify(hplays)
                    } else {
                        item[args.gameId] = []
                        item[args.gameId].push(args.historyPlay)
                        hplays = item[args.gameId]
                        item[args.gameId] = JSON.stringify(item[args.gameId])
                    }
                    conn.redisClient.hmset('u'+args.userId, item)

                    //TODO: SAVE TO MYSQL
                    // for (let x=0; x<5000; x++) {
                    //     this.addHistoryPlayDB(args)
                    // }

                    this.addHistoryPlayDB(args)

                    //this.sample()

                    return resolve(hplays)
                } else {
                    return reject('Redis History Play does not exists')
                }
            })

        })
    }

    sample() {
        const js = {
            username: 'rel',
            pass: 'admin123',
            choices: [
                {type: 'liveplay'},
                {type: 'gamemaster'},
            ]
        }

        conn.pool.query(`call sp_create_sample(?)`, [JSON.stringify(js)], (err, result) => {
            console.log(result)
        })
    }

    updateHistoryPlay(args) {
        return new Promise((resolve, reject) => {

            conn.redisClient.hget('u'+args.userId, args.gameId, (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err);
                }
                let hplays = []
                if (obj) {
                    hplays = JSON.parse(obj)
                    const idx = hplays.findIndex(o => o.questionId === args.historyPlay.questionId)
                    if (idx > -1) {
                        hplays[idx] = args.historyPlay
                        setTimeout(() => {
                            conn.redisClient.hset('u'+args.userId, args.gameId, JSON.stringify(hplays))

                            //TODO SAVE TO MYSQL
                            this.updateHistoryPlayDB(args)

                            return resolve(hplays)
                        }, 0)
                    }
                }
            })
        })
    }

    creditAward(args) {
	return this.creditAwardDB(args)
    }

    debitAward(args) {
	return this.debitAwardDB(args)
    }

    creditAwardDB(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_credit_appuser_award(?,?,?)', [args.userId, args.currency, args.amount], (err, rows) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (rows && rows.length > 0 && rows[0].length > 0) {
                    conn.redisClient.hset('u'+args.userId, args.currency, rows[0][0].r_amount, () => {
                        return resolve(rows[0][0].r_amount)
                    })
                } else {
                    return resolve(null)
                }
            })
        })
    }

    debitAwardDB(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_debit_appuser_award(?,?,?)', [args.userId, args.currency, args.amount], (err, rows) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (rows && rows.length > 0 && rows[0].length > 0) {
                    conn.redisClient.hset('u'+args.userId, args.currency, rows[0][0].r_amount, () => {
                        return resolve(rows[0][0].r_amount)
                    })
                } else {
                    return resolve(null)
                }
            })
        })
    }

    addHistoryPlayDB(args) {
		return db_queries.addHistoryPlay(args);
    }

    updateHistoryPlayDB(args) {
        return new Promise(resolve => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    db.release()
                    return resolve(null)
                }
                if (db) {
                    db.beginTransaction((err) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            db.release()
                            return resolve(null)
                        }

                        db.query('call sp_update_appuser_liveplay(?,?,?,?,?,?,?)',
                            [
                                args.gameId,
                                args.userId,
                                args.historyPlay.questionId,
                                args.historyPlay.shortHand,
                                args.historyPlay.isPending,
                                //args.historyPlay.ended ? timestampToDate(args.historyPlay.ended) : null,
                                args.historyPlay.ended || null, //--analytics
                                args.historyPlay.isLocked
                            ], (err, result) => {
                                if (err) {
                                    db.rollback(() => {
                                    })
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    db.release()
                                    return resolve(null)
                                }

                                if (!result || (result && result.length < 1)) {
                                    db.rollback(() => {
                                    })
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | Did not return liveplay_id.')
                                    db.release()
                                    return resolve(null)
                                }

                                if (args.historyPlay.livegameAnswers && args.historyPlay.livegameAnswers.length > 0) {
                                    const existingId = result[0][0].r_liveplay_id
                                    for (let i = 0; i < args.historyPlay.livegameAnswers.length; i++) {
                                        const ans = args.historyPlay.livegameAnswers[i]
                                        db.query('call sp_update_appuser_liveplay_detail(?,?,?,?,?,?,?,?)',
                                            [
                                                existingId,
                                                ans.id,
                                                ans.correctAnswer,
                                                ans.points,
                                                ans.tokens,
                                                ans.stars,
                                                ans.isCredited,
                                                ans.isStarCredited
                                            ], (err, result) => {
                                                if (err) {
                                                    db.rollback(() => {})
                                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                    db.release()
                                                    return resolve(null)
                                                }
                                            })
                                    }
                                }

                                if (args.awards && args.awards.length > 0) {
                                    for (let j=0; j<args.awards.length; j++) {
                                        const award = args.awards[j]
                                        db.query('call sp_credit_appuser_award(?,?,?)', [args.userId, award.currency, award.amount], (err, rows) => {
                                            if (err) {
                                                db.rollback(() => {})
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                db.release()
                                                return resolve(null)
                                            }
                                        })
                                    }
                                }

                                    db.commit((err) => {
                                        if (err) {
                                            db.rollback(() => {})
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                            db.release()
                                            return resolve(null)
                                        }

                                        db.release()
                                        return resolve(result)
                                    })

                                // } else {
                                //
                                //     db.commit((err) => {
                                //         if (err) {
                                //             db.rollback(() => {
                                //             })
                                //             logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                //             db.release()
                                //             return resolve(null)
                                //         }
                                //
                                //         db.release()
                                //         return resolve(result)
                                //     })
                                //
                                // }

                            })
                    })
                }
            })
        })
    }

    createPrePicks(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_create_appuser_prepick(?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    args.gameId,
                    args.prePickId,
                    args.userId || 2,
                    args.anonymousUserId || null,
                    args.answer,
                    args.shortHand,
                    args.type,
                    args.sequence,
                    args.points,
                    args.tokens,
                    args.eventTimeStart || null,
                    args.eventTimeStop || null
                ],
                (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                return resolve(result)
            })
        })
    }

    readPrePicks(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_appuser_prepicks(?,?,?)', [args.gameId, args.userId, args.anonymousUserId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (result) {
                    return resolve({
                        gamePrePicks: result[0] || [],
                        participants: result[1] || [],
                        userPrePicks: result[2] || [],
                        timeStart: result[3][0].timeStart ? new Date(result[3][0].timeStart).toString() : null,
                        dateStart: result[3][0].dateStart ? new Date(result[3][0].dateStart).toString() : null,
                        userLivePlayCount: result[4][0].userLivePlayCount
                    })
                }

            })
        })
    }

    createPrize(args, socket) {
		//todo
		return db_queries.createPrize(args, socket)
    }

    updateProfile(args) {
	return db_queries.appuser.updateProfile(args)
    }

    payment(args, socket) {
		return db_queries.appuser.order(args, socket)
        /*return new Promise((resolve, reject) => {
            //TODO
            //example:
            // message: "success" or "error"
            // return resolve(message)
        })*/
    }

    readPaymentInfo(args) {
        return db_queries.appuser.readPaymentInfo(args)
    }

    readGameHistory(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_read_appuser_gamehistory(?)', [args.userId], async(err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                const gameHistory = []
                if (result) {
                    if (result[0]) {
                        for (let i=0; i<result[0].length; i++) {
                            const row = result[0][i]
                            let _participants = []
                            if (result[1]) {
                                _participants = await result[1].filter(o => o.game_id === row.game_id)
                            }

                            await gameHistory.push({
                                gameId: row.game_id,
                                pointsEarned: row.points_earned,
                                tokensUsed: row.tokens_used,
                                sportType: row.sport_type,
                                sportTypeName: row.sport_type_name,
                                sportTypeIcon: row.sport_type_icon,
                                sportTypeIconHover: row.sport_type_icon_hover,
                                participants: _participants,
                                averageWinLoss: row.avg_win_loss,
                                gameLengthHours: row.game_length_hours,
                                gameLengthMinutes: row.game_length_minutes
                            })
                        }
                    }

                    return resolve({gameHistory: gameHistory})
                }
                return resolve({gameHistory: null})
            })
        })
    }

    readGameHistoryById(args) {
        return new Promise(resolve => {
            conn.pool.query('call sp_read_appuser_gamehistory_by_id(?,?)', [args.gameId, args.userId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null)
                }
                if (result) {
                    return resolve({prePicks: result[0], livePlays: result[1]})
                }
                return resolve(null)
            })
        })
    }
/*
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
*/

    anonymousSignup() {
        const _anonUser = {anonymousUserId: anonymousUserToken(100), currencies: {tokens: 0, points: 0, stars: 0}};
        return new Promise(resolve => {
            conn.pool.query('insert into anonymous_user(anonymous_user_id) values(?)', [_anonUser.anonymousUserId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null)
                }
                return resolve(_anonUser)
            })
        })
    }

    anonymousLogin(args) {
        return new Promise(resolve => {
            conn.pool.query('select * from anonymous_user where anonymous_user_id = ?', [args.anonymousUserId], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null)
                }
                if (result && result[0] && result[0].anonymous_user_id) {
                    const response = {
                        anonymousUserId: result[0].anonymous_user_id,
                        currencies: {
                            points: result[0].points,
                            tokens: result[0].tokens,
                            stars: result[0].stars
                        }
                    }
                    return resolve(response)
                } else {
                    this.anonymousSignup()
                        .then(response => {
                            if (response) {
                                return resolve(response)
                            } else {
                                return resolve(null)
                            }
                        })
                }
            })
        })
    }

}

module.exports = UserDbComponent