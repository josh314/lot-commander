module.exports = {
  arrayOfScalarsIsEqual,
  snake2Camel,
  populationPathsFromQuery,
  appendPopulationQueries
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

//Note: that this only supports two levels of the path, i.e. 'shipment' & 'shipment.palletsReceived'.
// If we have a reason to go deeper, we'll need to put together some sort of recursive solution.
function appendPopulationQueries( query, populationPaths ) {

  const populationSets = populationPaths.reduce( ( acc, path ) => {

    const dotIdx = path.indexOf('.');

    const { parentPath, childPath } = dotIdx > -1 ? { parentPath: path.slice( 0, dotIdx ), childPath: path.slice( dotIdx + 1 ) } : { parentPath: path };

    if( !acc.has( parentPath ) ) {

      acc.set( parentPath, new Set() );

    }

    acc.get( parentPath ).add( childPath );

    return acc;
  }, new Map() );


  const pathObjects = [];
  for( let [ parentPath, childPathSet ]  of populationSets.entries() ) {
    // filter out empty childpaths. this removes, e.g. 'shipment' if 'shipment.palletsReceived' exists
    const _childPathList = [ ...childPathSet ].filter(_=>_);

    if( _childPathList.length ) {

      // for each child path, add a two level deep population object
      _childPathList.forEach( _cp => pathObjects.push( { path: parentPath, populate: { path: _cp } } ) );

    }
    else { // if no child paths at all, add a one-level deep population object
      pathObjects.push( { path: parentPath } );
    }
  }

  for( let _po of pathObjects ) {
    query = query.populate( _po );
  }

  return query;
}
