const conn = require('../DbConnection')
const logger = require('../config/logger')
const Play = require('../types/Play')

class PlayStore {
    constructor(db) {
        this.db = db
    }

    setHostChannel(hostChannel) {
        this.hostChannel = hostChannel
    }

    setGameChannel(gameChannel) {
        this.gameChannel = gameChannel
    }

    setHostSCServer(scServer) {
        this.scServer = scServer
    }

    setSocket(socket) {
        this.socket = socket
    }

    initPlays(gameId, isHost) {

        if (isHost) {
            this.db.pullPlays(gameId).then(response => {
                this.publishEndpoints(response);
            })
        } else {

            return new Promise(resolve => {
                this.db.pullCurrentPlay(gameId).then(response => {
                    let current = null
                    if (response) {
                        current = response
                    }

                    if (this.gameChannel) {
                        resolve({current: current, previous: null})
                    } else {
                        resolve({current: null, previous: null})
                    }
                })
            })


            /*
                        return new Promise(resolve => {
                            let current = null
                            let prev = null
                            this.db.pullCurrentPlay(gameId).then(response => {
                                    if (response) {
                                        current = response
                                    }
                                    return this.db.pullPreviousPlay(gameId)
                                })
                                .then(response => {
                                    if (response) {
                                        prev = response
                                    }

                                    if (this.gameChannel) {
                                        resolve({current: current, previous: prev})
                                    } else {
                                        resolve({current: null, previous: null})
                                    }
                                })
                        })
            */
        }

    }


    clientInitPlays(gameId) {
        this.db.pullPlays(gameId).then(response => {
            if (!response) {
                return
            }

            this.putCurrentPlay(response.gameId, response.plays).then(result => {
                this.scServer.clients[this.socket.id].emit('client.play.current', result.currentPlay)
                return this.putNextPlay(response.gameId, response.plays)
            })
                .then(result => {
                    this.scServer.clients[this.socket.id].emit('client.play.next', result.nextPlay)
                    return this.putStack(response.gameId, result.plays)
                })
                .then(result => {
                    this.scServer.clients[this.socket.id].emit('client.play.stack', result.stackPlays)
                    return this.putUnresolved(response.gameId, response.plays)
                })
                .then(result => {
                    this.scServer.clients[this.socket.id].emit('client.play.unresolved', result.unresolvedPlays)
                    return this.putResolved(response.gameId, response.plays)
                })
                .then(result => {
                    this.scServer.clients[this.socket.id].emit('client.play.resolved', result.resolvedPlays)
                })

        })
    }

    syncRequest(args) {
        this.hostChannel.publish({event: 'host.sync.response', data: args})
    }

    selectTeam(team) {
        this.hostChannel.publish({event: 'host.team.select.respond', data: team})
    }

    assemblePlay(play) {
        this.hostChannel.publish({event: 'host.play.assemble.respond', data: play})
    }

    starSelect(args) {
        this.hostChannel.publish({event: 'host.star.select.respond', data: args})
    }

    sync(args) {
        this.hostChannel.publish({event: 'host.sync.respond', data: args})
    }

    addPlay(play) {
        this.db.addPlay(play).then(response => {
            this.publishEndpoints(response);
        })
    }

    updatePlay(play) {
        this.db.updatePlay(play).then(response => {
            if (response) {
                const updatedPlay = response.plays.filter(o => o.id === play.id)[0]
                if (updatedPlay) {
                    this.hostChannel.publish({event: 'host.play.update.respond', data: updatedPlay})
                }
            }
            //this.publishEndpoints(response);
        })
    }

    playStackUpdate(args) {
        this.db.playStackUpdate(args).then(response => {
            this.publishEndpoints(response);
        })
    }

    removePlay(params) {
        this.db.removePlay(params).then(response => {
            this.publishEndpoints(response);
        })
    }

    publishEndpoints(response) {
        if (!response) {
            return
        }

        this.putCurrentPlay(response.gameId, response.plays).then(result => {
                this.hostChannel.publish({event: 'host.play.current', data: result.currentPlay})
                return this.putNextPlay(response.gameId, response.plays)
            })
            .then(result => {
                this.hostChannel.publish({event: 'host.play.next', data: result.nextPlay})
                return this.putStack(response.gameId, result.plays)
            })
            .then(result => {
                this.hostChannel.publish({event: 'host.play.stack', data: result.stackPlays})
                return this.putUnresolved(response.gameId, response.plays)
            })
            .then(result => {
                this.hostChannel.publish({event: 'host.play.unresolved', data: result.unresolvedPlays})
                return this.putResolved(response.gameId, response.plays)
            })
            .then(result => {
                this.hostChannel.publish({event: 'host.play.resolved', data: result.resolvedPlays})
            })
    }

    putCurrentPlay(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let play = await _plays && _plays.length > 0 ? _plays.filter(o => o.inProcess && o.current)[0] : null
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

                _stackOrder.currentPlay = null
                if (play) {
                    _stackOrder.currentPlay = play
                }

                //setTimeout(() => {
                conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                return resolve({plays: [], currentPlay: play})
                //}, 0)
            })
        })
    }

    putNextPlay(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let plays = await _plays && _plays.length > 0 ? _plays.filter(o => !o.inProcess && !o.resultConfirmed) : []
                let play = null
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

                _stackOrder.nextPlay = null
                if (plays && plays.length > 0) {
                    play = plays[plays.length - 1];
                    if (play) {
                        const idxToRemove = plays.indexOf(play);
                        if (idxToRemove > -1) {
                            plays.splice(idxToRemove, 1);
                            _stackOrder.nextPlay = play
                        }
                    }
                }

                setTimeout(() => {
                    conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                    return resolve({plays: plays, nextPlay: play})
                }, 0)
            })
        })
    }

    putStack(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', async (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                const plays = await _plays && _plays.length > 0 ? _plays.filter(o => !o.inProcess && !o.resultConfirmed) : []
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

                _stackOrder.stackPlays = await plays

                setTimeout(() => {
                    conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                    return resolve({plays: [], stackPlays: plays})
                }, 0)
            })
        })
    }

    putUnresolved(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let plays = _plays && _plays.length > 0 ? _plays.filter(o => !o.current && o.inProcess && !o.resultConfirmed) : []
                let _stackOrder = {
                    stackPlays: [],
                    nextPlay: null,
                    currentPlay: null,
                    unresolvedPlays: [],
                    resolvedPlays: []
                }

                if (obj) {
                    _stackOrder = JSON.parse(obj)
                }

                _stackOrder.unresolvedPlays = plays

                setTimeout(() => {
                    conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                    return resolve({plays: [], unresolvedPlays: plays})
                }, 0)
            })
        })
    }

    putResolved(_gameId, _plays) {
        return new Promise(resolve => {
            conn.redisClient.hget('g'+_gameId, 'stackOrder', (err, obj) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                }

                let plays = _plays && _plays.length > 0 ? _plays.filter(o => !o.current && !o.inProcess && o.resultConfirmed) : []
                let _stackOrder = {
                    stackPlays: [],
                    nextPlay: null,
                    currentPlay: null,
                    unresolvedPlays: [],
                    resolvedPlays: []
                }

                if (obj) {
                    _stackOrder = JSON.parse(obj)
                }

                _stackOrder.resolvedPlays = plays

                setTimeout(() => {
                    conn.redisClient.hset('g'+_gameId, 'stackOrder', JSON.stringify(_stackOrder))
                    return resolve({plays: [], resolvedPlays: plays})
                }, 0)
            })
        })
    }

    serve(isHost) {
        if (this.hostChannel && this.gameChannel) {
            if (this.hostChannel.name.split('.')[0].toLowerCase() === this.gameChannel.name.split('.')[0].toLowerCase()) {
                if (isHost) {
                    return true
                }
            }
        }

        return false
    }

    goPlay(play, isHost) {
        this.db.goPlay(play).then(response => {
            this.publishEndpoints(response.game)

            if (this.serve(isHost)) {
                this.gameChannel.publish({event: 'game.play.update', data: {current: response.current, previous: response.previous}})
            }
        })
    }

    resolvePlay(play, isHost) {
        this.db.resolvePlay(play).then(response => {
            this.publishEndpoints(response.game)

            if (this.serve(isHost)) {
                this.gameChannel.publish({event: 'game.play.resolved', data: response.resolved})
            }
        })
    }

    endCurrentPlay(play, isHost) {
        conn.redisClient.hget('g'+play.gameId, 'stackOrder', (err, obj) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            }

            let _stackOrder = {
                stackPlays: [],
                nextPlay: null,
                currentPlay: null,
                unresolvedPlays: [],
                resolvedPlays: []
            }

            if (obj) {
                _stackOrder = JSON.parse(obj)
            }

            play.nextId = _stackOrder.nextPlay ? _stackOrder.nextPlay.id : ''

            this.db.endCurrentPlay(play).then(response => {
                this.publishEndpoints(response.game)

                if (this.serve(isHost)) {
                    this.gameChannel.publish({event: 'game.play.update', data: {current: response.current, previous: response.previous}})
                }
            })
        })
    }

    resolvePrePick(args) {
        conn.redisClient.hget('g'+args.gameId, 'prePicks', async (err, obj) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            }

            let _prePicks = []
            if (obj) {
                _prePicks = JSON.parse(obj)
                const pp = await _prePicks.filter(o => o.prePickId === args.prePickId)[0]
                if (pp) {
                    //const correctChoice = await JSON.stringify({id: args.id, value: args.value}).replace(/"/g, '\'')
                    pp.correctChoice = args.correctChoice
                    conn.redisClient.hset('g'+args.gameId, 'prePicks', JSON.stringify(_prePicks))

                    //args.correctChoice = correctChoice
                    this.db.resolvePrePick(args)
                }
            }

            //this.db.resolvePrePick(args)
        })
    }

    movePlay(args) {
        this.db.movePlay(args).then(response => {
            if (response) {
                conn.redisClient.hget('g' + args.gameId, 'plays', async (err, obj) => {
                    if (err) {
                        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    }
                    if (obj) {
                        const _plays = await JSON.parse(obj);

                        // const newList = await Object.assign([], _plays, {[args.sourceIndex]: _plays[args.destinationIndex], [args.destinationIndex]: _plays[args.sourceIndex]});

                        const newItem = await _plays[args.sourceIndex]
                        await _plays.splice(args.sourceIndex, 1)
                        await _plays.splice(args.destinationIndex, 0, newItem)


                        conn.redisClient.hset('g' + args.gameId, 'plays', JSON.stringify(_plays));

                        this.publishEndpoints({gameId: args.gameId, plays: _plays});
                    }
                })

            }
        })
    }
}

module.exports = PlayStore