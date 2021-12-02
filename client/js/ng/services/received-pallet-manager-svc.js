import angular from 'angular';

import * as api from '../../api';

/***************************************
 * Helpers
 * =======
 * 
 ******/

const queryParams = ( params ) => {

  const qp = Object.assign( {}, params );

  if( qp.status ) {

    if( qp.status === 'not brokendown' ) {
      qp.is_brokendown = 0;
    }
    else if ( qp.status === 'brokendown' ) {
      qp.is_brokendown = 1;
    }

    delete qp.status;

  }

  if( qp.populateShipment ) {
    qp.populate_shipment = 1;
    delete qp.populateShipment;
  }

  if( qp.shipmentHandle ) {
    qp.shipment_handle = qp.shipmentHandle;
    delete qp.shipmentHandle;
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

      create: pallets => $q.when( api.createReceivedPallets( pallets ) )
    };
  }
]);

angular.module('myApp').factory('ReceivedPalletFactory', [ '$q',
  function( $q ) {
    const datify = dString => dString ? new Date( dString ) : null;

    function ReceivedPallet( _data ) {

      const pallet = Object.assign(
        { showNote: false },
        _data,
        [ 'brokendownDate', 'deletedDate' , 'createdAt', 'updatedAt'].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
      );

      pallet.breakdown = isBrokendown => $q.when( api.breakdownReceivedPallet( pallet._id, isBrokendown ) );

      if( !pallet.cost && pallet.shipment && pallet.shipment.cost ) {

        pallet.cost = pallet.shipment.cost / pallet.shipment.palletsReceived.length;

      }

      return pallet;
    }

    return ReceivedPallet;
  }
]);
