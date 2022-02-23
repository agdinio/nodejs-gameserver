const conn = require('../DbConnection')
const logger = require('./logger')
const { timestampToDate, lineNumber, dateTimeZone } = require('../utilities/helper')
const appuser = require('./db/appuser')
const dateFormat = require('dateformat')

class DbQueries {
	
	constructor() {
		this.appuser = appuser
	}

    async verifyUser(email , password){
        return new Promise((resolve , reject)=>{
            let verifyUserDetails = `CALL sp_read_appuser_by_email('${email}', '${password}')`
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(verifyUserDetails, (err, result) => {
                        if(err){
                            reject(false)
                        }else{
                            if(result[0].length > 0){
                                resolve(result[0])
                            }else{
                                reject(false)
                            }
                        }
                    })
                }
            })
        })
    }


    async deleteUserDetails(email , password , user_id){
        return new Promise((resolve , reject)=>{
            let getUserDetails = `select * from customer where customer_id = ${user_id}`
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(getUserDetails, (err, result) => {
                        let operator = result[0]
                        if(operator.customer_id == user_id){
                            let viewUserDetails = `select * from appuser_prizeboard_prize where appuser_id = ${user_id} order by currency_type;`
                            db.query(viewUserDetails, (err, result1) => {
                                let deleteQuery = `delete from appuser_prizeboard_prize where appuser_id = ${user_id};`
                                db.query(deleteQuery, (err, result2) => {
                                    resolve(result2)
                                })
                            })
                        }
                        
                    })
                }
            })
        })
       // return email
    }

    /* Check email is present or not */
    async checkEmailCustomer(email){
        return new Promise((resolve , reject)=>{
            let checkPresentEmail = `SELECT COUNT(*) as count from customer where email='${email}'`
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(checkPresentEmail, (err, result) => {
                        if(err){
                            return reject(err)
                        }
                        console.log("resulet" , result[0])
                        return resolve(result[0])
                    })
                }
            })
        })
    }
    
    async updatePasswordCustomer(email , password){
        return new Promise(async (resolve , reject)=>{
            //let updateCustomer = 'UPDATE SET'
            if(!password || typeof(password) !== 'string' || !password.length) return reject('Password is not valid')
            resolve("updated")
        })
    }
	
loginAdminUser(args) {
	return new Promise((resolve, reject) => {
		let q = "SELECT u.username, u.user_id AS admin_id, u.user_group_id AS admin_group_id, u.firstname, u.lastname, u.email, (IFNULL(u.access_game_admin, ug.access_game_admin)) AS access_game_admin, (IFNULL(u.access_host_command, ug.access_host_command)) AS access_host_command, ug.`name` AS group_name FROM `user` u, user_group ug WHERE username = ? AND `p_sh` = SHA2(CONCAT(SUBSTR(s_sh, 1, 5), SHA2(CONCAT(SHA2(?, 256), SUBSTR(s_sh, 6, 5)), 256)), 256) AND `status` = '1' AND ug.user_group_id = u.user_group_id LIMIT 1";
			
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                return reject(err)
            }

            if (db) {
                db.query(q, [args.username, args.password], (err, result) => {
                    db.release()
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return reject(err)
                    }
                    
                    if(result && Array.isArray(result) && result.length) {
						if(typeof result[0].access_host_command !== 'boolean') result[0].access_host_command = parseInt(result[0].access_host_command) > 0
						if(typeof result[0].access_game_admin !== 'boolean') result[0].access_game_admin = parseInt(result[0].access_game_admin) > 0
						const operator = {
                                username: result[0].username,
                                id: result[0].admin_id,
                                groupId: result[0].admin_group_id,
                                firstName: result[0].firstname,
                                lastName: result[0].lastname,
                                email: result[0].email,
                                groupName: result[0].group_name,
                                access: {
                                    gameAdmin: result[0].access_game_admin,
                                    hostCommand: result[0].access_host_command
                                }
						}
						return resolve(operator)
					} else {
						return resolve(false)
					}
                })
            }
        })
	})
}
	
			
	
	readDsSettings() {
		return this.appuser.readDsSettings()
	}

	readCountries() {
        return new Promise((resolve, reject) => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `HOST SUBSCRIBE: ${err}`)
                    return reject(err)
                }

                if (db) {
                    db.query('SELECT country_id as countryId, iso_code_2 as `code`, `name` FROM country', (err, result) => {
                        db.release()
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return reject(err)
                        }

                        if (result && result.length > 0) {
                            return resolve(result)
                        }
                    })
                }
            })
        })
    }

	readStates() {
        const ds_settings = this.readDsSettings()
        return new Promise((resolve, reject) => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `HOST SUBSCRIBE: ${err}`)
                    return reject(err)
                }

                if (db) {
                    db.query('SELECT `code`, `name` FROM `zone` WHERE country_id = ? order by `code`', [ds_settings.config_country_id], (err, result) => {
                        db.release()
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return reject(err)
                        }

                        if (result && result.length > 0) {
                            return resolve(result)
                        }
                    })
                }
            })
        })
    }

readCitiesByState(stateCode) {
	return new Promise((resolve, reject) => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `HOST SUBSCRIBE: ${err}`)
                return reject(err)
            }

            if (db) {
                db.query('SELECT `city_id` as cityId, `name`, `lat`, `long` FROM city WHERE state_code = ? order by `name`', [stateCode], (err, result) => {
                    db.release()
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return reject(err)
                    }

                    if (result && result.length > 0) {
                        return resolve(result)
                    }
                })
            }
        })
    })
}


    addHistoryPlay(args) {
        return new Promise(resolve => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err + ' | ' + args.historyPlay.type + '-' + args.historyPlay.questionId)
                    return resolve(null)
                }
                if (db) {
                    db.beginTransaction((err) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            db.release()
                            return resolve(null)
                        }

                        // db.query(`INSERT INTO appuser_liveplay(game_id,
                        //                                     appuser_id,
                        //                                     type,
                        //                                     multiplier,
                        //                                     parent_question_id,
                        //                                     shorthand,
                        //                                     is_star,
                        //                                     is_pending,
                        //                                     is_preset_teamchoice,
                        //                                     is_missed_play_has_shown,
                        //                                     fee_counter,
                        //                                     stars,
                        //                                     date_started) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)`,

                        db.query('call sp_create_appuser_liveplay(?,?,?,?,?,?,?,?,?,?,?,?,?)',
                            [
                                args.gameId,
                                args.userId,
                                args.historyPlay.type,
                                args.historyPlay.multiplier,
                                args.historyPlay.questionId,
                                args.historyPlay.shortHand,
                                args.historyPlay.isStar,
                                args.historyPlay.isPending,
                                args.historyPlay.isPresetTeamChoice,
                                args.historyPlay.isMissedPlayHasShown,
                                args.historyPlay.feeCounterValue,
                                args.historyPlay.stars,
                                //args.historyPlay.started ? timestampToDate(args.historyPlay.started) : null
                                args.historyPlay.started || null //--analytics
                            ], (err, result) => {
                                if (err) {
                                    db.rollback(() => {
                                    })
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    db.release()
                                    return resolve(null)
                                }

                                let generatedId = 0
                                if (result[0]) {
                                    if (result[0].length > 0) {
                                        generatedId = result[0][0].lastInsertedId
                                    }
                                }

                                if (args.historyPlay.livegameAnswers && args.historyPlay.livegameAnswers.length > 0) {
                                    //const generatedId = result.insertId
                                    const answers = []
                                    for (let i=0; i<args.historyPlay.livegameAnswers.length; i++) {
                                        const ans = args.historyPlay.livegameAnswers[i]
                                        answers.push([
                                            generatedId,
                                            ans.id,
                                            ans.multiplier,
                                            ans.answer,
                                            ans.correctAnswer,
                                            ans.points,
                                            ans.tokens,
                                            ans.stars,
                                            ans.shortHand,
                                            ans.isCredited,
                                            ans.isStarCredited,
                                            // ans.eventTimeStart ? dateFormat(ans.eventTimeStart, 'yyyy-mm-dd hh:MM:ss') : null,
                                            // ans.eventTimeStop ? dateFormat(ans.eventTimeStop, 'yyyy-mm-dd hh:MM:ss') : null
                                            ans.eventTimeStart || null, //--analytics
                                            ans.eventTimeStop || null //--analytics
                                        ])
                                    }
                                    db.query(`INSERT INTO appuser_liveplay_detail(liveplay_id,
                                                                                    question_id,
                                                                                    multiplier,
                                                                                    answer,
                                                                                    correct_answer,
                                                                                    points,
                                                                                    tokens,
                                                                                    stars,
                                                                                    shorthand,
                                                                                    is_credited,
                                                                                    is_star_credited,
                                                                                    event_timestart,
                                                                                    event_timestop) VALUES ?`,
                                        [answers], (err, result) => {
                                            if (err) {
                                                db.rollback(() => {
                                                })
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                db.release()
                                                return resolve(null)
                                            }
                                            db.commit((err) => {
                                                if (err) {
                                                    db.rollback(() => {
                                                    })
                                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                    db.release()
                                                    return resolve(null)
                                                }

                                                db.release()
                                                return resolve(result)
                                            })

                                        })
                                } else {

                                    db.commit((err) => {
                                        if (err) {
                                            db.rollback(() => {
                                            })
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                            db.release()
                                            return resolve(null)
                                        }

                                        db.release()
                                        return resolve(result)
                                    })

                                }
                            })
                    })
                }
            })
        })

    }

    updateGameStage(args) {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return
            }

            if (db) {
                const dateStartSession = args.progress.toLowerCase() === 'live' ? dateTimeZone(new Date()) : null;
                const dateEndSession = args.progress.toLowerCase() === 'postgame' || args.isEnded ? dateTimeZone(new Date()) : null;
                //conn.pool.query('update affiliate set stage=?, date_start_session=coalesce(?, date_start_session), date_end_session=coalesce(?, date_end_session) where `code`=?',
                conn.pool.query('call sp_update_game_stage(?,?,?,?,?)',
                    [args.gameId, args.progress, dateStartSession, dateEndSession, args.isFootageRecorded], (err, result) => {
                    db.release()
                    if (err) {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        }
                    }
                })
            }
        })
    }
	
	createGame(args) {
		const ds_settings = this.readDsSettings();
		return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                return resolve(null)
            }

            if (db) {
                db.beginTransaction((err) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                        return resolve(null)
                    }

                    db.query('call sp_create_game(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                        [
                            args.gameId,
                            args.stage,
                            args.sportType,
                            args.subSportGenre,
                            args.isLeap,
                            args.leapType,
                            args.videoFootageId,
                            args.timeStart,
                            args.dateStart,
                            args.dateAnnounce,
                            args.datePrePicks,
                            args.countryCode,
                            args.stateCode,
                            args.city,
                            args.latlong.split(', ')[0],
							args.latlong.split(', ')[1],
                            args.stadium,
                            ds_settings.config_spgame_game_group,
                            ds_settings.config_spgame_email_domain,
                            ds_settings.config_default_tracking
                        ], (err, result) => {
                            if (err) {
                                db.rollback(() => {
                                })
                                db.release()
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                            }

                            //************participants
                            if (args.participants && args.participants.length > 0) {
                                let participants = []
                                args.participants.forEach(_participant => {
                                    participants.push([args.gameId,
                                        _participant.sequence,
                                        _participant.name,
                                        _participant.initial,
                                        _participant.topColor,
                                        _participant.bottomColor, 0])
                                })

                                db.query('INSERT INTO participant(game_id, `sequence`, `name`, initial, top_color, bottom_color, score) VALUES ?', [participants], (err, result) => {
                                    if (err) {
                                        db.rollback(() => {
                                        })
                                        db.release()
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                    }

                                    //!******************prepicks
                                    if (args.prePicks && args.prePicks.length > 0) {
                                        let pp = []
                                        args.prePicks.forEach(_pp => {
                                            pp.push(
                                                [args.gameId, _pp.sequence, _pp.questionHeader,
                                                    _pp.questionDetail, _pp.choiceType, _pp.choices,
                                                    _pp.points, _pp.tokens, _pp.forParticipant,
                                                    _pp.shortHand, _pp.type, _pp.backgroundImage,
                                                    _pp.info, ((_pp.sponsorId && !isNaN(parseInt(_pp.sponsorId)) && parseInt(_pp.sponsorId) > 0) ? _pp.sponsorId : null)]
                                            )
                                        })
                                        db.query('INSERT INTO prepick(' +
                                            'game_id,sequence,question_header,' +
                                            'question_detail,choice_type,choices,' +
                                            'points,tokens,for_participant,' +
                                            'shorthand,`type`,background_image,' +
                                            'info,sponsor_id) VALUES ?', [pp], (err, result => {
                                            if (err) {
                                                db.rollback(() => {
                                                })
                                                db.release()
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                            }

                                            db.commit((err) => {
                                                if (err) {
                                                    db.rollback(() => {
                                                    })
                                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                                }

                                                db.release();
                                                return resolve(args)
                                            })

                                        }))
                                    } else {
                                        db.commit((err) => {
                                            if (err) {
                                                db.rollback(() => {
                                                })
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                            }

                                            db.release();
                                            return resolve(args)
                                        })
                                    }
                                })

                            } else {
                                db.rollback(() => {
                                })
                                db.release();
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `NO PARTICIPANT`)
                            }
                            //************end participants
                        })

                })
            }
        })
    })
}

	updateGame(args) {
		return new Promise(resolve => {
        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | GAME ADMIN:' + err)
                return resolve(false)
            }
            if (db) {
                db.beginTransaction(err => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | GAME ADMIN:' + err)
                        return
                    }

                    const lat = args.latlong && args.latlong.split(',').length > 0 ? args.latlong.split(',')[0] : null
                    const long = args.latlong && args.latlong.split(',').length > 1 ? args.latlong.split(',')[1] : null
                    db.query('call sp_update_game(?,?,?,?,?,?,?,?,?,?,?,?)',
                        [
                            args.gameId,
                            args.stage,
                            args.timeStart,
                            args.dateStart,
                            args.dateAnnounce,
                            args.datePrePicks,
                            args.countryCode || null,
                            args.stateCode || null,
                            args.city || null,
                            lat,
                            long,
                            args.stadium || null
                        ], (err, result) => {
                            if (err) {
                                db.rollback(() => {
                                })
                                db.release()
                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | GAME ADMIN:' + err)
                                return resolve(false)
                            }

                            db.query('delete from prepick where game_id = ?', [args.gameId], (err, result) => {
                                if (err) {
                                    db.rollback(() => {})
                                    db.release()
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                    return resolve(false)
                                }

                                if (args.prePicks && args.prePicks.length > 0) {
                                    let pp = []
                                    args.prePicks.forEach(_pp => {
                                        pp.push(
                                            [args.gameId, _pp.sequence, _pp.questionHeader,
                                                _pp.questionDetail, _pp.choiceType, _pp.choices,
                                                _pp.points, _pp.tokens, _pp.forParticipant,
                                                _pp.shortHand, _pp.type, _pp.backgroundImage,
                                                _pp.info, ((_pp.sponsorId && !isNaN(parseInt(_pp.sponsorId)) && parseInt(_pp.sponsorId) > 0) ? _pp.sponsorId : null)]
                                        )
                                    })
                                    db.query('INSERT INTO prepick(' +
                                        'game_id,sequence,question_header,' +
                                        'question_detail,choice_type,choices,' +
                                        'points,tokens,for_participant,' +
                                        'shorthand,`type`,background_image,' +
                                        'info,sponsor_id) VALUES ?', [pp], (err, result => {
                                        if (err) {
                                            db.rollback(() => {})
                                            db.release()
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                            return resolve(false)
                                        }

                                        db.commit((err) => {
                                            if (err) {
                                                db.rollback(() => {})
                                                db.release();
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                                return resolve(false)
                                            }

                                            db.release();
                                            return resolve(true)
                                        })

                                    }))
                                } else {
                                    db.commit((err) => {
                                        if (err) {
                                            db.rollback(() => {})
                                            db.release();
                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME ADMIN: ${err}`)
                                            return resolve(false)
                                        }

                                        db.release();
                                        return resolve(true)
                                    })
                                }
                            })
                        })
                })
            }
        })
    })
}

    addPlay(play) {
        return new Promise(resolve => {

        conn.pool.getConnection((err, db) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                return resolve(0)
            }
            if (db) {
                db.beginTransaction((err) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        db.release()
                        return resolve(0)
                    }

                    if ('announce' === play.type.toLowerCase()) {
                        db.query('call sp_create_game_play_announce(?,?,?,?,?,?,?,?,?,?)',
                            [
                                play.gameId,
                                play.id,
                                play.type,
                                ((play.sponsorId && !isNaN(parseInt(play.sponsorId)) && parseInt(play.sponsorId) > 0) ? play.sponsorId : null),
                                play.announcements[0].value,
                                play.announcements[1].value,
                                play.announcements[2].value,
                                play.inProcess || false,
                                play.current || false,
                                play.started ? dateTimeZone(new Date()) : null
                            ], (err, result) => {
                                if (err) {
                                    db.rollback(() => {})
                                    db.release()
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    return resolve(0)
                                }
                                db.commit((err) => {
                                    if (err) {
                                        db.rollback(() => {})
                                        db.release()
                                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                        return resolve(0)
                                    }
                                    db.release()
                                    console.log('announce play added:' + play.id)
                                    return resolve(result[0][0].insertId);
                                })
                            })
                        // return
                    } else {

                        db.query('call sp_create_game_play(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                            [
                                play.gameId,
                                play.id,
                                play.playTitle,
                                play.participantId,
                                play.type,
                                play.award,
                                ((play.sponsorId && !isNaN(parseInt(play.sponsorId)) && parseInt(play.sponsorId) > 0) ? play.sponsorId : null),
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
                                play.started ? dateTimeZone(new Date()) : null
                            ],
                            (err, result) => {
                                if (err) {
                                    db.rollback(() => {})
                                    db.release()
                                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                    return resolve(0)
                                }

                                if (result && result[0]) {
                                    const generatedId = result[0][0].insertId
                                    const multiplierChoices = []
                                    const choicesForEachMultiplier = []
                                    for (let i=0; i<play.multiplierChoices.length; i++) {
                                        const mulChoice = play.multiplierChoices[i]
                                        multiplierChoices.push([
                                            generatedId,
                                            mulChoice.id,
                                            mulChoice.locked,
                                            mulChoice.preset,
                                            mulChoice.question,
                                            mulChoice.type
                                        ])

                                        for (let j=0; j<mulChoice.choices.length; j++) {
                                            const c = mulChoice.choices[j]
                                            choicesForEachMultiplier.push([
                                                mulChoice.id,
                                                c.value,
                                                c.nextId,
                                                parseInt(j + 1)
                                            ])
                                        }
                                    }

                                    db.query('insert into game_play_multiplier(game_play_id, question_id, locked, preset, question, `type`) values ?',
                                        [multiplierChoices],
                                        (err, result) => {
                                            if (err) {
                                                db.rollback(() => {})
                                                db.release()
                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                return resolve(0)
                                            }

                                            if (result) {
                                                db.query('insert into game_play_multiplier_choice(question_id, value, next_play_id, sequence) values ?',
                                                    [choicesForEachMultiplier],
                                                    (err, result) => {
                                                        if (err) {
                                                            db.rollback(() => {})
                                                            db.release()
                                                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                            return resolve(0)
                                                        }

                                                        db.commit((err) => {
                                                            if (err) {
                                                                db.rollback(() => {})
                                                                db.release()
                                                                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                                                                return resolve(0)
                                                            }
                                                            db.release()
                                                            console.log('play added:' + play.id)
                                                            return resolve(generatedId)
                                                        })
                                                    })
                                            }
                                        })
                                }


                            })

                        // return
                    }


                })
            }
        })

        })

    }

	createPrize(args, socket, httpRequest) {
		const ds_settings = this.readDsSettings();
		let game_id = args.game_id && args.game_id.length ? args.game_id : ds_settings.config_default_tracking;		
        return new Promise((resolve, reject) => {

            //-- mod by aurelio
            const ip = socket ? (socket && socket.remoteAddress ? socket.remoteAddress.replace('::ffff:', '') : '') : httpRequest.ip;
            const userAgent = socket ? (socket && socket.request && socket.request.headers && socket.request.headers.hasOwnProperty('user-agent') ? socket.request.headers['user-agent'] : '') : httpRequest.userAgent;
            const acceptLanguage = socket ? (socket && socket.request && socket.request.headers && socket.request.headers.hasOwnProperty('accept-language') ? socket.request.headers['accept-language'] : '') : httpRequest.acceptLanguage;

            conn.pool.query('call sp_create_appuser_prize(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                [
                    args.userId,
                    args.prizeBoardId,
                    args.prizeBoardPrizeId,
                    args.agreed,
                    args.claimed,
                    args.starUsed,
                    args.currencyType,
                    args.isDebitQuantity,
                    args.currencyAmount,
                    args.starForRedeem,					
					game_id,
					ds_settings.config_language_id,
					ds_settings.config_name,
					[ds_settings.config_spgame_store_url, game_id, ''].join('/'),
					ip,
					userAgent,
					acceptLanguage,
					ds_settings.config_spgame_prize_order_payment,
					ds_settings.config_spgame_prize_order_payment_method,
					ds_settings.config_spgame_prize_order_shipping,
					ds_settings.config_spgame_prize_order_shipping_method,
					ds_settings.config_currency,
					ds_settings.config_spgame_prize_order_status,
                    args.dateAdded,
                    args.dateClaimed,
                    args.id
                ], async (err, result) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return reject(err)
                    }
                    if (result) {

						//let _last = result.length - 2;
                        let _last = 2;
						//let _prelast = _last - 1;
                        let _prelast = 1;
                        for (let k=0; k<result[_prelast].length; k++) {
                            const raw = result[_prelast][k];
                            const images = await result[_last].filter(o => o.prizeBoardPrizeId === raw.prizeBoardPrizeId) || []
                            images.sort((a, b) => a.sequence - b.sequence)
                            const _images = []
                            images.forEach(img => {
								let _img = img.image.split('/');
                                _images.push(_img[_img.length - 1])
                            })
                            raw.images = _images;
                            raw.agreed = raw.agreed ? true : false
                            raw.claimed = raw.claimed ? true : false
                            raw.forRedeem = raw.forRedeem ? true : false
                        }
                        return resolve({userPrizes: result[_prelast] || [], updatedId: result[3] && result[3][0] ? result[3][0].updatedId : 0})
                    }
                })
        })
	}

	readZonesByCountry(args) {
        /**
         * args: countryId, countryCode
         */
        return new Promise((resolve, reject) => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (db) {
                    db.query('SELECT zone_id as zoneId, country_id as countryId, `code`, `name` FROM zone where status = 1 and country_id = ?', [args.countryId], (err, result) => {
                        db.release()
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return reject(err)
                        }

                        // if (result && result.length > 0) {
                        //     return resolve(result)
                        // }
                        return resolve(result)
                    })
                }
            })
        })
    }

    readCitiesByZone(args) {
        /**
         * args: zoneId, countryId
         */
        return new Promise((resolve, reject) => {
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }

                if (db) {
                    db.query('SELECT city_id as cityId, state_code as stateCode, `name` FROM city where zone_id = ?', [args.zoneId], (err, result) => {
                        db.release()
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return reject(err)
                        }

                        if (result && result.length > 0) {
                            return resolve(result)
                        } else {
                            return resolve(null)
                        }
                    })
                }
            })
        })
    }
}
module.exports = new DbQueries()
