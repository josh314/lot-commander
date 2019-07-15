const mongoose = require('mongoose');
const qs = require('querystring');
const Promise = require('bluebird');
mongoose.Promise = Promise;


async function init(){
  const connections = {};
  const connectionMapping = {};
  for(let [label, hostData] of Object.entries(__config.dbHosts)) {
    const mongoUserStr = hostData.auth && hostData.auth.user && hostData.auth.pwd ? `${hostData.auth.user}:${hostData.auth.pwd}@` : '';
    const optionsStr = hostData.options ? `?${qs.stringify(hostData.options)}` : '';

    let connectionStr;
    if(hostData.atlas) {
      connectionStr = `mongodb+srv://${mongoUserStr}${hostData.host}/${hostData.db}${optionsStr}`;
    }
    else {
      connectionStr = `mongodb://${mongoUserStr}${hostData.host}:${hostData.port}/${hostData.db}${optionsStr}`;
    } 

    __logger.info(`Connecting to ${label}: ${connectionStr}`);
    const mongooseConnOpts = {
      // useMongoClient: true,
      keepAlive: 300000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 300000,
      autoIndex: false,
      useNewUrlParser: true,
    };
    connections[label] = await mongoose.createConnection(connectionStr, mongooseConnOpts);
  }

  for(let [db, conn] of Object.entries(__config.dbConnMapping)) {
    connectionMapping[db] = connections[conn];
  }
  __logger.info('DB connections created and mapped.');
  return connectionMapping;
}

module.exports = {
  init: init,
};