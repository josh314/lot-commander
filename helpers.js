module.exports = {
  snake2Camel: snake2Camel,
  populationPathsFromQuery: populationPathsFromQuery,
};

/**********************************************
 * Helpers
 * =======
 * 
 *********/

function snake2Camel( str ) {
  return str.split('_').map( (s, idx) => idx ? s.slice(0,1).toUpperCase() + s.slice(1) : s ).join('');
}

function populationPathsFromQuery( qps ) {

  const populationPaths = [];

  for( let [ key, value ] of Object.entries( qps ) ) {

    const m = key.match(/^populate_(.*)/)

    if( m && parseInt(value) ) {

      const key = snake2Camel( m[1] );

      populationPaths.push( key );

    }

  }

  return populationPaths;

};
