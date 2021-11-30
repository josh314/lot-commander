import angular from 'angular';

import * as api from '../../api';

/***************************************
 * Helpers
 * =======
 * 
 ******/

const queryParams = ( params ) => {

  const qp = {
    is_deleted: 0
  };

  if( params.handle ) {
    qp.handle = params.handle;
  }

  
  if( params.status === 'not brokendown' ) {
    qp.is_brokendown = 0;
  }
  else if ( params.status === 'brokendown' ) {
    qp.is_brokendown = 1;
  }

  if( params.populateShipment ) {
    qp.populate_shipment = 1;
  }

  return qp;
};


/******************* Received Pallet Manager Service *************************/
//
// This service provides some utility functionality to the pallets API and UI
//
angular.module('myApp').service('ReceivedPalletManagerSvc', [ '$q', '$stateParams', 'ReceivedPalletFactory',
  function( $q, $stateParams, ReceivedPalletFactory ) {

    const _palletId = () =>  $stateParams.palletId;

    return {
      list: ( { filter, sort, num, page } ) => {
          
        const query = {
          num,
          page
        };

        Object.assign( query, queryParams(filter) );

        if( sort.key ) {
          query.sort = sort.key;
          query.sort_dir = sort.ascending ? 1 : -1;
        }

        return $q.when( api.listReceivedPallets( query ) ).then( pallets => {
          if( !pallets ) {
            return [];
          }

          return pallets.map( data => ReceivedPalletFactory( data ) );

        });
      },

      count: filter => $q.when( api.countReceivedPallets( queryParams( filter ) ) ),
    };
  }
]);

angular.module('myApp').factory('ReceivedPalletFactory', [ '$q',
  function( $q ) {
    const datify = dString => dString ? new Date( dString ) : null;

    function ReceivedPallet( _data ) {

      const pallet = Object.assign(
        {},
        _data,
        [ 'brokendownDate', 'deletedDate' , 'createdAt', 'updatedAt'].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
      );

      pallet.breakdown = isBrokendown => $q.when( api.breakdownReceivedPallet( pallet._id, isBrokendown ) ).then( _ => pallet.isBrokendown = isBrokendown );

      return pallet;
    }

    return ReceivedPallet;
  }
]);
