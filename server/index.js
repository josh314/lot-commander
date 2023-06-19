const config = require('./config');

const Server = require('./server');
const server = new Server(config);

server.init()
  .then( server => server.listen() )
  .then( async server => {

    if( process.env.INIT_SCRIPT ) {
      await require( process.env.INIT_SCRIPT )( server );
    }

    return server;
  } )
  .catch(e=>{
    console.error(e);
    process.exit(1);
  });