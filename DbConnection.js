const mysql = require('mysql2')
const Sequelize = require('sequelize')
const logger = require('./config/logger');
const redis = require('redis')

class DbConnection {

    constructor() {
        this.pool = null;
        this.db = null;
        this.redisClient = null
        this.videoFootages = []
        this.headless = false
        this.executionType = 'normal'
	this.activeAutomations = []
    }

    setHeadless(_headless) {
        this.headless = _headless
    }

    setExecutionType(_executionType) {
        this.executionType = _executionType
    }

    open() {
        this.redisClient = redis.createClient(6379);
        this.redisClient.on('connect', () => {
            console.log('Redis Connection established.')
            this.redisClient.flushall((err, reply) => {
                console.log('Redis FLUSHALL:', reply)
            })
        })
        this.redisClient.on('error', err => {
            logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
        })

        this.pool = mysql.createPool({
            host: process.env.DB_HOSTNAME,
            user: process.env.DB_USERNAME,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            connectTimeout: 1000000,
            queueLimit: 0,
            connectionLimit: 10000,
            waitForConnections: true,
	    timezone: '+00:00'
         })

        this.pool.on('connection', (connection) => {
            console.log('DB Connection established.')

            connection.on('error', (err) => {
                console.log('DB Connection error', err)
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                this.open()
            })
            connection.on('close', function (err) {
                console.error(new Date(), 'DB Connection close', err);
            });
        })

    }

    openONE_unused() {
        this.db = mysql.createConnection({
            host     : process.env.DB_HOSTNAME,
            user     : process.env.DB_USERNAME,
            password : process.env.DB_PASSWORD,
            database : process.env.DB_NAME
        })

        this.db.connect((err) => {
            if (err) {
                console.log('Error connecting to db.')
                setTimeout(() => this.open(), 2000)
            } else {
                console.log('Database connected.')
            }
        })

        this.db.on('error', (err) => {
            console.log('Db error', err)
            setTimeout(() => this.open(), 2000)
        })
    }

    openTWO_unused() {
        return new Promise((resolve, reject) => {
            if (this.db && this.db.state === 'disconnected') {
                this.db.connect((err) => {
                    if (err) {
                        this.db = null
                        return reject(err)
                    } else {
                        console.log('Database connected.')
                        return resolve(this.db)
                    }
                })
            } else if (this.db && this.db.state === 'authenticated') {
                return resolve(this.db)
            }

            this.db = mysql.createConnection({
                host     : process.env.DB_HOSTNAME,
                user     : process.env.DB_USERNAME,
                password : process.env.DB_PASSWORD,
                database : process.env.DB_NAME
            })
            this.db.connect((err) => {
                if (err) {
                    this.db = null
                    return reject(err)
                } else {
                    console.log('Database connected.')
                    return resolve(this.db)
                }
            })
        })
    }

}

module.exports = new DbConnection()
