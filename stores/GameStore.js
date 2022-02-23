const conn = require('../DbConnection');
const logger = require('../config/logger');
const VideoFootageStore = require('./VideoFootageStore');

class GameStore {
    constructor(db) {
        this.db = db
        this.progressStates = ['active', 'public', 'pregame', 'pending', 'live', 'postgame', 'end']
        this.automationTimeout = null
    }

    setHostChannel(hostChannel) {
        this.hostChannel = hostChannel
    }

    setGameChannel(gameChannel) {
        this.gameChannel = gameChannel
    }

    setSocket(socket) {
        this.socket = socket
    }

    setHostSCServer(scServer) {
        this.scServer = scServer
    }

    setHeadless(_headless) {
        conn.setHeadless(_headless)
    }
    setClientAutomationCredentials(credentials) {
        conn.setHeadless(credentials.headless)
        conn.setExecutionType(credentials.executionType)
    }

    serve() {
        if (this.hostChannel && this.gameChannel) {
            if (this.hostChannel.name.split('.')[0].toLowerCase() === this.gameChannel.name.split('.')[0].toLowerCase()) {
                return true
            }
        }

        return false
    }

    initInfo(args) {
        console.log('GameStore - initInfo')
        let Info = null
        let RedisInfo = null
        let vstore = null
        const subscribersCount = this.scServer.exchange._broker._clientSubscribersCounter[`${args.gameId}.host`];
        console.log(`SUBSCRIBED ${this.hostChannel.name} subscribers count:`, subscribersCount)

        return new Promise(async resolve => {

            if ('automation' === args.executionType) {
                /**
                 * AUTOMATION GAME
                 */
                if (args.isHeadless) {
                    this.db.readGameInfo(args, true).then(async response => {
                        if (response && response.progress) {
                            Info = {
                                gameId: args.gameId,
                                progress: response.progress,
                                dateEndSession: response.dateEndSession,
                                progressStates: this.progressStates,
                                participants: response.participants,
                                preset: response.presets,
                                baseOptions: response.baseOptions,
                                timePeriods: response.timePeriods,
                                interruptionPeriods: response.interruptionPeriods,
                                plays: response.plays,
                                venue: response.venue,
                                prePicks: response.prePicks,
                                recordedPlays: response.recordedPlays,
                                leapType: response.leapType,
                                lastSessionTime: response.lastSessionTime,
                                lastSequence: response.lastSequence,
                                HCommLastHeaderSequence: response.HCommLastHeaderSequence,
                                HCommLastPlaySequence: response.HCommLastPlaySequence,
                                HCommLastWait: response.HCommLastWait,
                                videoName: response.videoName || '',
                                videoPath: response.videoPath || '',
                                sponsorPackages: response.sponsorPackages,
                                sportTypes: response.sportTypes,
                                isFootageRecorded: response.isFootageRecorded
                            }
                            RedisInfo = {
                                gameId: args.gameId,
                                progress: response.progress,
                                dateEndSession: JSON.stringify(response.dateEndSession),
                                progressStates: JSON.stringify(this.progressStates),
                                participants: JSON.stringify(response.participants),
                                preset: JSON.stringify(response.presets),
                                baseOptions: JSON.stringify(response.baseOptions),
                                timePeriods: JSON.stringify(response.timePeriods),
                                interruptionPeriods: JSON.stringify(response.interruptionPeriods),
                                plays: JSON.stringify(response.plays),
                                venue: JSON.stringify(response.venue),
                                prePicks: JSON.stringify(response.prePicks),
                                stackOrder: JSON.stringify({
                                    stackPlays: [],
                                    nextPlay: null,
                                    currentPlay: null,
                                    unresolvedPlays: [],
                                    resolvedPlays: []
                                }),
                                originalPlays: JSON.stringify(response.originalPlays),
                                recordedPlays: JSON.stringify(response.recordedPlays),
                                leapType: response.leapType || '',
                                videoName: response.videoName || '',
                                videoPath: response.videoPath || '',
                                sponsorPackages: JSON.stringify(response.sponsorPackages),
                                automationPlays: JSON.stringify(response.automationPlays),
                                sportTypes: JSON.stringify(response.sportTypes),
                                isFootageRecorded: response.isFootageRecorded
                            }

                            await conn.redisClient.del('g'+args.gameId, async () => {
                                conn.redisClient.hmset('g'+args.gameId, RedisInfo)

                                //remove existing
                                vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                if (vstore) {
                                    vstore.timeStop();
                                    const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                    if (idxToRemove > -1) {
                                        conn.videoFootages.splice(idxToRemove, 1);
                                    }
                                }
                                //create new
                                conn.videoFootages.push(new VideoFootageStore(args.gameId));

                                return resolve(Info)
                            })

                        } else {
                            return resolve(null)
                        }
                    }).catch(async err => {
                        return resolve(null)
                    })
                } else {
                    conn.redisClient.hgetall('g'+args.gameId, (err, obj) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return resolve(null);
                        }

                        if (obj) {
                            Info = {
                                gameId: args.gameId,
                                progress: obj.progress,
                                dateEndSession: JSON.parse(obj.dateEndSession || '{}'),
                                progressStates: this.progressStates,
                                participants: JSON.parse(obj.participants || '[]'),
                                preset: JSON.parse(obj.preset || '[]'),
                                baseOptions: JSON.parse(obj.baseOptions || '[]'),
                                timePeriods: JSON.parse(obj.timePeriods || '[]'),
                                interruptionPeriods: JSON.parse(obj.interruptionPeriods || '[]'),
                                plays: JSON.parse(obj.plays || '[]'),
                                venue: JSON.parse(obj.venue || '{}'),
                                prePicks: JSON.parse(obj.prePicks || '[]'),
                                recordedPlays: JSON.parse(obj.recordedPlays || '[]'),
                                leapType: obj.leapType,
                                videoName: obj.videoName || '',
                                videoPath: obj.videoPath || '',
                                sponsorPackages: JSON.parse(obj.sponsorPackages || '[]'),
                                sportTypes: JSON.parse(obj.sportTypes || '[]')
                            }

                            return resolve(Info)
                        } else {
                            return resolve(null)
                        }
                    })
                }

            } else {
                /**
                 * NORMAL GAME
                 */
                this.db.readGameInfo(args, true).then(async response => {
                    if (response && response.progress) {
                        Info = {
                            gameId: args.gameId,
                            progress: response.progress,
                            dateEndSession: response.dateEndSession,
                            progressStates: this.progressStates,
                            participants: response.participants,
                            preset: response.presets,
                            baseOptions: response.baseOptions,
                            timePeriods: response.timePeriods,
                            interruptionPeriods: response.interruptionPeriods,
                            plays: response.plays,
                            venue: response.venue,
                            prePicks: response.prePicks,
                            recordedPlays: response.recordedPlays,
                            leapType: response.leapType,
                            lastSessionTime: response.lastSessionTime,
                            lastSequence: response.lastSequence,
                            HCommLastHeaderSequence: response.HCommLastHeaderSequence,
                            HCommLastPlaySequence: response.HCommLastPlaySequence,
                            HCommLastWait: response.HCommLastWait,
                            videoName: response.videoName || '',
                            videoPath: response.videoPath || '',
                            sponsorPackages: response.sponsorPackages,
                            sportTypes: response.sportTypes,
                            isFootageRecorded: response.isFootageRecorded || false
                        }
                        RedisInfo = {
                            gameId: args.gameId,
                            progress: response.progress,
                            dateEndSession: JSON.stringify(response.dateEndSession),
                            progressStates: JSON.stringify(this.progressStates),
                            participants: JSON.stringify(response.participants),
                            preset: JSON.stringify(response.presets),
                            baseOptions: JSON.stringify(response.baseOptions),
                            timePeriods: JSON.stringify(response.timePeriods),
                            interruptionPeriods: JSON.stringify(response.interruptionPeriods),
                            plays: JSON.stringify(response.plays),
                            venue: JSON.stringify(response.venue),
                            prePicks: JSON.stringify(response.prePicks),
                            stackOrder: JSON.stringify({
                                stackPlays: [],
                                nextPlay: null,
                                currentPlay: null,
                                unresolvedPlays: [],
                                resolvedPlays: []
                            }),
                            originalPlays: JSON.stringify(response.originalPlays),
                            recordedPlays: JSON.stringify(response.recordedPlays),
                            leapType: response.leapType || '',
                            videoName: response.videoName || '',
                            videoPath: response.videoPath || '',
                            sponsorPackages: JSON.stringify(response.sponsorPackages),
                            automationPlays: JSON.stringify(response.automationPlays),
                            sportTypes: JSON.stringify(response.sportTypes),
                            isFootageRecorded: response.isFootageRecorded || false
                        }

                        await conn.redisClient.del('g' + args.gameId, async () => {
                            conn.redisClient.hmset('g' + args.gameId, RedisInfo)

                            if ('recording' === response.leapType) {
                                if (subscribersCount === 1) {
                                    if (response.recordedPlayCount > 0) {
                                        vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                        if (vstore) {
                                            vstore.headerPlaySequence = response.HCommLastHeaderSequence
                                            vstore.playSequence = response.HCommLastPlaySequence
                                            vstore.timestampWait = response.HCommLastWait
                                            vstore.sequence = response.lastSequence
                                            vstore.currentTime = response.lastSessionTime
                                            Info.isTimeStarted = vstore.isTimeStarted
                                        } else {
                                            //create new
                                            vstore = new VideoFootageStore(args.gameId);
                                            vstore.headerPlaySequence = response.HCommLastHeaderSequence
                                            vstore.playSequence = response.HCommLastPlaySequence
                                            vstore.timestampWait = response.HCommLastWait
                                            vstore.sequence = response.lastSequence
                                            vstore.currentTime = response.lastSessionTime
                                            Info.isTimeStarted = vstore.isTimeStarted
                                            conn.videoFootages.push(vstore);
                                        }
                                    } else {
                                        //remove existing
                                        vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                        if (vstore) {
                                            vstore.timeStop();
                                            const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                            if (idxToRemove > -1) {
                                                conn.videoFootages.splice(idxToRemove, 1);
                                            }
                                        }
                                        //create new
                                        conn.videoFootages.push(new VideoFootageStore(args.gameId));
                                    }
                                } else {
                                    if (subscribersCount > 1) {
                                        if (response.recordedPlayCount > 0) {
                                            vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                            if (vstore) {
                                                Info.lastSequence = await vstore.sequence
                                                Info.HCommLastHeaderSequence = await vstore.headerPlaySequence
                                                Info.HCommLastPlaySequence = await vstore.playSequence
                                                Info.HCommLastWait = await vstore.timestampWait
                                                Info.isTimeStarted = vstore.isTimeStarted
                                            }
                                        } else {
                                            //remove existing
                                            vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                            if (vstore) {
                                                vstore.timeStop();
                                                const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                                if (idxToRemove > -1) {
                                                    conn.videoFootages.splice(idxToRemove, 1);
                                                }
                                            }
                                            //create new
                                            conn.videoFootages.push(new VideoFootageStore(args.gameId));
                                        }
                                    }
                                }
                            } else {
                                vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                if (vstore) {
                                    vstore.timeStop();
                                    const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                    if (idxToRemove > -1) {
                                        conn.videoFootages.splice(idxToRemove, 1);
                                    }
                                }
                            }

                            return resolve(Info)
                        })

                    } else {
                        vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                        if (vstore) {
                            vstore.timeStop();
                            const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                            if (idxToRemove > -1) {
                                conn.videoFootages.splice(idxToRemove, 1);
                            }
                        }
                        return resolve(null)
                    }
                }).catch(async err => {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                    if (vstore) {
                        vstore.timeStop();
                        const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                        if (idxToRemove > -1) {
                            conn.videoFootages.splice(idxToRemove, 1);
                        }
                    }
                    return resolve(null)
                })
            }
        })
    }








//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/*
    initInfoOLD(args) {
        console.log('GameStore - initInfo')
        let Info = null
        let RedisInfo = null
        const subscribersCount = this.scServer.exchange._broker._clientSubscribersCounter[`${args.gameId}.host`];


        // const vstore = conn.videoFootages.filter(o => o.gameId === gameId)[0];
        // if (vstore) {
        //     vstore.timeStop();
        //     const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === gameId);
        //     if (idxToRemove > -1) {
        //         conn.videoFootages.splice(idxToRemove, 1);
        //     }
        // }

        return new Promise(async resolve => {

            if (subscribersCount > 1 && 'automation' === args.executionType && !args.isHeadless) {

                conn.redisClient.hgetall('g'+args.gameId, (err, obj) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        return resolve(null);
                    }

                    if (obj) {
                        Info = {
                            gameId: args.gameId,
                            progress: obj.progress,
                            dateEndSession: JSON.parse(obj.dateEndSession || '{}'),
                            progressStates: this.progressStates,
                            participants: JSON.parse(obj.participants || '[]'),
                            preset: JSON.parse(obj.preset || '[]'),
                            baseOptions: JSON.parse(obj.baseOptions || '[]'),
                            timePeriods: JSON.parse(obj.timePeriods || '[]'),
                            interruptionPeriods: JSON.parse(obj.interruptionPeriods || '[]'),
                            plays: JSON.parse(obj.plays || '[]'),
                            venue: JSON.parse(obj.venue || '{}'),
                            prePicks: JSON.parse(obj.prePicks || '[]'),
                            recordedPlays: JSON.parse(obj.recordedPlays || '[]'),
                            leapType: obj.leapType,
                            videoName: obj.videoName || '',
                            videoPath: obj.videoPath || ''
                        }

                        return resolve(Info)
                    } else {
                        return resolve(null)
                    }
                })

            } else {
                if (subscribersCount > 1) {

                    conn.redisClient.hgetall('g'+args.gameId, (err, obj) => {
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return resolve(null);
                        }

                        if (obj) {
                            Info = {
                                gameId: args.gameId,
                                progress: obj.progress,
                                dateEndSession: JSON.parse(obj.dateEndSession || '{}'),
                                progressStates: this.progressStates,
                                participants: JSON.parse(obj.participants || '[]'),
                                preset: JSON.parse(obj.preset || '[]'),
                                baseOptions: JSON.parse(obj.baseOptions || '[]'),
                                timePeriods: JSON.parse(obj.timePeriods || '[]'),
                                interruptionPeriods: JSON.parse(obj.interruptionPeriods || '[]'),
                                plays: JSON.parse(obj.plays || '[]'),
                                venue: JSON.parse(obj.venue || '{}'),
                                prePicks: JSON.parse(obj.prePicks || '[]'),
                                recordedPlays: JSON.parse(obj.recordedPlays || '[]'),
                                leapType: obj.leapType,
                                videoName: obj.videoName || '',
                                videoPath: obj.videoPath || ''
                            }

                            return resolve(Info)
                        } else {
                            return resolve(null)
                        }
                    })

                } else {

                    let vstore = null
                    this.db.readGameInfo(args, true).then(async response => {
                        if (response && response.progress) {
                            Info = {
                                gameId: args.gameId,
                                progress: response.progress,
                                dateEndSession: response.dateEndSession,
                                progressStates: this.progressStates,
                                participants: response.participants,
                                preset: response.presets,
                                baseOptions: response.baseOptions,
                                timePeriods: response.timePeriods,
                                interruptionPeriods: response.interruptionPeriods,
                                plays: response.plays,
                                venue: response.venue,
                                prePicks: response.prePicks,
                                recordedPlays: response.recordedPlays,
                                leapType: response.leapType,
                                lastSessionTime: response.lastSessionTime,
                                lastSequence: response.lastSequence,
                                HCommLastHeaderSequence: response.HCommLastHeaderSequence,
                                HCommLastPlaySequence: response.HCommLastPlaySequence,
                                HCommLastWait: response.HCommLastWait,
                                videoName: response.videoName || '',
                                videoPath: response.videoPath || ''
                            }
                            RedisInfo = {
                                gameId: args.gameId,
                                progress: response.progress,
                                dateEndSession: JSON.stringify(response.dateEndSession),
                                progressStates: JSON.stringify(this.progressStates),
                                participants: JSON.stringify(response.participants),
                                preset: JSON.stringify(response.presets),
                                baseOptions: JSON.stringify(response.baseOptions),
                                timePeriods: JSON.stringify(response.timePeriods),
                                interruptionPeriods: JSON.stringify(response.interruptionPeriods),
                                plays: JSON.stringify(response.plays),
                                venue: JSON.stringify(response.venue),
                                prePicks: JSON.stringify(response.prePicks),
                                stackOrder: JSON.stringify({
                                    stackPlays: [],
                                    nextPlay: null,
                                    currentPlay: null,
                                    unresolvedPlays: [],
                                    resolvedPlays: []
                                }),
                                originalPlays: JSON.stringify(response.originalPlays),
                                recordedPlays: JSON.stringify(response.recordedPlays),
                                leapType: response.leapType || '',
                                videoName: response.videoName || '',
                                videoPath: response.videoPath || '',
                                automationPlays: JSON.stringify(response.automationPlays)
                            }

                            await conn.redisClient.del('g'+args.gameId, async () => {
                                conn.redisClient.hmset('g'+args.gameId, RedisInfo)

                                if ('recording' === response.leapType) {
                                    const subscribersCount = this.scServer.exchange._broker._clientSubscribersCounter[this.hostChannel.name]
                                    console.log(`SUBSCRIBED ${this.hostChannel.name} subscribers count:`, subscribersCount)
                                    if (subscribersCount === 1) {
                                        if (response.recordedPlayCount > 0) {
                                            vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                            if (vstore) {
                                                vstore.headerPlaySequence = response.HCommLastHeaderSequence
                                                vstore.playSequence = response.HCommLastPlaySequence
                                                vstore.timestampWait = response.HCommLastWait
                                                vstore.sequence = response.lastSequence
                                                vstore.currentTime = response.lastSessionTime
                                            } else {
                                                //create new
                                                vstore = new VideoFootageStore(args.gameId);
                                                vstore.headerPlaySequence = response.HCommLastHeaderSequence
                                                vstore.playSequence = response.HCommLastPlaySequence
                                                vstore.timestampWait = response.HCommLastWait
                                                vstore.sequence = response.lastSequence
                                                vstore.currentTime = response.lastSessionTime
                                                conn.videoFootages.push(vstore);
                                            }
                                        } else {
                                            //remove existing
                                            vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                            if (vstore) {
                                                vstore.timeStop();
                                                const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                                if (idxToRemove > -1) {
                                                    conn.videoFootages.splice(idxToRemove, 1);
                                                }
                                            }
                                            //create new
                                            conn.videoFootages.push(new VideoFootageStore(args.gameId));
                                        }
                                    } else {
                                        if (subscribersCount > 1) {
                                            if (response.recordedPlayCount > 0) {
                                                vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                                if (vstore) {
                                                    Info.lastSequence = await vstore.sequence
                                                    Info.HCommLastHeaderSequence = await vstore.headerPlaySequence
                                                    Info.HCommLastPlaySequence = await vstore.playSequence
                                                    Info.HCommLastWait = await vstore.timestampWait
                                                }
                                            } else {
                                                //remove existing
                                                vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                                if (vstore) {
                                                    vstore.timeStop();
                                                    const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                                    if (idxToRemove > -1) {
                                                        conn.videoFootages.splice(idxToRemove, 1);
                                                    }
                                                }
                                                //create new
                                                conn.videoFootages.push(new VideoFootageStore(args.gameId));
                                            }
                                        }
                                    }
                                } else {
                                    vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                                    if (vstore) {
                                        vstore.timeStop();
                                        const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                        if (idxToRemove > -1) {
                                            conn.videoFootages.splice(idxToRemove, 1);
                                        }
                                    }
                                }

                                return resolve(Info)
                            })

                        } else {
                            vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                            if (vstore) {
                                vstore.timeStop();
                                const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                                if (idxToRemove > -1) {
                                    conn.videoFootages.splice(idxToRemove, 1);
                                }
                            }
                            return resolve(null)
                        }
                    }).catch(async err => {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                        vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                        if (vstore) {
                            vstore.timeStop();
                            const idxToRemove = conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                            if (idxToRemove > -1) {
                                conn.videoFootages.splice(idxToRemove, 1);
                            }
                        }
                        return resolve(null)
                    })

                }


            }
        })
    }
*/

    getInfo(gameId) {
        console.log('GameStore - User getInfo')

        let Info = null

        return new Promise(resolve => {
            conn.redisClient.hgetall('g'+gameId, async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve(null);
                }

                if (obj) {
                    const vstore = await conn.videoFootages.filter(o => o.gameId === gameId)[0];
                    let _automationGameState = null
                    if (vstore) {
                        _automationGameState = {
                            footageCurrentTime: (vstore.automationTimestamp && 'paused' === (vstore.automationTimestamp.state || '') ? (vstore.automationTimestamp.running || 0) : vstore.currentTime),
                            state: vstore.automationTimestamp && vstore.automationTimestamp.state ? vstore.automationTimestamp.state : null
                        }
                    }

                    Info = {
                        gameId: obj.gameId,
                        progress: obj.progress,
                        progressStates: JSON.parse(obj.progressStates),
                        participants: JSON.parse(obj.participants),
                        preset: JSON.parse(obj.preset),
                        baseOptions: JSON.parse(obj.baseOptions),
                        //defaults: JSON.parse(obj.defaults),
                        timePeriods: JSON.parse(obj.timePeriods),
                        interruptionPeriods: JSON.parse(obj.interruptionPeriods),
                        venue: JSON.parse(obj.venue),
                        leapType: obj.leapType,
                        videoName: obj.videoName,
                        videoPath: obj.videoPath,
                        automationGameState: _automationGameState
                    }

                    return resolve(Info)
                } else {
                    this.db.readGameInfo({gameId: gameId}).then(async response => {
                        if (response && response.progress) {
                            const vstore = await conn.videoFootages.filter(o => o.gameId === gameId)[0];
                            let _automationGameState = null
                            if (vstore) {
                                _automationGameState = {
                                    footageCurrentTime: (vstore.automationTimestamp && 'paused' === (vstore.automationTimestamp.state || '') ? (vstore.automationTimestamp.running || 0) : vstore.currentTime),
                                    state: vstore.automationTimestamp && vstore.automationTimestamp.state ? vstore.automationTimestamp.state : null
                                }
                            }
                            Info = {
                                gameId: gameId,
                                progress: response.progress,
                                progressStates: this.progressStates,
                                participants: response.participants,
                                venue: response.venue,
                                leapType: response.leapType,
                                videoName: response.videoName,
                                videoPath: response.videoPath,
                                automationGameState: _automationGameState
                            }
                            return resolve(Info)
                        }
                            return resolve(null)
                        })
                        .catch(err => {
                            return resolve(null)
                        })
                }
            })
        })
    }

    gameStart(args) {
        //-- RELLY AUTOMATION
        if ('recording' === args.executionType || ('automation' === args.executionType && conn.headless)) {
            const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0]
            if (vstore && !vstore.isTimeStarted) {
                vstore.timeStart()
            }
        }

        // if (!conn.headless) {
        //     const vstore = new VideoFootageStore(args.gameId)
        //     vstore.timeStart()
        //     conn.videoFootages.push(vstore)
        // }
        //
        this.db.gameStart(args).then(response => {
            this.hostChannel.publish({event: 'host.game.update', data: response});
            if (this.serve()) {
                this.gameChannel.publish({event: 'game.game.update', data: response})
            }
        })
    }

    gameResumeOLD(args) {
        if (!conn.headless) {
            let vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
            if (vstore) {
                vstore.timeStart(args.lastSessionTime);
            } else {
                vstore = new VideoFootageStore(args.gameId)
                vstore.timeStart(args.lastSessionTime || 0)
                conn.videoFootages.push(vstore)
            }
        }

        this.hostChannel.publish({event: 'host.game.resume.respond', data: true});
    }

    gameResume(args) {
        const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            vstore.timeStart()
        }

        this.hostChannel.publish({event: 'host.game.resume.respond', data: true});
    }

    gamePause(args) {
        const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            vstore.timePause()
        }

        this.hostChannel.publish({event: 'host.game.pause.respond', data: true});
    }

    gameEnd(args) {
        this.db.gameEnd(args).then(response => {

            let Info = null

            conn.redisClient.hgetall('g'+args.gameId, async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return
                }

                const _unresolvePlays = await this.putUnresolved(args.gameId, response.plays)
                const _resolvedPlays = await this.putResolved(args.gameId, response.plays)

                if (obj) {
                    Info = {
                        gameId: obj.gameId,
                        progress: obj.progress,
                        dateEndSession: response.dateEndSession,
                        progressStates: JSON.parse(obj.progressStates),
                        participants: JSON.parse(obj.participants),
                        preset: JSON.parse(obj.preset),
                        baseOptions: JSON.parse(obj.baseOptions),
                        timePeriods: JSON.parse(obj.timePeriods),
                        interruptionPeriods: JSON.parse(obj.interruptionPeriods),
                        venue: JSON.parse(obj.venue),
                        sponsorPackages: JSON.parse(obj.sponsorPackages),
                        sportTypes: JSON.parse(obj.sportTypes)
                    }

                    if (this.serve()) {
                        Info.current = response.current
                        Info.previous = response.previous
                        this.gameChannel.publish({event: 'game.game.update', data: Info})
                    }

                    Info.currentPlay = null
                    Info.unresolvedPlays = _unresolvePlays
                    Info.resolvedPlays = _resolvedPlays
                    this.hostChannel.publish({event: 'host.game.update', data: Info});
                }


            })
        })

        this.hostChannel.publish({event: 'host.game.end.respond', data: true});
    }

    reset(gameId) {

        this.db.resetSession(gameId).then(response => {
            this.getInfo(gameId).then(info => {
                if (info) {
                    if (this.hostChannel) {
                        this.hostChannel.publish({event: 'host.game.update', data: info, hasReset: true});
                    }
                    if (this.serve()) {
                        this.gameChannel.publish({event: 'game.game.update', data: info, hasReset: true })
                    }
                } else {
                    this.initInfo({gameId: gameId}).then(info => {
                        if (this.hostChannel) {
                            this.hostChannel.publish({event: 'host.game.update', data: info, hasReset: true});
                        }
                        if (this.serve()) {
                            this.gameChannel.publish({event: 'game.game.update', data: info, hasReset: true })
                        }
                    })
                }
            })
        })
    }

    putUnresolved(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let plays = _plays && _plays.length > 0 ? await _plays.filter(o => !o.current && o.inProcess && !o.resultConfirmed) : []
                let _stackOrder = {
                    stackPlays: [],
                    nextPlay: null,
                    currentPlay: null,
                    unresolvedPlays: [],
                    resolvedPlays: []
                }

                if (obj) {
                    _stackOrder = await JSON.parse(obj)
                }

                _stackOrder.unresolvedPlays = await plays

                conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                return resolve(plays)
            })
        })
    }

    putResolved(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let plays = _plays && _plays.length > 0 ? await _plays.filter(o => !o.current && !o.inProcess && o.resultConfirmed) : []
                let _stackOrder = {
                    stackPlays: [],
                    nextPlay: null,
                    currentPlay: null,
                    unresolvedPlays: [],
                    resolvedPlays: []
                }

                if (obj) {
                    _stackOrder = await JSON.parse(obj)
                }

                _stackOrder.resolvedPlays = await plays

                conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                return resolve(plays)
            })
        })
    }

    recordingReset(args) {
        return new Promise(resolve => {
            this.db.recordingReset(args).then(async next => {
                if (next) {
                    const vstore = await conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
                    if (vstore) {
                        vstore.timeStop();
                        const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === args.gameId);
                        if (idxToRemove > -1) {
                            conn.videoFootages.splice(idxToRemove, 1);
                        }
                    }

                    this.initInfo(args).then(info => {
                        if (info) {
                            return resolve(info)
                        } else {
                            return resolve(null)
                        }
                    })
                }
            })
        })
    }

    automationPaused(args) {
        const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            console.log('GameStore 891 PAUSED', vstore)
            // this.gameChannel.publish({event: 'automation.game.state', data: {footageCurrentTime: args.running, state: 'paused'}})
            this.gameChannel.publish({event: 'automation.game.state', data: {footageCurrentTime: vstore.currentTime, state: 'paused'}})
            vstore.automationTimestamp = {state: 'paused', running: args.running, wait: args['wait']};
            vstore.timePause();
        }
    }

    async automationResumed_1(args) {
        const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            this.gameChannel.publish({
                event: 'automation.game.state',
                data: {
                    footageCurrentTime: vstore.automationTimestamp && vstore.automationTimestamp.running ? vstore.automationTimestamp.running : 0,
                    state: 'resumed'
                    }
            })
            vstore.currentTime = await vstore.automationTimestamp && vstore.automationTimestamp.running - 1 ? vstore.automationTimestamp.running : 0;
            vstore.timestampWait = await vstore.automationTimestamp && vstore.automationTimestamp.running - 1 ? vstore.automationTimestamp.running : 0;
            vstore.automationTimestamp = null
            vstore.timeStart();
        }
    }

    async automationResumed(args) {
        const vstore = conn.videoFootages.filter(o => o.gameId === args.gameId)[0];
        if (vstore) {
            console.log('GameStore 920 RESUMED', vstore, args)
            const _automationCurrentTimestamp = vstore.automationTimestamp && vstore.automationTimestamp.running ? vstore.automationTimestamp.running : 0;
                this.automationTimeout = setTimeout(() => {

                    this.gameChannel.publish({
                        event: 'automation.game.state',
                        data: {
                            footageCurrentTime: vstore.currentTime,
                            state: 'resumed'
                            }
                    })


                    vstore.automationTimestamp = null
                    vstore.timeStart();
                }, (vstore.currentTime - (_automationCurrentTimestamp - (_automationCurrentTimestamp && 1)  ) ) * 1000);
            }

            // vstore.currentTime = await vstore.automationTimestamp && vstore.automationTimestamp.running - 1 ? vstore.automationTimestamp.running : 0;
            // vstore.timestampWait = await vstore.automationTimestamp && vstore.automationTimestamp.running - 1 ? vstore.automationTimestamp.running : 0;
        //}
    }

}

module.exports = GameStore