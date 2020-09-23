import angular from 'angular';

import * as api from '../api';

/******************* Shipment Manager Service *************************/
//
// This service provides some utility functionality to the shipments API and UI
//
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 
  function( $q, $stateParams ) {

    const shipmentId = () =>  $stateParams.shipmentId;

    const datify = dString => dString ? new Date( dString ) : null;

    const prettify = shipment => Object.assign(
      {},
      shipment,
      [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( shipment[ d ] ) } ), {}),
    );

    return {

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      getShipmentId: () => shipmentId(),

      loadShipment: () => $q.when( api.getIncomingShipmentById( shipmentId() ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        const shipment = resp.shipment;

        return prettify( shipment);
      }),

      listShipments: ( { filter, sort } ) => {
        
        const query = {};
        if( filter.handle ) {
          query.handle = filter.handle;
        }

        if( filter.vendor ) {
          query.vendor = filter.vendor;
        }
  
        if( filter.status === 'awaiting' ) {
          query.received = 0;
        }
        else if ( filter.status === 'received' ) {
          query.received = 1;
        }
  
        if( sort.key ) {
          query.sort = sort.key;
          query.sort_dir = sort.ascending ? 1 : -1;
        }
  

        return $q.when( api.listIncomingShipments( query ) ).then( resp => {
          if( !resp || !resp.shipments ) {
            return [];
          }

          return resp.shipments.map( prettify );

        });
      },

    };


  }
]);

