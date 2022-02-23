const graphqlHttp = require('express-graphql');
const bodyParser = require('body-parser');
const schema = require('./schema')
const resolvers = require('./resolvers')
const checkAuth = require('../middleware/check-auth')
const operatorRoute = require('../restful/routes/OperatorRoute');

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

        this.app.use('/games', graphqlHttp({
            schema: schema.GameSchema,
            rootValue: resolvers.GameResolver,
            graphiql: true
        }))

        this.app.use('/country', graphqlHttp({
            schema: schema.CountrySchema,
            rootValue: resolvers.CommonResolver,
            graphiql: true
        }))

        this.app.use('/states', graphqlHttp({
            schema: schema.StateSchema,
            rootValue: resolvers.CommonResolver,
            graphiql: true
        }))

        this.app.use('/cities', graphqlHttp({
            schema: schema.CitySchema,
            rootValue: resolvers.CommonResolver,
            graphiql: true
        }))

        this.app.use('/gameEventInfo', checkAuth, graphqlHttp({
            schema: schema.GameEventInfoSchema,
            rootValue: resolvers.CommonResolver,
            graphiql: true
        }))

        //delete
        // this.app.use('/operator', checkAuth, graphqlHttp({
        //     schema: schema.OperatorSchema,
        //     rootValue: resolvers.CommonResolver,
        //     graphiql: true,
        // }))

    }
}

module.exports = Api