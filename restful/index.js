const bodyParser = require('body-parser');
const checkAuth = require('../middleware/check-auth')
const operatorRoute = require('./routes/OperatorRoute');
const analyticsRoute = require('./routes/AnalyticsRoute');
const userRoute = require('./routes/UserRoute');
const automationRoute = require('./routes/AutomationRoute');
const gameRoute = require('./routes/GameRoute');
const commonRoute = require('./routes/CommonRoute');
const twilioRoute = require('./routes/TwilioRoutes')
class Api {
    constructor(express, app) {
        this.express = express;
        this.app = app;
    }

    use() {
        this.app.use(bodyParser.urlencoded({extended: false}));
        this.app.use(bodyParser.json());
        this.app.use((req, res, next) => {
            res.header('Access-Control-Allow-Origin', '*');
            res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
            if (req.method === 'OPTIONS') {
                res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
                return res.status(200).json({});
            }
            next();
        });

        this.app.use(bodyParser.json());
        this.app.use(bodyParser.text())
        this.app.use('/operator', operatorRoute);
        this.app.use('/analytics', analyticsRoute);
        this.app.use('/user', userRoute);
        this.app.use('/automation', automationRoute)
        this.app.use('/game', gameRoute)
        this.app.use('/common', commonRoute)
        this.app.use('/twilio',twilioRoute)
    }
}

module.exports = Api