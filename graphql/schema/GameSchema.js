const { buildSchema } = require('graphql');

const GameSchema = buildSchema(`
                type GameType {
                    gameId: String
                    stage: String
                    sportType: String
                    subSportGenre: String
                    isLeap: Boolean
                    leapType: String
                    videoFootageId: Int
                    videoFootageName: String
                    videoFootagePath: String
                    formattedTimeStart: String
                    timeStart: String
                    dateStart: String
                    dateAnnounce: String
                    datePrePicks: String
                    countryCode: String
                    stateCode: String
                    stateName: String
                    city: String
                    latlong: String
                    stadium: String                    
                    participants: [ParticipantType]
                    prePicks: [PrePicksType]
                    dateStartSession: String
                    dateEndSession: String 
                }
            
                input GameInput {
                    gameId: String
                    stage: String
                    sportType: String
                    subSportGenre: String
                    isLeap: Boolean
                    leapType: String
                    videoFootageId: Int
                    videoFootageName: String
                    videoFootagePath: String
                    timeStart: String
                    dateStart: String
                    dateAnnounce: String
                    datePrePicks: String
                    countryCode: String
                    stateCode: String
                    stateName: String
                    city: String
                    latlong: String
                    stadium: String                    
                }
                
                type ParticipantType {
                    participantId: Int
                    gameId: String
                    sequence: Int
                    initial: String
                    score: Int
                    name: String
                    topColor: String
                    bottomColor: String
                }

                input ParticipantInput {
                    participantId: Int
                    gameId: String
                    sequence: Int
                    initial: String
                    score: Int
                    name: String
                    topColor: String
                    bottomColor: String
                }
                
                type PrePicksType {
                    prePickId: Int
                    gameId: String
                    sequence: Int
                    questionHeader: String
                    questionDetail: String
                    choiceType: String
                    choices: String
                    points: Int
                    tokens: Int
                    forParticipant: String
                    shortHand : String
                    type: String
                    backgroundImage: String
                    info: String
                    sponsorId: Int
                }
                
                type Video {
                    videoFootageId: Int
                    videoFootageName: String
                    videoFootagePath: String
                }

                input PrePicksInput {
                    prePickId: Int
                    gameId: String
                    sequence: Int
                    questionHeader: String
                    questionDetail: String
                    choiceType: String
                    choices: String
                    points: Int
                    tokens: Int
                    forParticipant: String
                    shortHand : String
                    type: String
                    backgroundImage: String
                    info: String
                    sponsorId: Int
                }
                                               
                type RootQuery {
                    readGames(sportType: String): [GameType]
                    readGameById(gameId: String): GameType
                    readRecordedGames: [GameType]
                    readVideoFootages: [Video]
                    readGameEvents(sportType: String, subSportGenre: String): [GameType]
                }
                                
                type RootMutation {                 
                    createGame(gameId: String,
                                stage: String,
                                sportType: String,
                                subSportGenre: String,
                                isLeap: Boolean,
                                leapType: String,
                                videoFootageId: Int,
                                timeStart: String,
                                dateStart: String,
                                dateAnnounce: String,
                                datePrePicks: String,
                                countryCode: String,
                                stateCode: String,
                                stateName: String
                                city: String,
                                latlong: String,
                                stadium: String,
                                participants: [ParticipantInput],
                                prePicks: [PrePicksInput]): GameType
                    
                     updateGame(gameId: String,
                                stage: String,
                                timeStart: String,
                                dateStart: String,
                                dateAnnounce: String,
                                datePrePicks: String,
                                countryCode: String,
                                stateCode: String,
                                city: String,
                                latlong: String,
                                stadium: String,
                                prePicks: [PrePicksInput]): Boolean
                                           
                    saveParticipants(participants: [ParticipantInput]): String
                    
                    savePrePicks(prePicks: [PrePicksInput]): String
                
                    deleteGame(gameId: String): Boolean
                    
                    updateLeap(gameId: String, isLeap: Boolean, leapType: String): Boolean
                }
                
                schema {
                    query: RootQuery
                    mutation: RootMutation
                }
            `)

module.exports = GameSchema