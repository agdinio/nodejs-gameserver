const ParticipantStore = require('../stores/ParticipantStore')
const GameStore = require('../stores/GameStore')
const PlayStore = require('../stores/PlayStore')
const UserStore = require('../stores/UserStore')
const { dateTimeZone } = require('../utilities/helper')
const AnalyticsComponent = require('./AnalyticsComponent')

class GameServerComponent {

    constructor(db, userDbComponent, environment) {
        this.db = db
        this.userDbComponent = userDbComponent
        this.environment = environment
        this.participantStore = new ParticipantStore(db)
        this.gameStore = new GameStore(db)
        this.playStore = new PlayStore(db)
    }

/*
    login__(args) {
        return this.db.login__(args)
    }
*/

    initHostChannel(channel, socket, scServer) {
        this.channel = channel
        this.scServer = scServer
        this.socket = socket

        const gameId = channel.name.split('.')[0]

        this.playStore.setHostChannel(channel);
        this.playStore.setHostSCServer(scServer);
        this.playStore.setSocket(socket);
        this.gameStore.setHostChannel(channel);
        this.gameStore.setHostSCServer(scServer);
        this.db.setHostChannel(channel);

        new Promise(resolve => {
            if (channel.watchers() <= 0) {
                channel.watch(data => {
                    switch (data.event) {
                        case 'host.play.add':
                            data.data.gameId = gameId
                            this.playStore.addPlay(data.data)
                            break
                        case 'host.play.update':
                            this.playStore.updatePlay(data.data)
                            break
                        case 'host.play.remove':
                            data.data.gameId = gameId
                            this.playStore.removePlay(data.data)
                            break
                        case 'host.game.start':
                            this.gameStore.gameStart(data.data)
                            break
                        case 'host.game.resume':
                            this.gameStore.gameResume(data.data)
                            break
                        case 'host.game.pause':
                            this.gameStore.gamePause(data.data)
                            break
                        case 'host.play.go':
                            this.playStore.goPlay(data.data, true)
                            break
                        case 'host.play.resolve':
                            data.data.gameId = gameId
                            this.playStore.resolvePlay(data.data, true)
                            break
                        case 'host.play.endplay':
                            data.data.gameId = gameId
                            this.playStore.endCurrentPlay(data.data, true)
                            break
                        case 'host.game.reset':
                            this.gameStore.reset(data.data)
                            break
                        case 'host.game.end':
                            data.data.isFootageRecorded = true
                            this.gameStore.gameEnd(data.data, true)
                            data.data.dateEndSession = dateTimeZone(new Date())
                            socket.exchange.publish('admin.game.update', data.data);
                            break
                        case 'host.prepick.resolve':
                            this.playStore.resolvePrePick(data.data)
                            break
                        case 'host.play.stack.update':
                            this.playStore.playStackUpdate(data.data)
                            break
                        case 'host.sync.request':
                            this.playStore.syncRequest(data.data)
                            break
                        case 'host.team.select':
                            this.playStore.selectTeam(data.data)
                            break
                        case 'host.play.assemble':
                            this.playStore.assemblePlay(data.data)
                            break
                        case 'host.star.select':
                            this.playStore.starSelect(data.data)
                            break
                        case 'host.session.startinit':
                            this.playStore.sessionStartInit(data.data)
                            break
                        case 'host.sync':
                            this.playStore.sync(data.data)
                            break
                        case 'host.automation.headless':
                            this.gameStore.setHeadless(data.data);
                            break
                        case 'host.recording.reset':
                            this.gameStore.recordingReset(data.data)
                                .then(info => {
                                    channel.publish({event: 'host.info.respond', data: info})
                                    this.playStore.initPlays(data.data.gameId, true)
                                })
                            break
                        case 'host.automation.paused':
                            this.gameStore.automationPaused(data.data)
                            break
                        case 'host.automation.resumed':
                            this.gameStore.automationResumed(data.data)
                            break
                        case 'host.play.move':
                            this.playStore.movePlay(data.data)
                            break

                        case 'host.automation.restart':
                            this.gameStore.initInfo({
                                gameId: data.data.gameId,
                                isViewRecordedEvent: false,
                                isHeadless: data.data.isHeadless,
                                executionType: data.data.executionType
                            }).then(info => {
                                info.automationRestartedServerCallback = true
                                channel.publish({event: 'host.info.respond', data: info})
                                this.playStore.initPlays(gameId, true)

                                /**
                                 * AUTOMATION
                                 * Reset Game App if hostcommand is in automation mode.
                                 */
                                if (info && (info.recordedPlays && info.recordedPlays.length > 0)) {
                                    if (channel && this.gameStore.gameChannel) {
                                        if (channel.name.split('.')[0].toLowerCase() === this.gameStore.gameChannel.name.split('.')[0].toLowerCase()) {
                                            this.initGameChannel(this.gameStore.gameChannel, this.gameStore.socket, true)
                                        }
                                    }
                                }
                            })
                            break
                    }
                })

            }
            resolve()
        })
            .then(_ => {
                this.scServer.clients[this.socket.id].emit('client.automation.credentials', null, response => {
                    let _isViewRecordedEvent = false
                    let _isHeadless = false
                    let _executionType = ''
                    if (response && Object.keys(response).length > 0) {
                        const parsed = JSON.parse(response)
                        this.gameStore.setClientAutomationCredentials(parsed)
                        _isViewRecordedEvent = parsed.isViewRecordedEvent || false
                        _isHeadless = parsed.headless ? true : false
                        _executionType = parsed.executionType
                    }

                    this.gameStore.initInfo({
                        gameId: gameId,
                        isViewRecordedEvent: _isViewRecordedEvent,
                        isHeadless: _isHeadless,
                        executionType: _executionType
                    }).then(info => {
                        const subscribersCount = this.scServer.exchange._broker._clientSubscribersCounter[`${gameId}.host`];
                        if (subscribersCount > 1) {
                            if (this.scServer.clients[this.socket.id]) {
                                this.scServer.clients[this.socket.id].emit('client.info', info)
                            }
                            this.playStore.clientInitPlays(gameId)
                        } else {
                            channel.publish({event: 'host.info.respond', data: info})
                            this.playStore.initPlays(gameId, true)
                        }

                        /**
                         * AUTOMATION
                         * Reset Game App if hostcommand is in automation mode.
                         */
                        if (info && (info.recordedPlays && info.recordedPlays.length > 0)) {
                            if (channel && this.gameStore.gameChannel) {
                                if (channel.name.split('.')[0].toLowerCase() === this.gameStore.gameChannel.name.split('.')[0].toLowerCase()) {
                                    this.initGameChannel(this.gameStore.gameChannel, this.gameStore.socket, true)
                                }
                            }
                        }
                    })
                })

            })


        this.socket.on('unsubscribe', () => {
            const subscribersCount = this.scServer.exchange._broker._clientSubscribersCounter[channel.name];
            console.log(`UNSUBSCRIBED ${channel.name} subscribers count:`, subscribersCount)
            if (!subscribersCount) {
                this.db.saveLastSequences({gameId: gameId})
            }
        })

    }

    readUpdatedGameInfo(args) {
        this.gameStore.initInfo({gameId: args.gameId})
            .then(info => {
            this.playStore.initPlays(args.gameId, true)
        })
    }

    initGameChannel12252020(channel, socket) {
        this.socket = socket

        const gameId = channel.name.split('.')[0]

        this.playStore.setGameChannel(channel);
        this.gameStore.setGameChannel(channel);

        let respond = {}
        /*
                setTimeout(() => {
                    this.gameStore.getInfo(gameId).then(info => {
                        respond.info = info
                        return this.playStore.initPlays(gameId)
                    })
                        .then(response => {
                            respond.plays = {previous: response.previous, current: response.current}

                            if (this.socket.getAuthToken()) {
                                this.userDbComponent.login({
                                    username: this.socket.getAuthToken().username,
                                    password: this.socket.getAuthToken().password
                                })
                                    .then(profile => {
                                        respond.profile = profile
                                        return this.userDbComponent.getHistoryPlays({gameId: gameId, userId: profile.user_id})
                                    })
                                    .then(resHistoryPlays => {
                                        respond.historyPlays = resHistoryPlays
                                        this.socket.emit('game.info', respond)
                                    })
                            } else {
                                this.socket.emit('game.info', null)
                            }

                        })
                        .catch(err => {
                            this.socket.emit('game.info', null)
                            throw err;
                        })
                }, 1000)
        */

        return new Promise(resolve => {
            const userStore = new UserStore(this.gameStore, this.playStore, this.userDbComponent)

            if (!this.socket.getAuthToken()) {
                this.socket.emit('game.info', null)
                return resolve(null)
                return
            }

            userStore.getInfo(gameId)
                .then(info => {
                    respond.info = info
                    return userStore.initPlays(gameId)
                })
                .then(response => {
                    respond.plays = {previous: response.previous, current: response.current}
                    userStore.login({
                        username: this.socket.getAuthToken().email,
                        password: this.socket.getAuthToken().password,
                        game_id: gameId
                    })
                        .then(profile => {
                            respond.profile = profile
                            return userStore.getHistoryPlays({gameId: gameId, userId: profile.userId})
                        })
                        .then(resHistoryPlays => {
                            respond.historyPlays = resHistoryPlays
                            return resolve(respond)
                        })

                })
                .catch(err => {
                    throw err;
                    return resolve(null)
                })

        })

    }

    initGameChannel(channel, socket, isAutomation) {
        this.socket = socket

        const gameId = channel.name.split('.')[0]

        this.playStore.setGameChannel(channel);
        this.gameStore.setGameChannel(channel);
        this.gameStore.setSocket(socket)

        let respond = {}

        return new Promise(resolve => {
            const userStore = new UserStore(this.gameStore, this.playStore, this.userDbComponent)

            if (!socket.getAuthToken()) {
                socket.emit('game.info', null)
                return resolve(null)
            }

            userStore.getInfo(gameId)
                .then(info => {
                    respond.info = info
                    return userStore.initPlays(gameId)
                })
                .then(response => {
                    respond.plays = {previous: response.previous, current: response.current}
                    userStore.login({
                        username: socket.getAuthToken().email,
                        password: socket.getAuthToken().password,
                        game_id: gameId,
                        passwordExempted: true
                    })
                        .then(profile => {
                            respond.profile = profile
                            return userStore.getHistoryPlays({gameId: gameId, userId: profile.userId})
                        })
                        .then(resHistoryPlays => {
                            respond.historyPlays = resHistoryPlays

                            if (isAutomation) {
                                respond.isRefresh = true
                                socket.emit('game.info', respond)
                            }

                            return resolve(respond)
                        })
                        .catch(errlogin => {
                            return resolve(null)
                        })
                })
                .catch(err => {
                    throw err;
                    return resolve(null)
                })

        })

    }

    insertRecordedAutomation(args) {
        this.db.insertRecordedAutomation(args)
    }

    saveRecordedPlays(args) {
        this.db.saveRecordedPlays(args)
    }

    saveLastSessionTime(args) {
        this.db.saveLastSessionTime(args)
    }

    automationPaused(args) {
        this.gameStore.automationPaused(args)
    }

    automationResumed(args) {
        this.gameStore.automationResumed(args)
    }

    prettify(body) {
        return JSON.stringify(body, null, '\t')
    }
}

module.exports = GameServerComponent