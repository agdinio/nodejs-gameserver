const express = require('express');
const router = express.Router();
const conn = require('../../DbConnection');
const {exec, execFile, spawn} = require('child_process');

router.get('/recorded_plays', (req, res, next) => {
    if (req.query['game_id']) {
        conn.pool.query('call sp_automation_read_recorded_plays(?)', [req.query['game_id']], (err, result) => {
            if (err) {
                logger.ERROR.error(logger.lineNumber(new Error()) + ' | ' + err)
                res.status(400).json(null).end()
                return
            }

            if (result && result[0]) {
                res.status(200).json(result[0]).end()
            }

        })
    }
})

router.post('/execute_hcomm', async (req, res, next) => {

    if (req.body && Object.keys(req.body).length > 0) {
        const vstore = await conn.videoFootages.filter(o => o.gameId === req.body.gameId)[0];
        if (vstore) {
            vstore.timeStop();
            const idxToRemove = await conn.videoFootages.findIndex(o => o.gameId === req.body.gameId);
            if (idxToRemove > -1) {
                await conn.videoFootages.splice(idxToRemove, 1);
            }
        }



    }

})

module.exports = router;
