/*
//Load HTTP module
const http = require("http");
const hostname = '192.249.114.226';
const port = 6604;

//Create HTTP server and listen on port 3000 for requests
const server = http.createServer((req, res) => {

  //Set the response HTTP header with HTTP status and Content type
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Hello World\n');
});

//listen for request on port 3000, and as a callback function have the port listened on logged
server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});


var http = require('http');
http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('Hello World!');
}).listen(6604); 
console.log('Server ready');
*/


require('dotenv').config()
var http = require('http');
var socketClusterServer = require('socketcluster-server');
var express = require('express');
var serveStatic = require('serve-static');
var path = require('path');
var morgan = require('morgan');
const healthChecker = require('sc-framework-health-check');
const DbConnection = require('./DbConnection')
const SocketClusterNetworkComponent = require('./components/SocketClusterNetworkComponent')
const GameServerComponent = require('./components/GameServerComponent')
const DatabaseComponent = require('./components/DatabaseComponent')
const UserDbComponent = require('./components/UserDbComponent')
const AppDbComponent = require('./components/AppDbComponent')
const GraphQLAPI = require('./graphql')
const RestfulAPI = require('./restful')
const db_queries = require('./config/dbqueries')
const errorhandler = require('errorhandler')

console.log('   >> Worker PID:', process.pid);

const environment = process.env.ENV;
const app = express();

app.use(serveStatic(path.resolve(__dirname, 'public')));

const httpServer = http.createServer().listen(process.env.SOCKETCLUSTER_PORT, () => {
    console.log('HTTP listening on port ' + process.env.SOCKETCLUSTER_PORT);
})

// Add GET /health-check express route
healthChecker.attach(this, app);

// Attach express to our httpServer
httpServer.on('request', app);

if (environment === 'dev') {
    // Log every HTTP request. See https://github.com/expressjs/morgan for other
    // available formats.
    app.use(morgan('dev'));
}

// Attach socketcluster-server to our httpServer
const scServer = socketClusterServer.attach(httpServer);

app.use(errorhandler({log: errorNotification}));
function errorNotification(err, str, req) {
 console.log("Error in " + req.method + req.url + "==============" + err);
}

DbConnection.open()
db_queries.readDsSettings()

const userDbComponent = new UserDbComponent(environment)
const databaseComponent = new DatabaseComponent(environment)
const gameServer = new GameServerComponent(databaseComponent, userDbComponent, environment)
const appDbComponent = new AppDbComponent(environment)
const networkComponent = new SocketClusterNetworkComponent(scServer, gameServer, userDbComponent, appDbComponent, environment)
networkComponent.listen()

new GraphQLAPI(express, app).use();
new RestfulAPI(express, app).use();

