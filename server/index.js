const config = require('./config');

const Server = require('./server');
const server = new Server(config);

server.init()
  .then( server => server.listen() )
  .catch(e=>{
    console.error(e);
    process.exit(1);
  });