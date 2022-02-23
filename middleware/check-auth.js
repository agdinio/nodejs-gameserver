const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
/*
        if (req.body && req.body.query) {
            const isLogin = req.body.query.includes('loginAdminUser');
            if (isLogin) {
                next();
            } else {
                const token = req.headers.authorization.split(" ")[1];
                const decoded = jwt.verify(token, process.env.JWT_KEY);
                req.userData = decoded;
                next();
            }
        } else {
            return res.status(401).send('Request Body undefined...')
        }
*/
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        next();

    } catch(err) {
        console.log('>>>>>>>', err)
        // return res.status(401).json({
        //     message: 'Auth failed'
        // });
        return res.status(401).send('Auth failed')
    }
}
