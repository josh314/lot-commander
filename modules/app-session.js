const path = require('path');

//Set up mongo store for flash messages
const credentials = require(path.join(__basedir, __config.modulesPath, 'credentials'));
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

const sessionDbSettings = __config.dbHosts.sessions;
const sessionDbAuth = sessionDbSettings.auth ? `${sessionDbSettings.auth.user}:${sessionDbSettings.auth.pass}@` : ''; 
const sessionDbUrl = `mongodb://${sessionDbAuth}${sessionDbSettings.host}:${sessionDbSettings.port}/${sessionDbSettings.db}`;
const sessionStore = new MongoStore({
  ttl: 24 * 60 * 60,//24 hour session lifetime (although browser will logout before this)
  uri: sessionDbUrl,
  collection: sessionDbSettings.collection,
});

module.exports = function(app) {
  app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: credentials.cookieSecret,
    store: sessionStore
  }));
};