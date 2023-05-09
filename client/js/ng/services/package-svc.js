import angular from 'angular';

import * as api from '../../api';


/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( params ) => {

  const qp = Object.assign( {}, params );

  if( qp.populateShipment ) {
    qp.populate_shipment = 1;
    delete qp.populateShipment;
  }

  return qp;
};


/******************* Service for managing packages ***/
angular.module('myApp').factory( 'PackageSvc', [ '$q',
  function( $q ) {

    return {
      createDuplicatePackages,
      count,
      get,
      instantiate,
      list,
    };

    function get( packageId ) {
      return $q.when( api.getPackage( packageId ) );
    }

    function createDuplicatePackages( packageData, numPackages ) {

      const pkgs = [];

      for( let i=0; i<numPackages; i++ ) {
        pkgs.push( Object.assign( { }, packageData ) );
      }

      return $q.when( api.createPackages( pkgs ) );

    }

    function list( { filter, sort, num, page } ) {

      const query = {
        num,
        page
      };

      Object.assign( query, queryParams(filter) );

      if( sort.key ) {
        query.sort = sort.key;
        query.sort_dir = sort.ascending ? 1 : -1;
      }

      return $q.when( api.listPackages( query ) );
    }

    function count( filter ) {
      return $q.when( api.countPackages( queryParams( filter ) ) );
    }

    function instantiate( packageId ) {
      return $q.when( api.instantiatePackage( packageId ) );
    }

  }
]);
