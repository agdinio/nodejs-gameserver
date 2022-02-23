const sendResponse = require('../utilities/sendResponse')
const {dateTimeZone} = require('../utilities/helper')
const logger = require('../config/logger')
const jwt = require('jsonwebtoken')
const AnalyticsComponent = require('./AnalyticsComponent')
const apiGameController = require('../restful/controllers/GameController')

class SocketClusterNetworkComponent {

    constructor(scServer, gameServer, userDbComponent, appDbComponent, environment) {
        this.scServer = scServer
        this.gameServer = gameServer
        this.userDbComponent = userDbComponent
        this.appDbComponent = appDbComponent
        this.environment = environment

        let alwaysUnauthenticatedEmits = [
            'games.active', 'games.subscribe', 'authentication'
        ]

        let unauthenticatedEmits = [
            'games.login', 'games.register', 'games.typelist',
            'games.pending', 'games.info', 'games.unsubscribe',
            'games.create', 'games.read', 'games.update', 'games.delete',
        ]

        this.authenticatedEmits = [
            'host.subscribe',
            'game.subscribe',
            'user.signup',
            'user.login',
            'user.resetpassword',
            'user.forgotpassword',
            'user.codeverification',
            'user.award.debit',
            'user.award.credit',
            'user.add.historyplay',
            'user.update.historyplay',
            'app.read.sporttype',
            'app.read.games',
            'app.read.prepicks',
            'app.read.prizeboard',
            'user.read.prepicks',
            'user.create.prepick',
            'user.create.prize',
            'app.read.topearners',
            'app.read.prizechest',
            'user.update.profile',
            'user.billing.payment',
            'user.read.payment.info',
            'app.read.countries',
            'app.read.zones.by.country',
            'app.read.cities.by.zone',
            'app.read.token.products',
            'user.read.game.history',
            'user.read.game.history.by.id',
            'analytics.time.start',
            'analytics.time.stop',
            'analytics.flag.add',
            'user.set.pending.gameplay',
            'user.anonymous.signup',
            'user.anonymous.login',
            'host.insert.recorded.automation',
            'host.save.recorded.plays',
            'host.read.gameevents',
            'host.read.game.by.id',
            'host.import.playstack',
            'app.read.starprize.by.category',
        ]

        let debugEmits = ['games.resetdb']
        this.allowedSocketEmits = alwaysUnauthenticatedEmits.concat(unauthenticatedEmits)
        if (environment !== 'prod') {
            this.allowedSocketEmits = this.allowedSocketEmits.concat(debugEmits)
        }
        this.addGuards()

        AnalyticsComponent.construct(userDbComponent, gameServer)
    }

    listen() {
        console.log('SocketClusterNetworkComponent listening')

        this.scServer.on('connection', (socket) => this.serverMethods(socket));
        this.scServer.on('error', err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `SOCKETCLUSTER: ${err}`)
        })
    }

    serverMethods(socket) {
        console.log('Client connected.')
        socket.emit('auth0Config', {
            clientID: process.env.AUTH0_CLIENT_ID,
            auth0Domain: process.env.AUTH0_DOMAIN,
            audience: process.env.JWT_AUDIENCE
        } )

        socket.on('subscribe', data => this._subscribe(socket, data))
        socket.on('user.signup', (args, respond) => this._userSignup(socket, args, respond))
        socket.on('user.login', (args, respond) => this._userLogin(socket, args, respond))
        socket.on('user.forgotpassword', (args, respond) => this._userForgotPassword(socket, args, respond))
        socket.on('user.resetpassword', (args, respond) => this._userResetPassword(socket, args, respond))
        socket.on('user.codeverification' , (args, respond) => this._userCodeVerification(socket, args, respond))
        socket.on('user.award.debit', (args, respond) => this._userAwardDebit(socket, args, respond))
        socket.on('user.award.credit', (args, respond) => this._userAwardCredit(socket, args, respond))
        socket.on('user.add.historyplay', (args, respond) => this._userAddHistoryPlay(socket, args, respond))
        socket.on('user.update.historyplay', (args, respond) => this._userUpdateHistoryPlay(socket, args, respond))
        socket.on('app.read.sporttype', (args, respond) => this._appReadSportType(socket, args, respond))
        socket.on('app.read.games', (args, respond) => this._appReadGames(socket, args, respond))
        socket.on('app.read.prepicks', (args, respond) => this._appReadPrePicks(socket, args, respond))
        socket.on('app.read.prizeboard', (args, respond) => this._appReadPrizeBoard(socket, args, respond))
        socket.on('user.read.prepicks', (args, respond) => this._userReadPrePicks(socket, args, respond))
        socket.on('user.create.prepick', (args, respond) => this._userCreatePrePick(socket, args, respond))
        socket.on('user.create.prize', (args, respond) => this._userCreatePrize(socket, args, respond))
        socket.on('app.read.topearners', (args, respond) => this._appReadTopEarners(socket, args, respond))
        socket.on('app.read.prizechest', (args, respond) => this._appReadPrizeChest(socket, args, respond))
        socket.on('user.update.profile', (args, respond) => this._userUpdateProfile(socket, args, respond))
        socket.on('user.billing.payment', (args, respond) => this._userBillingPayment(socket, args, respond))
        socket.on('user.read.payment.info', (args, respond) => this._userReadPaymentInfo(socket, args, respond))
        socket.on('app.read.countries', (args, respond) => this._appReadCountries(socket, args, respond))
        socket.on('app.read.zones.by.country', (args, respond) => this._appReadZonesByCountry(socket, args, respond))
        socket.on('app.read.cities.by.zone', (args, respond) => this._appReadCitiesByZone(socket, args, respond))
        socket.on('app.read.token.products', (args, respond) => this._appReadTokenProducts(socket, args, respond))
        socket.on('user.read.game.history', (args, respond) => this._userReadGameHistory(socket, args, respond))
        socket.on('user.read.game.history.by.id', (args, respond) => this._userReadGameHistoryById(socket, args, respond))
        socket.on('analytics.time.start', (args, respond) => this._analyticsTimeStart(socket, args, respond))
        socket.on('analytics.time.stop', (args, respond) => this._analyticsTimeStop(socket, args, respond))
        socket.on('analytics.flag.add', (args, respond) => this._analyticsFlagAdd(socket, args, respond))
        socket.on('user.set.pending.gameplay', (args, respond) => this._userSetPendingGamePlay(socket, args, respond))
        socket.on('user.anonymous.signup', (args, respond) => this._userAnonymousSignup(socket, args, respond))
        socket.on('user.anonymous.login', (args, respond) => this._userAnonymousLogin(socket, args, respond))
        socket.on('host.insert.recorded.automation', (args, respond) => this._hostInsertRecordedAutomation(socket, args, respond))
        socket.on('host.save.recorded.plays', (args, respond) => this._hostSaveRecordedPlays(socket, args, respond))
        socket.on('host.read.gameevents', (args, respond) => this._hostReadGameEvents(socket, args, respond))
        socket.on('host.read.game.by.id', (args, respond) => this._hostReadGameById(socket, args, respond))
        socket.on('host.import.playstack', (args, respond) => this._hostImportPlaystack(socket, args, respond))
        socket.on('host.automation.resumed', (args, respond) => this._hostAutomationResumed(socket, args, respond))
        socket.on('app.read.starprize.by.category', (args, respond) => this._appReadStarPrizeByCategory(socket, args, respond))
    }

    _subscribe(socket, data) {
        const channel = data.split('.')
        if ('host' === channel[channel.length - 1]) {
            this._hostSubscribe(data, socket)
        } else if ('game' === channel[channel.length - 1]) {
            this._gameSubscribe(data, socket)
        }
    }

    _hostSubscribe(data, socket) {
        try {
            const hostChannel = this.scServer.exchange.subscribe(data);
            this.gameServer.initHostChannel(hostChannel, socket, this.scServer);
            console.log('\nHOST SOCKET SUBSCRIPTION', '\ndata:', hostChannel.name);
        } catch (err) {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `HOST SUBSCRIBE: ${err}`)
        }
    }

    _gameSubscribe(data, socket) {
        const gameChannel = this.scServer.exchange.subscribe(data);
        console.log('\nGAME SOCKET SUBSCRIPTION', '\ndata:', gameChannel.name);
        this.gameServer.initGameChannel(gameChannel, socket).then(response => {
            socket.emit('game.info', response)
        })

        // try {
        //     if (socket.getAuthToken()) {
        //         const gameChannel = this.scServer.exchange.subscribe(data);
        //         console.log('\nGAME SOCKET SUBSCRIPTION', '\ndata:', gameChannel.name);
        //         this.gameServer.initGameChannel(gameChannel, socket).then(response => {
        //             socket.emit('game.info', response)
        //         })
        //     }
        // } catch (err) {
        //     logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `GAME SUBSCRIBE: ${err}`)
        //     socket.emit('game.info', null)
        // }
    }

    _userSignup(socket, args, respond) {
        this.userDbComponent.signup(args)
            .then(response => {
                if (response) {
                    response.password = args.password
                    const token = jwt.sign(
                        response,
                        process.env.JWT_KEY,
                        {
                            expiresIn: "1d"
                        }
                    );

                    socket.setAuthToken(response);

                    respond({version: process.env.VERSION, success: true, error: null, response: {profile: response, token: token}});
                } else {
                    respond({version: process.env.VERSION, success: false, error: 'invalid username and/or password', response: null});
                }
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _userLogin(socket, args, respond) {
        this.userDbComponent.login(args)
            .then(response => {
                if (response) {
                    response.password = args.password
                    const token = jwt.sign(
                        response,
                        process.env.JWT_KEY,
                        {
                            expiresIn: "1d"
                        }
                    );

                    socket.setAuthToken(response);

                    respond({version: process.env.VERSION, success: true, error: null, response: {profile: response, token: token}});
                } else {
                    respond({version: process.env.VERSION, success: false, error: 'invalid username and/or password', response: null});
                }
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    /* FORGOT Password */
    _userForgotPassword(socket, args, respond){
        this.userDbComponent.forgotPassword(args)
        .then(response => {
            if (response.status === 1) {
                respond({version: process.env.VERSION, success: true, error: null, response: {profile:response }});
            } else {
                respond({version: process.env.VERSION, success: false, error: 'invalid username', response: null});
            }
        })
        .catch(err => {
            respond({version: process.env.VERSION, success: false, error: err, response: null});
        })
    }

    /* RESET PASSWORD */
    _userResetPassword(socket , args , respond){
        this.userDbComponent.resetPassword(args).then(response => {
            if (response) {
                console.log("response" , response)
                response.password = args.password
                    const token = jwt.sign(
                        response,
                        process.env.JWT_KEY,
                        {
                            expiresIn: "1d"
                        }
                    );

                    socket.setAuthToken(response);
                respond({version: process.env.VERSION, success: true, error: null, response: {profile: response, token: token}});
            } else {
                respond({version: process.env.VERSION, success: false, error: 'invalid username', response: null});
            }
        })
        .catch(err => {
            respond({version: process.env.VERSION, success: false, error: err, response: null});
        })
    }
    /* User Code verification */
    _userCodeVerification(socket , args , respond){
        this.userDbComponent.codeVerification(args).then(response => {
            if (response.status === 1) {
                respond({version: process.env.VERSION, success: true, error: null, response: {profile: response}});
            } else {
                respond({version: process.env.VERSION, success: false, error: 'invalid code', response: null});
            }
        })
        .catch(err => {
            respond({version: process.env.VERSION, success: false, error: err, response: null});
        })
    }

    _userAwardDebit(socket, args, respond) {
        if (socket.getAuthToken()) {
            args.userId = socket.getAuthToken().userId
            this.userDbComponent.debitAward(args).then(updatedAward => {
                respond({version: process.env.VERSION, success: true, error: null, response: updatedAward});
            })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userAwardCredit(socket, args, respond) {
        if (socket.getAuthToken()) {
            args.userId = socket.getAuthToken().userId
            this.userDbComponent.creditAward(args).then(updatedAward => {
                respond({version: process.env.VERSION, success: true, error: null, response: updatedAward});
            })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userAddHistoryPlay(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.addHistoryPlay(args).then(updatedHistoryPlays => {
                respond({version: process.env.VERSION, success: true, error: null, response: updatedHistoryPlays});
            })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userUpdateHistoryPlay(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.updateHistoryPlay(args).then(updatedHistoryPlays => {
                respond({version: process.env.VERSION, success: true, error: null, response: updatedHistoryPlays});
            })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadSportType(socket, args, respond) {
        // this.appDbComponent.readSportType(args)
        //     .then(response => {
        //         respond({version: process.env.VERSION, success: true, error: null, response: response})
        //     })
        //     .catch(err => {
        //         respond({version: process.env.VERSION, success: false, error: err, response: null})
        //     })

        if (socket.getAuthToken()) {
            this.appDbComponent.readSportType(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null})
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadGames(socket, args, respond) {
        // this.appDbComponent.readGamesByCategory(args)
        //     .then(response => {
        //         respond({version: process.env.VERSION, success: true, error: null, response: response})
        //     })
        //     .catch(err => {
        //         respond({version: process.env.VERSION, success: false, error: err, response: null})
        //     })

        if (socket.getAuthToken()) {
            this.appDbComponent.readGamesByCategory(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null})
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadPrePicks(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.appDbComponent.readPrePicksByGameId(args)
                .then(response => {

                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadPrizeBoard(socket, args, respond) {
        if (socket.getAuthToken()) {
            args.userId = socket.authToken.userId
            this.appDbComponent.readPrizeBoard(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userReadPrePicks(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.readPrePicks(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }
    
    _userCreatePrePick(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.createPrePicks(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userCreatePrize(socket, args, respond) {
        if (socket.getAuthToken()) {
            const _date = dateTimeZone(new Date());
            args.dateAdded = _date;
            args.dateClaimed = args.claimed ? _date : null;
            this.userDbComponent.createPrize(args, socket)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadTopEarners(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.appDbComponent.readTopEarners(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadPrizeChest(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.appDbComponent.readPrizeChest(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userUpdateProfile(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.updateProfile(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userBillingPayment(socket, args ,respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.payment(args, socket)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userReadPaymentInfo(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.readPaymentInfo(args, socket)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _appReadCountries(socket, args, respond) {
        this.appDbComponent.readCountries(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _appReadZonesByCountry(socket, args, respond) {
        this.appDbComponent.readZonesByCountry(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _appReadCitiesByZone(socket, args, respond) {
        this.appDbComponent.readCitiesByZone(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _appReadTokenProducts(socket, args, respond) {
        if (socket.getAuthToken()) {
            if (!args || (args && Object.keys(args).length < 1)) {
                args = {
                    userId: socket.getAuthToken().userId,
                    groupId: socket.getAuthToken().groupId
                }
            }
            this.appDbComponent.readTokenProducts(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userReadGameHistory(socket, args, respond) {
        if (socket.getAuthToken()) {
            this.userDbComponent.readGameHistory(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
                .catch(err => {
                    respond({version: process.env.VERSION, success: false, error: err, response: null});
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    _userReadGameHistoryById(socket, args, respond) {
        this.userDbComponent.readGameHistoryById(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _analyticsTimeStart(socket, args, respond) {
        AnalyticsComponent.timeStart(args, socket)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _analyticsTimeStop(socket, args, respond) {
        AnalyticsComponent.timeStop(args, socket)
    }

    _analyticsFlagAdd(socket, args, respond) {
        AnalyticsComponent.insertFlag(args)
    }

    _userSetPendingGamePlay(socket, args, respond) {
        if (socket.getAuthToken()) {
            AnalyticsComponent.setPendingGamePlay(args)
        }
    }

    _userAnonymousSignup(socket, args, respond) {
        this.userDbComponent.anonymousSignup()
            .then(response => {
                if (response) {
                    const token = jwt.sign({anonymousUserId: response.anonymousUserId}, process.env.JWT_KEY);
                    socket.setAuthToken({anonymousUserId: response.anonymousUserId});
                    response.token = token;

                    respond({version: process.env.VERSION, success: true, error: null, response: response});
                } else {
                    respond({version: process.env.VERSION, success: false, error: 'server error', response: null});
                }
            })
    }

    _userAnonymousLogin(socket, args, respond) {
        this.userDbComponent.anonymousLogin(args)
            .then(response => {
                if (response) {
                    const token = jwt.sign({anonymousUserId: response.anonymousUserId}, process.env.JWT_KEY);
                    socket.setAuthToken({anonymousUserId: response.anonymousUserId});
                    response.token = token;

                    respond({version: process.env.VERSION, success: true, error: null, response: response});
                } else {
                    respond({version: process.env.VERSION, success: false, error: 'server error', response: null});
                }
            })
    }

    _hostInsertRecordedAutomation(socket, args, respond) {
        const params = {
            recordedAutomation: args
        }
        this.gameServer.insertRecordedAutomation(params)
    }

    _hostSaveRecordedPlays(socket, args, respond) {
        this.gameServer.saveRecordedPlays(args)
    }

    _hostReadGameEvents(socket, args, respond) {
        apiGameController.readGameEvents(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _hostReadGameById(socket, args, respond) {
        apiGameController.readGamePlaysByGameId(args)
            .then(response => {
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _hostImportPlaystack(socket, args, respond) {
        apiGameController.importPlaystack(args)
            .then(response => {
                this.gameServer.readUpdatedGameInfo({gameId: args.destination})
                respond({version: process.env.VERSION, success: true, error: null, response: response})
            })
            .catch(err => {
                respond({version: process.env.VERSION, success: false, error: err, response: null});
            })
    }

    _hostAutomationResumed(socket, args, respond) {
        this.gameServer.automationResumed(args)
    }

    _appReadStarPrizeByCategory(socket, args, respond) {
        if (socket.getAuthToken()) {
            args.userId = socket.authToken.userId
            this.appDbComponent.readStarPrizeByCategory(args)
                .then(response => {
                    respond({version: process.env.VERSION, success: true, error: null, response: response})
                })
        } else {
            respond({version: process.env.VERSION, success: false, error: 'unauthenticated', response: null});
        }
    }

    addGuards() {
        this.scServer.addMiddleware(this.scServer.MIDDLEWARE_EMIT, (req, next) => {
            // socket, event and data.
            if (this.authenticatedEmits.indexOf(req.event) >= 0) {
                next()
            } else {
                next('You must login first', 4501)
            }
        })

        this.scServer.addMiddleware(this.scServer.MIDDLEWARE_AUTHENTICATE, (req, next) => {
            if (req.authToken) {
                if (req.authToken.anonymousUserId) {
                    this.userDbComponent.anonymousLogin(req.authToken)
                        .then(response => {
                            if (response) {
                                const token = jwt.sign({anonymousUserId: response.anonymousUserId}, process.env.JWT_KEY);
                                req.socket.setAuthToken({anonymousUserId: response.anonymousUserId});
                                response.token = token;

                                req.socket.emit('user.anonymous.login.respond', response)
                            }
                        })
                    next();
                } else {
                    this.userDbComponent.login({username: req.authToken.email, password: req.authToken.password})
                        .then(response => {
                            if (response) {
                                req.socket.emit('user.login.respond', response)
                            }
                        })
                        .catch(err => {
                            throw err
                        })

                    next()
                }
            } else {
                next('You must login first', 4501)
            }
        })
    }

}

module.exports = SocketClusterNetworkComponent