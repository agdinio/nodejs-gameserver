const { buildSchema } = require('graphql');

const CountrySchema = buildSchema(`
                type CountryType {
                    countryId: Int
                    code: String
                    name: String
                }

                type RootQuery {
                    readCountries: [CountryType]                        
                }
                                
                schema {
                    query: RootQuery
                }
`)

const StateSchema = buildSchema(`
                type StateType {
                    code: String
                    name: String
                }

                type RootQuery {
                    readStates: [StateType]                        
                }
                                
                schema {
                    query: RootQuery
                }
            `)

const CitySchema = buildSchema(`
                type CityType {
                    name: String
                    lat: String
                    long: String
                }
                
                type RootQuery {
                    readCitiesByState(stateCode: String): [CityType]                        
                }
                                
                schema {
                    query: RootQuery
                }
            `)

const GameEventInfoSchema = buildSchema(`
                type GameEventType {
                    states: [StateType]
                    sportTypes: [SportType]
                    seasons: [SeasonType]
                }
                type StateType {
                    code: String
                    name: String
                }

                type SportType {
                    id: Int
                    name: String
                    code: String
                    icon: String
                    subSportGenres: [SubSportGenreType]
                }
                
                type SubSportGenreType {
                    name: String
                    code: String
                }
                
                type SeasonType {
                    name: String
                    code: String
                }

                type RootQuery {
                    readGameEventInfo: GameEventType
                }
            
                schema {
                    query: RootQuery
                }
            `)

const OperatorSchema = buildSchema(`
                type Operator {
                    username: String
                    id: Int
                    groupId: Int
                    firstName: String
                    lastName: String
                    email: String
                    accessGameAdmin: Boolean
                    accessHostCommand: Boolean
                    token: String
                }

                type RootQuery {
                    loginAdminUser(username: String, password: String): Operator
                }    

                schema {
                    query: RootQuery
                }
            `)

module.exports = {
    CountrySchema,
    StateSchema,
    CitySchema,
    GameEventInfoSchema,
    OperatorSchema,
}