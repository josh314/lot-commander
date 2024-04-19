
module.exports = {
  appendPopulationQueries,
  arrayOfScalarsIsEqual,
  getRandomArrayIndex,
  snake2Camel,
  populationPathsFromQuery,
  setPackagingTypeFromShippingItems,
};

/**********************************************
 * Utility functions
 * ========================
 *
 *********/


function getRandomArrayIndex( arr ) {
  return Math.floor(Math.random() * arr.length ); // 0 <= Math.random() < 1
}

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

  return query.populate( pathObjects );

}


/**********************************************
 * Others
 * ========================
 *
 *********/

function setPackagingTypeFromShippingItems( $_ ) {

  // This is a generic function for use with any object that has shippingItems and packagingType fields
  if( $_.shippingItems ) {

    const hasPalletShippingItem = $_.shippingItems.some( shippingItem => {
      return shippingItem.weight === 2000 &&
        shippingItem.weightUnits === 'pounds' &&
        shippingItem.height === 60 &&
        shippingItem.heightUnits === 'inches' &&
        shippingItem.width === 48 &&
        shippingItem.widthUnits === 'inches' &&
        shippingItem.length === 48 &&
        shippingItem.lengthUnits === 'inches';
    } );

    if( hasPalletShippingItem ) {
      $_.packagingType = 'pallets:bulky';
    }
    else {

      if( $_.shippingItems && $_.shippingItems.length >= 8 ) {
        $_.packagingType = 'pallets';
      }
      else if ( $_.shippingItems && $_.shippingItems.length < 8 ) {
        $_.packagingType = 'box lot';
      }

    }

  }
  else {
    $_.packagingType = 'box lot';
  }

}
