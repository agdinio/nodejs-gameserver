const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const db_queries = require('../../config/dbqueries');
const nodemailer = require("nodemailer");


router.post('/user_create_prize', (req, res, next) => {
    const args = JSON.parse(req.body);
    if (args && Object.keys(args).length > 0) {
        const httpRequest = {
            ip: clientIP(req),
            userAgent: req.headers['user-agent'],
            acceptLanguage: req.headers['accept-language']
        }
        db_queries.createPrize(args, null, httpRequest)
    }
})

router.post('/9a220f323e5ab77be9d925754a714c8a' , async (req , res)=>{
    const {email , password} = req.body
    try {
        if(!email || !password){
            return  res.status(400).send({
                status : 400,
                message : "Mandatory feilds are required "
            })
        }
        let verify = await db_queries.verifyUser(email , password)
        if(verify){
            let data = await db_queries.deleteUserDetails(email , password , verify[0].user_id)
            return res.status(200).send({
                status :200,
                message : "Reset the record successfully "
            })
        }else{
            return res.status(400).send({
                status : 200,
                message : "Invalid username or password "
            })
        }
        
    } catch (error) {
        return res.status(400).send(error)
    }
    //
    
})

/* FORGOT PASSWORD RESET AND SEND A MAIL FOR REGISTERED EMAIL ID */

router.post('/forgotpassword' , async (req , res)=>{
    const { email } = req.body
    try{
        if(!email){
            return  res.status(400).send({
                status : 400,
                message : "Mandatory feilds are required "
            }) 
        }
        /* Email Id is present or not */
        let data = await db_queries.checkEmailCustomer(email)
        if(data.count==0){
            return  res.status(400).send({
                status : 400,
                message : "Please enter the registered email"
            }) 
        }
        let subject = "Reset your password for Sportoco - PlayAlong"
        let html = `Hello,<br><br> Follow this link to reset your sportoco - PlayAlong password for your ${email} account 
        <a href='http://localhost:2000/forgotpassword/${email}' target="_blank">Click Here </a> <br> <br>
        If you didn’t ask to reset your password, you can ignore this email. <br><br>
        Thanks,<br><br>
        Your sportoco - PlayAlong team`
        let sendMailUser = await sendMail(email, subject, html).then((response)=>{
            return res.status(200).send({
                message : response
            })
        }).catch(err=>{
            return res.status(400).send({ message : err})
        })
    }catch(error){
        return res.status(400).send(error)
    }
})

/* Reset the password for the user*/

router.post('/resetpassword' , async(req , res)=>{
    const { email ,password } = req.body
    try {
        if(!email || !password){
            return  res.status(400).send({
                status : 400,
                message : "Mandatory feilds are required "
            }) 
        }
         /* Email Id is present or not */
         let emailcheck = await db_queries.checkEmailCustomer(email)
         console.log("found" , emailcheck)
         if(emailcheck.count==0){
             return  res.status(400).send({
                 status : 400,
                 message : "Please enter the registered email"
             }) 
         }
        let data = await db_queries.updatePasswordCustomer(email , password)
        return res.status(200).send(data)
    } catch (error) {
        res.status(400).send(error)
    }
})

function clientIP(req) {
    try {
        let IPs = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress ||
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;

        if (IPs.indexOf(":") !== -1) {
            IPs = IPs.split(":")[IPs.split(":").length - 1]
        }

        return IPs.split(",")[0];
    } catch (err) {
        return null;
    }
}

/* SEND EMAIL  */

function sendMail(to, subject, html){
  return new Promise((resolve, reject) => {
    let transporter = nodemailer.createTransport({
      host: process.env.EMAILHOST,
      port: process.env.EMAILPORT,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.EMAILUSERNAME,
        pass: process.env.EMAILPASSWORD
      }
    });

    let mailOptions = {
      from:  process.env.EMAILUSERNAME,
      to: to,
      subject: subject,
      html: html,
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        reject("There is error in mail:- " + error);
      } else {
        console.log("Mail has been sent to", to)
        resolve("Mail Sent!!!");
      }
    });
  })
}

module.exports = router;