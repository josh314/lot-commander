const config = require('./config');

const Server = require('./server');
const server = new Server(config);

server.init()
  .then( server => server.listen() )
  .then( async server => {

    if( process.env.INIT_SCRIPT ) {

      // wait 3 seconds before continuing
      await new Promise(resolve => {
        setTimeout(resolve, 2000);
      });

      const rl = require( 'readline' ).createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = ( q ) => new Promise( ( resolve, _reject ) => {
        rl.question( q, ( answer ) => resolve( answer ) );
      });

      const answer = await question( `\n\n--WARNING--\n\nAre you sure you wish to run this init script (${ process.env.INIT_SCRIPT })? (y/n) ` );

      if( answer !== 'y' ) {
        console.log( 'Aborting init script.' );
        process.exit( 0 );
      }

      await require( process.env.INIT_SCRIPT )( server );
    }
    else {
      console.log( 'No init script specified. Continuing...' );
    }

    return server;
  } )
  .catch(e=>{
    console.error(e);
    process.exit(1);
  });