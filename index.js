const die = (msg) => {
  throw new Error(msg);
}

const envvar = (envvarName) => {
  if( process.env[envvarName] ) {
    return process.env[envvarName];
  }
  throw new Error(`Must set envvar: ${envvarName}`);
}

const config = require('./config');

const Server = require('./server');
const server = new Server(config);

server.init()
  .then( server => server.listen() )
  .catch(e=>{
    console.error(e);
    process.exit(1);
  });