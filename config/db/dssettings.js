const conn = require('../../DbConnection')
const logger = require('../logger')
const { timestampToDate, lineNumber, camelizeObj, copyObj } = require('../../utilities/helper')

class DsSettings {
	
	constructor() {
		this.ds_settings_read_time = 0
		this.ds_settings = null	
		this.token_product_id = null
	}	
	
	getTokenProducts(db) {
		return new Promise(async (resolve, reject) => {
			if(!this.ds_settings || !this.ds_settings.config_spgame_token_product_id) return resolve({})
				
			let do_refresh = !this.token_product_id || this.token_product_id !== this.ds_settings.config_spgame_token_product_id
			this.token_product_id = this.ds_settings.config_spgame_token_product_id
		
			let _ids = this.ds_settings.config_spgame_token_product_id.split(',').map((_x) => parseInt(_x))
			let qs = []
			for(let i = 0; i < _ids.length; ++i) {
				qs.push('?')
			}
			_ids.unshift(parseInt(this.ds_settings.config_language_id), parseInt(this.ds_settings.config_spgame_bonus_tokens_option))			
			let q = "SELECT p.product_id, p.price, pd.name, p.model, po.option_value AS bonus_tokens FROM product p LEFT JOIN product_description pd ON (pd.product_id = p.product_id AND pd.language_id = ?) LEFT JOIN product_option po ON (po.product_id = p.product_id AND po.option_id = ?) WHERE p.status = '1' AND p.product_id IN ("+qs.join(',')+")"
		
			if(!this.ds_settings.token_products) this.ds_settings.token_products = {}
			
			let q_check = !do_refresh && Object.keys(this.ds_settings.token_products).length && this.ds_settings_read_time ? q + " AND (p.date_added > SUBDATE(NOW(), INTERVAL 15 MINUTE) OR p.date_modified > SUBDATE(NOW(), INTERVAL 15 MINUTE)) LIMIT 1" : ''
			
			if(!db) {
				try {
					db = await new Promise((res1, rej1) =>  {
						conn.pool.getConnection((err, db0) => {
							if (err) {
								logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
								db0.release()
								return rej1(err)
							}				
							return res1(db0)
						})
					})					
				} catch(db_err) {
					reject(db_err)
				}
			}				
				
				if(!do_refresh && q_check.length) {
					do_refresh = await new Promise((res1, rej1) =>  {
						db.query(q_check, _ids, (err, _check_res) => {
							return res1(err || (_check_res && _check_res.length))
						})
					})
				}

				if(!do_refresh) {
					db.release()
					return resolve(this.ds_settings.token_products)
				}
				
				db.query(q, _ids, (err, results) => {
					this.ds_settings.token_products = {}
					if(!results) {
						db.release()
						return resolve(this.ds_settings.token_products)
					}
					
					let product_ids = []
					results.forEach((_r) => {						
						this.ds_settings.token_products[_r['product_id']] = copyObj.copy(_r)
						this.ds_settings.token_products[_r['product_id']].price = parseFloat(_r.price)
						this.ds_settings.token_products[_r['product_id']].bonus_tokens = _r.bonus_tokens && !isNaN(parseInt(_r.bonus_tokens)) ? parseInt(_r.bonus_tokens) : 0
						this.ds_settings.token_products[_r['product_id']].groups = {}
						product_ids.push(parseInt(_r['product_id']))
					})
					if(!product_ids.length) {
						db.release()
						return resolve(this.ds_settings.token_products)
					}
					qs = []
					for(let i = 0; i < product_ids.length; ++i) {
						qs.push('?')
					}						
					db.query("SELECT * FROM product_reward WHERE product_id IN ("+qs.join(',')+") AND currency = 'tokens'", product_ids, (err, pr_results) => {
						if(pr_results) {
							pr_results.forEach((_r) => {
								this.ds_settings.token_products[_r['product_id']].groups[_r['customer_group_id']] = {
										points: _r.points,
										currency: _r.currency
								}
							})
						}
						q = "SELECT product_id, customer_group_id, price FROM product_special WHERE product_id IN ("+qs.join(',')+") AND ((date_start = '0000-00-00' OR date_start < NOW()) AND (date_end = '0000-00-00' OR date_end > NOW())) ORDER BY priority ASC, price ASC"
						db.query(q, product_ids, (err, ps_results) => {
							if(ps_results) {
								ps_results.forEach((_r) => {
									if(!this.ds_settings.token_products[_r['product_id']].groups.hasOwnProperty(_r['customer_group_id'])) {
										this.ds_settings.token_products[_r['product_id']].groups[_r['customer_group_id']] = {
											price: parseFloat(_r.price)
										}
									} else if(!this.ds_settings.token_products[_r['product_id']].groups[_r['customer_group_id']].price) {
										this.ds_settings.token_products[_r['product_id']].groups[_r['customer_group_id']].price = parseFloat(_r.price)
									}
								})
							}
							db.release()
							return resolve(this.ds_settings.token_products)
						})
					})
				})
			
		})
	}

	read() {
		let t = (new Date()).getTime()
		let q = 'SELECT `key`, (IF(serialized = 1, value_json, `value`)) AS `value`, serialized FROM setting'
		let do_q = false
		if(this.ds_settings === null || !this.ds_settings_read_time) {
			this.ds_settings = {}			
			do_q = true
		} else if(this.ds_settings_read_time < (t - 900000)) {
			q += ' WHERE date_added > SUBDATE(NOW(), INTERVAL 15 MINUTE)'
			do_q = true
		}
		this.ds_settings_read_time = t
		if(do_q) {
			conn.pool.getConnection((err, db) => {
                if (err) {
                    logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                    db.release()
                    return this.ds_settings
                }				
				db.query(q, async (err, result) => {								
					result.forEach((r) => {
						try {
							this.ds_settings[r['key']] = (r['serialized'] == '1' && r['value'].length ? JSON.parse(r['value']) : r['value'])
						} catch(__e) {
							this.ds_settings[r['key']] = ''
						}
					})
					
					if(this.ds_settings.config_language && !this.ds_settings.config_language_id) {
						this.ds_settings.config_language_id = 1;
						db.query("SELECT language_id FROM `language` WHERE `code` = ?", [this.ds_settings.config_language], async (err, result) => {
							if(result.length) this.ds_settings.config_language_id = parseInt(result[0].language_id)
							await this.getTokenProducts(db)
							db.release()
						})				
					} else {
						await this.getTokenProducts(db)
						db.release()
					}
				})
			})
		}
		return this.ds_settings;
	}


}

module.exports = new DsSettings()