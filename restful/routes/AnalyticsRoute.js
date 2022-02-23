const express = require('express');
const router = express.Router();
const logger = require('../../config/logger');
const jwt = require('jsonwebtoken');
const conn = require('../../DbConnection')
const {dateTimeZone} = require('../../utilities/helper')
const AnalyticsComponent = require('../../components/AnalyticsComponent')

router.post('/time_stop', (req, res, next) => {

    const args = JSON.parse(req.body);
    if (args && Object.keys(args).length > 0) {
        const _userId = args.userId || clientIP(req);
        conn.redisClient.hget('analytics_'+_userId, 'pages', (err, obj) => {
            const _timeStop = dateTimeZone(new Date());
            let _analytics = [];
            let _events = []
            if (obj) {
                if (Array.isArray(JSON.parse(obj))) {
                    _analytics = JSON.parse(obj)
                    _events = _analytics.filter(o => o.uuid === args.uuid)
                    for (let i=0; i<_events.length; i++) {
                        if (!_events[i].timeStop) {
                            _events[i].timeStop = _timeStop
                        }
                    }
                }

                conn.redisClient.hset('analytics_'+_userId, 'pages', JSON.stringify(_analytics), () => {
                    /**
                     * flag the user when on a livegame page but interrupted by other page.
                     */
                    AnalyticsComponent.toggleLiveGameInteraction(args, _analytics);

                    for (let i=0; i<_events.length; i++) {
                        AnalyticsComponent.insertToDB(_events[i]);
                    }
                })
            }

            //--console.log( 'UNLOADED TIME STOP ', JSON.parse(JSON.stringify(_events || '')))
        })
    }

})

router.post('/set_pending_gameplay', (req, res, next) => {
    const args = JSON.parse(req.body);
    if (args && Object.keys(args).length > 0) {
        AnalyticsComponent.setPendingGamePlay(args)
    }
})

router.post('/last_session_time', (req, res, next) => {
    // const args = JSON.parse(req.body);
    // if (args && Object.keys(args).length > 0) {
    //     AnalyticsComponent.saveLastSessionTime(args)
    // }
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


module.exports = router;