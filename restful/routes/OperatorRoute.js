const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const operatorController = require('../controllers/OperatorController');

router.post('/login', (req, res, next) => {
    operatorController.login(req.body).then(response => {
        if (response && response.id) {
            const token = jwt.sign(
                response,
                process.env.JWT_KEY,
                {expiresIn: "1d"}
            );

            response.token = token
            res.status(200).json({error: false, data: response}).end()
        } else {
            res.status(200).json({error: false, data: null}).end()
        }
    }).catch(err => {
        logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        res.status(404).json({error: true, data: null}).end()
    })
})

router.get('/check_logged_in/:id/:username', (req, res, next) => {
    let operator = {
        username: '',
        id: 0,
        groupId: 0,
        firstName: '',
        lastName: '',
        email: '',
        accessGameAdmin: false,
        accessHostCommand: false,
        token: ''
    }


    try {
            const token = req.headers.authorization.split(" ")[1]
            const decoded = jwt.verify(token, process.env.JWT_KEY);
            if (req.params.id.toString() === decoded.id.toString() && req.params.username === decoded.username) {
                operator = {
                    username: decoded.username,
                    id: decoded.id,
                    groupId: decoded.groupId,
                    firstName: decoded.firstName,
                    lastName: decoded.lastName,
                    email: decoded.email,
                    groupName: decoded.groupName,
                    accessGameAdmin: decoded.accessGameAdmin,
                    accessHostCommand: decoded.accessHostCommand,
                    token: token
                }

                res.status(200).json({error: false, data: operator}).end()
            } else {
                res.status(404).json({error: true, data: operator}).end()
            }
        } catch (err) {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
            res.status(404).json({error: true, data: operator}).end()
        }



})

module.exports = router;
