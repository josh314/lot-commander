const path = require('path');

//Set up mongo store for flash messages
const credentials = require(path.join(__basedir, __config.modulesPath, 'credentials'));
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

// const sessionDbSettings = __config.sessions;
// const sessionDbAuth = sessionDbSettings.auth ? `${sessionDbSettings.auth.user}:${sessionDbSettings.auth.pwd}@` : ''; 
// const sessionDbUrl = `mongodb://${sessionDbAuth}${sessionDbSettings.host}:${sessionDbSettings.port}/${sessionDbSettings.db}`;

const hostData = __config.dbHosts[__config.dbConnMapping.sessions];

const mongoUserStr = hostData.auth && hostData.auth.user && hostData.auth.pwd ? `${hostData.auth.user}:${hostData.auth.pwd}@` : '';

let connectionStr;
if(hostData.atlas) {
  connectionStr = `mongodb+srv://${mongoUserStr}${hostData.host}/${hostData.db}`;
}
else {
  connectionStr = `mongodb://${mongoUserStr}${hostData.host}:${hostData.port}/${hostData.db}`;
} 

const sessionStore = new MongoStore({
  ttl: 24 * 60 * 60,//24 hour session lifetime (although browser will logout before this)
  uri: connectionStr,
  collection: 'sessions',
});

module.exports = function(app) {
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: credentials.cookieSecret,
    store: sessionStore
  }));
};