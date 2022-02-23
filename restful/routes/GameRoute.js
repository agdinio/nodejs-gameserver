const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const controller = require('../controllers/GameController.js');
const checkAuth = require('../../middleware/check-auth')


router.get('/game_event_info', checkAuth, (req, res, next) => {
    controller.readGameEventInfo(req.query).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_games', (req, res, next) => {
    controller.readGames({sportType: req.query['sportType']}).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_game_events', checkAuth, (req, res, next) => {
    const args = {
        sportType: req.query['sportType'],
        subSportGenre: req.query['subSportGenre'],
        excludedGameId: req.query['excludedGameId'],
        stage: req.query['stage'],
        season: req.query['season'],
        startDate: req.query['startDate'],
        endDate: req.query['endDate'],
    }
    controller.readGameEvents(args).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_game_events_for_import', (req, res, next) => {
    const args = {
        sportType: req.query['sportType'],
        subSportGenre: req.query['subSportGenre'],
        excludedGameId: req.query['excludedGameId'],
        stage: req.query['stage'],
        season: req.query['season'],
        startDate: req.query['startDate'],
        endDate: req.query['endDate'],
    }
    controller.readGameEventsForImport(args).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_game_by_id', checkAuth, (req, res, next) => {
    controller.readGameById({gameId: req.query['gameId']}).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: err}).end()
    })
})

router.post('/create_game', checkAuth, (req, res, next) => {

    if (req.body) {
        const args = {
            gameId: req.body['gameId'],
            stage: req.body['stage'],
            sportType: req.body['sportType'],
            subSportGenre: req.body['subSportGenre'],
            isLeap: req.body['isLeap'],
            leapType: req.body['leapType'],
            videoFootageId: req.body['videoFootageId'],
            dateStart: req.body['dateStart'],
            timeStart: req.body['timeStart'],
            dateAnnounce: req.body['dateAnnounce'],
            datePrePicks: req.body['datePrePicks'],
            countryCode: req.body['countryCode'],
            stateCode: req.body['stateCode'],
            city: req.body['city'],
            latlong: req.body['latlong'],
            stadium: req.body['stadium'],
            participants: req.body['participants'],
            prePicks: req.body['prePicks'],
        }

        controller.createGame(args).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: err}).end()
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid req.body')
        res.status(404).json({error: true, data: 'invalid req.body'}).end()
    }
})

router.post('/update_game', (req, res, next) => {

    if (req.body) {
        const args = {
            gameId: req.body['gameId'],
            stage: req.body['stage'],
            timeStart: req.body['timeStart'],
            dateStart: req.body['dateStart'],
            dateAnnounce: req.body['dateAnnounce'],
            datePrePicks: req.body['datePrePicks'],
            countryCode: req.body['countryCode'],
            stateCode: req.body['stateCode'],
            city: req.body['city'],
            latlong: req.body['latlong'],
            stadium: req.body['stadium'],
            prePicks: req.body['prePicks'],
        }

        controller.updateGame(args).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: err}).end()
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid req.body')
        res.status(404).json({error: true, data: 'invalid req.body'}).end()
    }
})

router.post('/delete_game', checkAuth, (req, res, next) => {
    if (req.body) {
        const args = {
            gameId: req.body['gameId']
        }
        controller.deleteGame(args).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: err}).end()
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid req.body')
        res.status(404).json({error: true, data: 'invalid req.body'}).end()
    }
})

router.get('/read_playstack', (req, res, next) => {
    if (req.query) {
        controller.readGamePlaysByGameId(req.query).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid request')
        res.status(404).json({error: true, data: 'invalid request'}).end()
    }
})

router.post('/import_playstack', (req, res, next) => {
    if (req.body) {
        const args = {
            source: req.body['source'],
            destination: req.body['destination'],
            playsToImport: req.body['playsToImport']
        }

        controller.importPlaystack(args).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: err}).end()
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid req.body')
        res.status(404).json({error: true, data: 'invalid req.body'}).end()
    }
})

router.get('/read_prepick_presets', checkAuth, (req, res, next) => {
    if (req.query) {
        controller.readPrePickPresets(req.query).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: err}).end()
        })
    } else {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | invalid req.body')
        res.status(404).json({error: true, data: 'invalid req.body'}).end()
    }
})

router.get('/read_sponsors_by_sport_type', checkAuth, (req, res, next) => {
    controller.readSponsorsBySportType(req.query).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_video_footages', checkAuth, (req, res, next) => {
    controller.readVideoFootages(req.query).then(response => {
        if (response) {
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/read_import_filter_args', (req, res, next) => {
    if (req.query) {
        const args = {
            sportType: req.query['sportType'],
            subSportGenre: req.query['subSportGenre']
        }

        controller.readImportFilterArgs(args).then(response => {
            if (response) {
                res.status(200).json({error: false, data: response}).end()
            } else {
                res.status(200).json({error: false, data: null}).end()
            }
        }).catch(err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: null}).end()
        })
    }
})

module.exports = router;