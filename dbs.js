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
	  };
	  mongooseConn = await mongoose.createConnection(dbUrl, mongooseConnOpts);
		connections[label] = mongooseConn;
	}

	for(let [db, conn] of Object.entries(__config.dbConnMapping)) {
		connectionMapping[db] = connections[conn];
	}
	return connectionMapping;
}

module.exports = {
	init: init,
};