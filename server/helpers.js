module.exports = {
  arrayOfScalarsIsEqual,
  snake2Camel,
  populationPathsFromQuery,
};

/**********************************************
 * Utility functions
 * ========================
 *
 *********/

function snake2Camel( str ) {
  return str.split('_').map( (s, idx) => idx ? s.slice(0,1).toUpperCase() + s.slice(1) : s ).join('');
}


function arrayOfScalarsIsEqual( a1, a2 ) {
  if( a1.length !== a2.length ) {
    return false;
  }

  for( let i=0; i<a1.length; i++ ) {

    if( a1[i] !== a2[i] ) {
      return false;
    }

  }

  return true;

}

/**********************************************
 * Query helpers
 * ========================
 *
 *********/

function populationPathsFromQuery( qps ) {

  const populationPaths = [];

  for( let [ key, value ] of Object.entries( qps ) ) {

    const m = key.match(/^populate_(.*)/);

    if( m && parseInt(value) ) {

      const key = snake2Camel( m[1] );

      populationPaths.push( key );

    }

  }

  return populationPaths;

}