const moment = require('moment-timezone')
const nodemailer = require("nodemailer");
var sgTransport = require('nodemailer-sendgrid-transport');
const sgMail = require('@sendgrid/mail')
const timestampToDate = toconvert => {
    var unixtimestamp = toconvert.toString().substring(0, 10)
    // Months array
    var months_arr = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
    ]

    // Convert timestamp to milliseconds
    var date = new Date(unixtimestamp * 1000)

    // Year
    var year = date.getFullYear()

    // Month
    //var month = months_arr[date.getMonth()]
    var month = ('0' + (date.getMonth() + 1)).slice(-2)

    // Day
    var day = ('0' + date.getDate()).slice(-2)

    // Hours
    var hours = ('0'+ date.getHours()).slice(-2)

    // Minutes
    var minutes = ('0' + date.getMinutes()).slice(-2)

    // Seconds
    var seconds = ('0' + date.getSeconds()).slice(-2)

    // Display date time in MM-dd-yyyy h:m:s format
    var convdataTime = year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds

    return convdataTime
}

const lineNumber = (error) => {
    return error.stack.split('\n')[1].split('\\').pop().slice(0, -1)
}

class CopyObj {
	
	copy(in_obj) {
		let out_obj = {}
		for (let k in in_obj) {		
			out_obj[k] = in_obj[k]
		}
		return out_obj;
	}
	
	deepCopy(in_obj) {
		let out_obj = Array.isArray(in_obj) ? [] : {}
		if(Array.isArray(out_obj)) {
			for (let k = 0; k < in_obj.length; ++k) {			
				out_obj.push(typeof in_obj[k] === 'object' ? this.deepCopy(in_obj[k]) : in_obj[k])			
			}
		} else {
			for (let k in in_obj) {	
				out_obj[k] = typeof in_obj[k] === 'object' ? this.deepCopy(in_obj[k]) : in_obj[k]
			}	
		}
		return out_obj;
	}
}

const copyObj = new CopyObj();

const genSalt = () => {
	let s = '1234567890qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
	let s_len = s.length - 1
	let rands = []
	for(let i = 0; i < 10; ++i) {
		rands.push(Math.random())
	}

	rands = rands.map((_x) => {
		return Math.floor(_x * (s_len + 1))
	})
	
	let sAr = []
	for(let i = 0; i <= 1; ++i) {
		let _s = ''
		for(let i2 = 0; i2 < 5; ++i2) {
			_s += s.substr(rands[i2 + i * 5], 1)
		}
		sAr.push(_s)
	}
	return sAr
}

const camelizeObj = (obj) =>  {
	if(typeof obj === 'string') return obj.replace(/_[a-z]/g, (match) => match.substr(1,1).toUpperCase())
	if(typeof obj !== 'object') return obj
	if(Array.isArray(obj)) {
		for(let i = 0; i < obj.length; ++i) {
			obj[i] = camelizeObj(obj[i])
		}
		return obj
	}			
	let ret = {}
	for (let k in obj) {
		let k_new = camelizeObj(k)
		ret[k_new] = obj[k]
	}
	return ret
}

const dateTimeZone = (date, timezone) => {
	return moment.tz(date, timezone || process.env.TIMEZONE).format('YYYY-MM-DD HH:mm:ss');
}


const sendMail = (to, subject, html)=>{
	return new Promise(async (resolve , reject)=>{
		sgMail.setApiKey('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')
		const msg ={
			to : to,
			from : "infosportoco@gmail.com",
			subject : subject,
			html : html
		}

		await sgMail.send(msg , (error, info) => {
			if (error) {
				console.log("error", error)
			  return reject("There is error in mail:- " + error);
			} else {
			  return resolve("Mail Sent!!!");
			}
		  });
	})
	/* return new Promise((resolve, reject) => {
	  let transporter = nodemailer.createTransport({
		host: process.env.EMAILHOST,
		port: process.env.EMAILPORT,
		auth: {
		  user: process.env.EMAILUSERNAME,
		  pass: process.env.EMAILPASSWORD
		},
		tls: {
			rejectUnauthorized: false
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
	}) */
  }

module.exports = {
    timestampToDate,
    lineNumber,
    camelizeObj,
    copyObj,
	genSalt,
	dateTimeZone,
	sendMail
}