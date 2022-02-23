const {
    createLogger,
    transports,
    format
} = require('winston');

const INFO = createLogger({
    transports: [
        new transports.File({
            filename: './logs/info.log',
            level: 'info',
            //format: format.combine(format.timestamp(), format.simple())
            format: format.printf((info) => {
                let message = `${new Date(Date.now()).toUTCString()} | ${info.level.toUpperCase()} | ${info.message}`;
                if (process.env.NODE_ENV === 'dev') {
                    console.log(info.message)
                }
                return message;
            })
        })
    ]
})

const ERROR = createLogger({
    transports: [
        new transports.File({
            filename: './logs/error.log',
            level: 'error',
            //format: format.combine(format.timestamp(), format.simple())
            format: format.printf((error) => {
                let message = `${new Date(Date.now()).toUTCString()} | ${error.level.toUpperCase()} | ${error.message}`;
                if (process.env.NODE_ENV === 'dev') {
                    console.log(error.message)
                }
                return message;
            })
        })
    ]
})

const lineNumber = (error) => {
    return error.stack.split('\n')[1].split('\\').pop().slice(0, -1)
}

module.exports = {
    INFO,
    ERROR,
    lineNumber
}