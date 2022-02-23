const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const twilioController = require('../controllers/TwilioController');


router.post("/" , twilioController.sendSms); // send sms to phone number
router.post("/validation" , twilioController.validationPhoneNumber); // validate the phone in correct format
router.post("/verification" , twilioController.verificationPhonenumber); // send verification code to phone number
router.post("/codeverification" , twilioController.codeVerification); // code verification 

module.exports = router;