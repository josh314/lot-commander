const path = require('path');

//Set up mongo store for flash messages
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

const hostData = __config.dbHosts.mongo;

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

if(!process.env.SESSION_SECRET) {
  throw new Error('No secret set for session cookies!');
}

module.exports = function(app) {
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: sessionStore
  }));
};