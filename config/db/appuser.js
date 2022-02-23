const conn = require('../../DbConnection')
const logger = require('../logger')
const { timestampToDate, lineNumber, camelizeObj , sendMail} = require('../../utilities/helper')
const Crypto = require('crypto')
const CryptoJS = require('crypto-js')
const https = require('https')
const dssettings = require('./dssettings')
let accountSid =  process.env.ACCOUNTSID   // twilio account sid
let authToken =  process.env.AUTHTOKEN     // twilio auth token
let serviceId =  process.env.SERVICEID     // twilio service Id
const client = require('twilio')(accountSid, authToken);   // connect twilio service into our server
class AppUser {

	readById(user_id, refresh, update) {
		return this.read(user_id, '', refresh, update)
	}

	readByEmail(email, pwd, refresh, passwordExempted) {
		const credential = passwordExempted ? email : [email, pwd];
		console.log("credential" , credential) 
		//return this.read(false, (pwd ? [email, pwd] : email), refresh) //--mod by aurelio
		return this.read(false, credential, refresh)
	}

	read(user_id, u_p, refresh, update) {
		let username = null
		let pwd = null
		if(!user_id) {
			if(Array.isArray(u_p)) {
				username = u_p[0]
				pwd = u_p[1]
			} else {
				username = u_p
			}
		}
		return new Promise(async (resolve, reject) =>  {
			if(user_id && !Number.isInteger(user_id)) {
				user_id = parseInt(user_id)
				if(isNaN(user_id) || user_id < 1) user_id = false
			}
			if(!user_id && !username) return reject('User not found')			
	
			if(user_id) {
				if(refresh) {
					await this.deleteRedisUserData(user_id)
				} else if(!update) {
					try {
						const _fields_int = ['userId', 'addressId', 'groupId', 'points', 'tokens', 'stars', 'notifyEmail', 'notifyMobile', 'isCelebrity']
						const _fields_all = [].concat(_fields_int, ['email', 'firstName', 'lastName', 'phone', 'mobile', 'dateAdded'])

						const user_obj = await new Promise((res1, rej1) => {
							conn.redisClient.hmget('u'+user_id, _fields_all, (err, _obj) => {								
								if(_obj && Array.isArray(_obj) && _obj.length === _fields_all.length) {
									let obj = {}
									for(let i = 0; i < _obj.length; ++i) {
										obj[_fields_all[i]] = _obj[i]
									}
									if(obj.email) {
										obj._from_cache = true
										_fields_int.forEach((_k) => {
											obj[_k] = parseInt(obj[_k])
										})
										return res1(obj)
									}											
								} 
								return rej1('')								
							})
						})
						return resolve(user_obj)
					} catch(err) {
					}
				}
			}

			let q, q_args;
			if(!user_id) {
				q = 'CALL sp_read_appuser_by_email(?, ?)'
				q_args = [username, pwd]
			} else {
	            q = 'CALL sp_read_appuser_by_id(?)'
				q_args = [user_id]
			}

            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                if (db) {
					console.log("asdfasdf" , q , q_args)
                    db.query(q, q_args, async (err, rows) => {
                        db.release()
                        if (err) {
                            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                            return reject(err)
                        }

                        if (rows && rows.length > 0 && rows[0].length > 0 && rows[0][0].user_id) {
							if(!user_id && refresh) await this.deleteRedisUserData(user_id)
							const _date_added = rows[0][0].date_added && typeof rows[0][0].date_added === 'object' ? rows[0][0].date_added.toJSON() : rows[0][0].date_added
							let row = camelizeObj(rows[0][0])							
							row.dateAdded = _date_added
							if(typeof row.userId !== 'number') row.userId = parseInt(row.userId)
							if(row.hasOwnProperty('mobile') && !row.hasOwnProperty('phone')) {
								row.phone = row.mobile
							} else if(row.hasOwnProperty('mobile') && !row.hasOwnProperty('phone')) {
								row.mobile = row.phone
							}
							if(row.password) delete row.password

							return resolve(await new Promise((res1, rej1) => {
								conn.redisClient.hmset('u'+rows[0][0].user_id, row, () => {
									return res1(row)
								})
							}))
						}
						return resolve(null)
					})
				}
			})
		})
	}
	
	readAddresses(user_id) {
		return this._read_cache_multi(user_id, 'address', 'SELECT a.address_id, a.firstname AS first_name, a.lastname AS last_name, a.address_1 AS address_line1, a.address_2 AS address_line2, a.country_id, co.iso_code_2 AS country, a.zone_id, z.code AS state, a.city, a.postcode AS zip, (IF(LENGTH(a.address_email) > 0, a.address_email, c.email)) AS email, (IF(LENGTH(a.address_phone) > 0, a.address_phone, c.telephone)) AS phone FROM address a, country co, zone z, customer c WHERE a.customer_id = ? AND co.country_id = a.country_id AND z.zone_id = a.zone_id AND c.customer_id = a.customer_id')
	}

	readPaymentProfiles(user_id) {
		const ds_settings = this.readDsSettings()
		let profiles = []
		return new Promise(async (resolve, reject) => {
			if(!ds_settings.config_spgame_payment_methods) return resolve(profiles)
			try {
				profiles = await new Promise((res1, rej1) => {
					conn.redisClient.hget('u'+user_id, 'paymentProfile', (err, obj) => {
						if(!err && obj) return res1(JSON.parse(obj))
						return rej1('')
					})
				})
				return resolve(profiles)
			} catch(err) {
			}			

			conn.pool.getConnection(async (err, db) => {
				if (err || !db) {
					logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
					if(db) db.release()
					return reject(err || 'Error 141')
				}
				
				let tbl, profiles_tbl;
				for(let i = 0; i < ds_settings.config_spgame_payment_methods.length; ++i) {
					tbl = ds_settings[ds_settings.config_spgame_payment_methods[i]+'_profile_table']
					if(!tbl) continue;
						
					try {
						profiles_tbl = await new Promise((res1, rej1) => {
							db.query("SELECT profile_id, last_four FROM "+tbl+" WHERE customer_id = ? AND `status` = '1' AND ed > NOW()", user_id, (err, result) => {
								if (err) {
									logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
									db.release()
									return rej1(err)
								}
								const ar = []
								for (let i = 0; i < result.length; ++i) {
									let _obj = camelizeObj(result[i])
									_obj.paymentMethod = ds_settings.config_spgame_payment_methods[i]
									ar.push(_obj)
								}
								return res1(ar)
							})
						})
					} catch(err) {
						return reject(err)
					}
					if(profiles_tbl && Array.isArray(profiles_tbl) && profiles_tbl.length) profiles = [].concat(profiles, profiles_tbl)
				}
				db.release()
				conn.redisClient.hset('u'+user_id, 'paymentProfile', JSON.stringify(profiles))
				return resolve(profiles)
			})
		})
	}
	
	readTokenProducts(user_id, group_id) {
		const ds_settings = this.readDsSettings()
		return new Promise(async (resolve, reject) => {
			if(!ds_settings.token_products) return resolve([])
			if(!group_id) {
				const user_obj = await this.readById(user_id)
				group_id = user_obj.group_id 
			}
			if(!group_id) group_id = ds_settings.config_customer_group_id
			let products = []	
			for(let product_id in ds_settings.token_products) {
				let _tmp = {
					productId: parseInt(product_id),
					name: ds_settings.token_products[product_id].name,
					model: ds_settings.token_products[product_id].model,
					bonusTokens: ds_settings.token_products[product_id].bonus_tokens
				}			
				if(ds_settings.token_products[product_id].groups) {
					let _group_id = group_id
					if(!ds_settings.token_products[product_id].groups[_group_id]) {
						let _ar = Object.keys(ds_settings.token_products[product_id].groups).map((_x) => parseInt(_x)).sort()
						_group_id = _ar[0]					
					}
					['price', 'points', 'currency'].forEach((_k) => {
						if(ds_settings.token_products[product_id].groups[_group_id][_k]) _tmp[_k] = ds_settings.token_products[product_id].groups[_group_id][_k]
					})				
				}
				_tmp.tokens = _tmp.points ? _tmp.points - _tmp.bonusTokens : 0
				if(!_tmp.price) _tmp.price = ds_settings.token_products[product_id].price
				products.push(_tmp)
			}
			products.sort((a, b) => {return (a.points > b.points ? 1 : (a.points < b.points ? -1 : 0))})
			return resolve(products)
		})
	}

	readDsSettings() {
		return dssettings.read()
	}

	create(args) {
	const ds_settings = this.readDsSettings();
	if(args.email && !args.username) args.username = args.email;
	return new Promise((resolve, reject) => {	   
		if(!args.username || !/^\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/.test(args.username)) return reject('Email is not valid')
		if(!args.password || typeof(args.password) !== 'string' || !args.password.length) return reject('Password is not valid')
				conn.pool.getConnection((err, db) => {
					if (err) {
						logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
						db.release()
						return reject(err)
					}
					if (db) {
						db.beginTransaction((err) => {
							if (err) {
								logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
								db.release()
								return reject(err)
							}

							let fname, lname, playerName;
							if(args.firstName) args.firstName = args.firstName.replace(/^\s+/, '').replace(/\s+$/, '')
							if(args.lastName) args.lastName = args.lastName.replace(/^\s+/, '').replace(/\s+$/, '')						
							if(args.firstName && args.firstName.length && args.lastName && args.lastName.length) {
								fname = args.firstName
								lname = args.lastName
							} else {
								if(args.firstName && args.firstName.length) {
									playerName = args.firstName.split(/\s+/)
								} else {
									playerName = args.username.split('@')[0].split('.')
								}
								if(playerName.length > 1) {
									lname = playerName.pop()
									fname = playerName.join(' ')
								} else {
									fname = playerName[0]
									lname = ''
								}							
							}
							
				const phone = args.phone ? args.phone.replace(/^\d+/g, '') : ''
				
				if(!args.game_id && args.gameId) args.game_id = args.gameId;
				const game_id = !args.game_id || !args.game_id.length ? ds_settings.config_default_tracking : args.game_id;			
				
				const _salt10 = Crypto.randomBytes(10).toString('hex').slice(0, 10)
				const _salt5 = [_salt10.substr(0, 5), _salt10.substr(5,5)]
				
							const _d = new Date()
							console.log(`
							INSERT IGNORE INTO customer(firstname, lastname, email, telephone, password, date_login, 
								date_added, customer_group_id, status, approved, date_updated, affiliate_id, 
								last_ordered_affiliate_id, p_sh, s_sh) 
							VALUES (?,?,?,?,?,?, ?,?,?,?,?, 
								(SELECT affiliate_id FROM affiliate WHERE 'code' = ?),
								(SELECT affiliate_id FROM affiliate WHERE 'code' = ?), 
								SHA2(CONCAT(?, SHA2(CONCAT(SHA2(?, 256), ?), 256)), 256), ?)
							` , fname, lname, args.username, phone, '', _d, _d, ds_settings.config_customer_group_id, 1, 1, _d, game_id, game_id,
							_salt5[0], args.password, _salt5[1], _salt10)
							//return reject("err")
							db.query('INSERT IGNORE INTO customer(firstname, lastname, email, telephone, password, date_login, date_added, customer_group_id, `status`, approved, date_updated, affiliate_id, last_ordered_affiliate_id, p_sh, s_sh) VALUES (?,?,?,?,?,?, ?,?,?,?,?, (SELECT affiliate_id FROM affiliate WHERE `code` = ?), (SELECT affiliate_id FROM affiliate WHERE `code` = ?), SHA2(CONCAT(?, SHA2(CONCAT(SHA2(?, 256), ?), 256)), 256), ?)',
								[fname, lname, args.username, phone, '', _d, _d, ds_settings.config_customer_group_id, 1, 1, _d, game_id, game_id,
								_salt5[0], args.password, _salt5[1], _salt10
								],
								(err, result) => {
									if (err) {
										db.rollback(() => {})
										logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
										db.release()
										return reject(err)
									}


									if (!result || !result.insertId) {
										db.rollback(() => {
										})
										logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + 'INSERT INTO appuser has no return result.')
										db.release()
										return reject(err && err.length ? err : 'Signup Error')
									}

									db.commit((err) => {
										if (err) {
											db.rollback(() => {
											})
											logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
											db.release()
											return reject(err)
										}                                    
										db.release()
				this.login(args).then((response) => {
					return resolve(response)
				}).catch((err) => {
					return reject(err)
				})

									})
								})
							})
					}
				})
			})
	}

	login(args) {	
		if(args.email && !args.username) args.username = args.email;
		return new Promise((resolve, reject) => {
			console.log("args.username, args.password, true, args.passRequired" , args.username, args.password, true, args.passRequired)
			this.readByEmail(args.username, args.password, true, args.passRequired).then((user_obj) => {
				console.log("user_obj" , user_obj)
				return resolve(user_obj)			
			}).catch((err) => {
				return reject(err)
			})
		})
	}
	
	resetPassword(args){
		return new Promise((resolve , reject)=>{
			conn.pool.getConnection(async (err, db) => {
				if (err) {
					logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
					if(db) db.release()
					return reject(err)
				}
				const _salt10 = Crypto.randomBytes(10).toString('hex').slice(0, 10)
				const _salt5 = [_salt10.substr(0, 5), _salt10.substr(5,5)]
				console.log(_salt5[0], args.password, _salt5[1], _salt10)
				
				console.log(`SHA2(CONCAT('${_salt5[0]}', SHA2(CONCAT(SHA2('${args.password}', 256), '${_salt5[1]}'), 256)), 256)`)
				console.log("args.phone" ,args.phone)
				if(args.phone){
					await db.query(`select email from customer where telephone ='${args.phone}' and country_code ='${args.country_code}'`, (err , resultphone)=>{
						if(err){
							console.log("err" , err)
						}
						args.username = resultphone[0].email 
						console.log("phone email " , args.username)
						db.query(`select SHA2(CONCAT('${_salt5[0]}', SHA2(CONCAT(SHA2('${args.password}', 256), '${_salt5[1]}'), 256)), 256) as hashdata`, async (err , result)=>{
							if(err){
								console.log("err" , err)
							}
							console.log("result" , result[0].hashdata)
							let query = `UPDATE customer set p_sh = '${result[0].hashdata}' , s_sh ='${_salt10}' where email ='${args.username}'`
							await db.query(query, async (err , result1)=>{
								if(err){
									return reject(err)
								}
								console.log("result1" , result1.affectedRows)
								await this.login(args).then((response) => {
									return resolve(response)
								}).catch((err) => {
									return reject(err)
								})
								return resolve(result1.affectedRows)
							})
						})
					})
				}else{
					db.query(`select SHA2(CONCAT('${_salt5[0]}', SHA2(CONCAT(SHA2('${args.password}', 256), '${_salt5[1]}'), 256)), 256) as hashdata`, async (err , result)=>{
						if(err){
							console.log("err" , err)
						}
						console.log("result" , result[0].hashdata)
						let query = `UPDATE customer set p_sh = '${result[0].hashdata}' , s_sh ='${_salt10}' where email ='${args.username}'`
						await db.query(query, async (err , result1)=>{
							if(err){
								return reject(err)
							}
							console.log("result1" , result1.affectedRows)
							await this.login(args).then((response) => {
								return resolve(response)
							}).catch((err) => {
								return reject(err)
							})
							return resolve(result1.affectedRows)
						})
					})
				}
				
			})
		})
	}

    updateProfile(args) {
        return new Promise((resolve, reject) => {
            conn.pool.query('call sp_update_appuser(?,?,?,?,?,?,?)', [args.userId, args.firstName, args.lastName, args.countryCode, args.mobile, args.notifyEmail, args.notifyMobile], (err, result) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return reject(err)
                }
                console.log('update profile')
				conn.redisClient.hmset('u'+args.userId, {
					firstName: args.firstName,
					lastName: args.lastName,
					countryCode: args.countryCode,
					mobile: args.mobile,
					phone: args.mobile,
					notifyEmail: args.notifyEmail,
					notifyMobile: args.notifyMobile
				})
				return resolve(result)
            })
        })
    }

	_read_cache_multi(user_id, k, q) {
		return new Promise((resolve, reject) => {
			conn.redisClient.hget('u'+user_id, k, (err, obj) => {
				if(!err && obj) return resolve(JSON.parse(obj))				
				if (err) logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
				
				conn.pool.getConnection((err, db) => {
					if (err) {
						logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
						if(db) db.release()
						return reject(err)
					}
					if (db) {
						db.query(q, user_id, (err, result) => {
							if (err) {
								logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
								db.release()
								return reject(err)
							}
							const ar = []
							for (let i = 0; i < result.length; ++i) {
								ar.push(camelizeObj(result[i]))
							}
				            conn.redisClient.hset('u'+user_id, k, JSON.stringify(ar))
							return resolve(ar)							
						})
					}
				})
			})

		})
	}
	
	deleteRedisUserData(user_id, include_keys) {
		return new Promise((res1) => {
			conn.redisClient.hkeys('u'+user_id, async (err, obj) => {					
				if(obj && Array.isArray(obj) && obj.length) {
					for(let i = 0; i < obj.length; ++i) {
						if(include_keys && include_keys.indexOf(obj[i]) === -1) continue;
						await new Promise((res2) => {
							conn.redisClient.hdel('u'+user_id, obj[i], () => {
								return res2(true)
							})
						})
					}
				}
				return res1(true)
			})
		})
	}

	order(args, socket) {
		const ds_settings = this.readDsSettings()
		return new Promise(async (resolve, reject) => {
			if(!args.userId) return resolve('Error 344: User missing')
			let user_obj;
			try {
				user_obj = await this.readById(args.userId)
			} catch(_er) {
				return resolve('Error 348: '+(_er && typeof _er !== 'object' && _er.length ? _er : 'User missing'))
			}
			if(!user_obj) return resolve('Error 350: User missing')

            conn.pool.getConnection(async (err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    return resolve('Error 355: Service Unavailable')
                }
                if (db) {
					let session_key, payment_tmp_id;
					try {
						if(socket) {
							args.server = {
								REMOTE_ADDR: (socket && socket.remoteAddress ? socket.remoteAddress.replace('::ffff:', '') : ''),
								HTTP_USER_AGENT: (socket && socket.request && socket.request.headers && socket.request.headers.hasOwnProperty('user-agent') ? socket.request.headers['user-agent'] : ''),
								HTTP_ACCEPT_LANGUAGE: (socket && socket.request && socket.request.headers && socket.request.headers.hasOwnProperty('accept-language') ? socket.request.headers['accept-language'] : '')						
							}
						}
						session_key = Crypto.randomBytes(16).toString('hex').slice(0, 16)
						payment_tmp_id = parseInt(await new Promise((res1, rej1) => {
							db.query("INSERT INTO payment_tmp (`data`, k) VALUES (?, ?)", [JSON.stringify(args), session_key], (err, result) => {
								db.release()
								if(err) {
									return rej1(err)
								} else if(!result.insertId) {
									return rej1('Error')
								} else {
									if (args.paymentDetails && args.paymentDetails.keepCardDetailsOnFile) {
										this.saveCardDetails(args)
									}
									return res1(result.insertId);
								}
							})
						}))
						if(isNaN(payment_tmp_id) || payment_tmp_id < 1) return resolve('Error 372: Service Unavailable')						
					} catch(_err) {
						return resolve('Error 374: Service Unavailable')
					}
					https.get(ds_settings.config_spgame_checkout_url.replace('[pid]', payment_tmp_id).replace('[session_key]', session_key), (response) => {
						let _data = ''
						response.on('data', (_to_add) => {
							_data += _to_add
						})
						
						response.on('close', async () => {
							if(_data === 'success') {
								await this.readById(args.userId, false, true)
								await this.deleteRedisUserData(args.userId, ['address', 'paymentProfile'])
								return resolve('success')
							} else {
								return resolve('Error 393: ' + (_data.length ? _data : 'Service Unavailable'))
							}
						})
					})						
				}
			})

		})
	}

	saveCardDetails(args) {
		const expireDate = args.paymentDetails.expirationDate.split('/');
		const expireMonth = expireDate.length >= 2 ? String(expireDate[0]) : '00';
		const expireYear = expireDate.length >= 2 ? String(expireDate[1]) : '00';
		conn.pool.query('call sp_insert_cc_details(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
			[
				args.userId,
				args.billingDetails.firstName,
				args.billingDetails.lastName,
				args.billingDetails.countryCode,
				args.billingDetails.phone,
				args.billingDetails.addressLine1,
				args.billingDetails.addressLine2,
				args.billingDetails.country,
				args.billingDetails.state,
				args.billingDetails.city,
				args.billingDetails.zip,
				args.billingDetails.email,
				args.billingDetails.useAsShippingAddress,
				args.paymentDetails.cardName,
				args.paymentDetails.cardNumber,
				args.paymentDetails.csv,
				expireMonth,
				expireYear
			], (err, result) => {
				if (err) {
					logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
				}
			})
	}

	 /* Check email is present or not */
	async emailVerfication(args){
		return new Promise((resolve , reject)=>{
            let checkPresentEmail = `SELECT firstname , lastname ,email from customer where email='${args.username}'`
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(checkPresentEmail, async (err, result) => {
                        if(err){
                            return reject(err)
                        }
						console.log("result[0]" , result[0])
						if(!result[0]){
							let data1 = {
								status : 0 ,
								message : "Invalid username"
							}
							return resolve(data1)
						}else{
							// Encrypt
							var ciphertext = CryptoJS.AES.encrypt(args.username, 'sportocogameapp').toString();
							console.log("encrypt" ,ciphertext )
							// Decrypt
							let url = `http://test4live.sportocotoday.com/?forgotpassword=${ciphertext}`
							let subject = "Reset your password for Sportoco - PlayAlong"
							let html = `Hi ${result[0].firstname ? result[0].firstname : ""} ${result[0].lastname ? result[0].lastname : ""},<br><br>
									There was a request to change your password!<br><br>
									If you did not make this request then please ignore this email.<br><br>
									Otherwise, please click this link to change your password: <a href='${url}' target="_blank">${url} </a><br><br>
									Team Sportzag PlayAlong`
							let sendMailUser = await sendMail(args.username, subject, html).then((response)=>{
								let data = {
									status : 1 ,
									message : "Mail sent , Please check your mail to change password !"
								}
								return resolve(data)
							}).catch(err=>{
								return reject(err)
							})
						}
                    })
                }
            })
        })
    }

	async phoneVerfication(args){
		return new Promise(async (resolve , reject)=>{
			console.log("phoneVerification ", args)
			let checkPresentPhone = `SELECT COUNT(*) as count from customer where telephone='${args.username}' and country_code = '${args.country_code}'`
			console.log("checkPresentPhone" , checkPresentPhone)
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(checkPresentPhone, async (err, result) => {
                        if(err){
                            return reject(err)
                        }
						console.log("result" , result)
						if(result[0].count == 0){
							let data = {
								status : 0 ,
								message : "Invalid Username"
							}
							return reject(data)
						}else{
							let servicedetails =''
							await client.verify.services.create({friendlyName: 'forgot password'})
								.then( async (service) => {
									servicedetails = service.sid
									console.log("servicedetails" ,servicedetails)
									await client.verify.services(servicedetails)
									.verifications
									.create({to: "+" +args.country_code +"" +args.username, channel: 'sms'})
									.then(verification => {
										let data = {
											status : 1 ,
											message : "Code is send your phone",
											verification
										}
										return resolve (data)
									})
									.catch(err=>{
										console.log("err 1 " ,err)
										return reject (err)
									}); 
								}).catch(err=>{
									console.log("err " ,err)
									return reject(err)
								});
							
						}
					})
				}
			})
			
		})
	}
	/* Check email is present or not */
    async checkEmailCustomer(email){
        return new Promise((resolve , reject)=>{
            let checkPresentEmail = `SELECT COUNT(*) as count from customer where email='${email}'`
            conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + `ADMIN LOGIN: ${err}`)
                    return reject(err)
                }
                if (db) {
                    db.query(checkPresentEmail, (err, result) => {
                        if(err){
                            return reject(err)
                        }
                        console.log("resulet" , result[0])
                        return resolve(result[0])
                    })
                }
            })
        })
    }

	/* Code Verification */
	async codeVerification(args){
		return new Promise(async (resolve , reject)=>{
			await client.verify.services(args.serviceSid)
			.verificationChecks
			.create({to: "+" +args.country_code +"" +args.username,  code:args.code})
			.then(verification_check => {
				let data ={
					status : 1 ,
					verification_check
				}
				
				return resolve(data)
			})
			.catch(err=>{
				let data1 ={
					status : 0 ,
					err
				}
				
				return resolve(data1)}); 
		})
	}

	readPaymentInfo(args) {
		return new Promise(resolve => {
			conn.pool.query('call sp_read_payment_info(?)', [args.userId], (err, result) => {
				if (err) {
					logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
					return resolve(null)
				}
				return resolve({countries: result[0] || [], cardDetails: (result[1] && result[1][0]) ? result[1][0] : null})
			})
		})
	}
}

module.exports = new AppUser()
