const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const controller = require('../controllers/CommonController.js');

router.get('/read_cities_by_state', (req, res, next) => {
    controller.readCitiesByState({stateCode: req.query['stateCode']}).then(response => {
        if (response) {
            res.status(200).json(response).end()
        } else {
            res.status(200).json(null).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json(null).end()
    })
})

module.exports = router;