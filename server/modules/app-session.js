//Set up mongo store for flash messages
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

module.exports = function( { mongoSettings } ) {

  const mongoUserStr = mongoSettings.auth && mongoSettings.auth.user && mongoSettings.auth.pwd ? `${mongoSettings.auth.user}:${mongoSettings.auth.pwd}@` : '';

  let connectionStr;
  if(mongoSettings.atlas) {
    connectionStr = `mongodb+srv://${mongoUserStr}${mongoSettings.host}/${mongoSettings.db}`;
  }
  else {
    connectionStr = `mongodb://${mongoUserStr}${mongoSettings.host}:${mongoSettings.port}/${mongoSettings.db}`;
  }

  const sessionStore = new MongoStore({
    ttl: 24 * 60 * 60,//24 hour session lifetime (although browser will logout before this)
    uri: connectionStr,
    collection: `sessions`,
  });

  if(!process.env.SESSION_SECRET) {
    throw new Error('No secret set for session cookies!');
  }

  return session({
    resave: true,
    saveUninitialized: true,
    secret: process.env.SESSION_SECRET,
    store: sessionStore
  });

};