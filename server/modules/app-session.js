//Set up mongo store for flash messages
const session = require('express-session');
const MongoStore = require('connect-mongodb-session')(session);

async function fetchSessionSecrets() {
  const appEnv = process.env.APP_ENV;
  if (appEnv) {
    const parameterName = `/lot-commander/${appEnv}/session-secrets`;
    console.log(`Loading session secrets from SSM: ${parameterName}`);
    const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
    const client = new SSMClient({});
    const response = await client.send(new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    }));
    return response.Parameter.Value.split(',').map(s => s.trim());
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error('No secret set for session cookies!');
  }
  return process.env.SESSION_SECRET;
}

module.exports = async function( { mongoSettings } ) {

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

  const secret = await fetchSessionSecrets();

  return session({
    resave: true,
    saveUninitialized: true,
    secret,
    store: sessionStore
  });

};