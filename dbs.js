const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.Promise = Promise;


async function init(){
  const connections = {};
  const connectionMapping = {};
  for(let [label, hostData] of Object.entries(__config.dbHosts)) {
    const mongoUserStr = hostData.auth && hostData.auth.user && hostData.auth.pwd ? `${hostData.auth.user}:${hostData.auth.pwd}@` : '';
    const dbUrl = `mongodb://${mongoUserStr}${hostData.host}:${hostData.port}/${hostData.db}`;
    __logger.info(`Connecting to ${label}: ${dbUrl}`);
    const mongooseConnOpts = {
      // useMongoClient: true,
      keepAlive: 300000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 300000,
      autoIndex: false
    };
    connections[label] = await mongoose.createConnection(dbUrl, mongooseConnOpts);
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