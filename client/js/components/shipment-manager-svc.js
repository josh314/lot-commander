import angular from 'angular';

import * as api from '../api';

const clone = _ => JSON.parse( JSON.stringify( _ ) );

/******************* Shipment Manager Service *************************/
//
// This service provides some utility functionality to the shipments API and UI
//
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 
  function( $q, $stateParams ) {

    const shipmentId = () =>  $stateParams.shipmentId;

    const palletAudit = shipment => {

      // working copy of expected pallets array
      const expected = clone( shipment.palletsExpected ).map( p => Object.assign( p, { isReceived: false, isExpected: true } ) );

      // initialize the final audit as a new array with the same references as the expected pallets array 
      const audit = [].concat( expected );

      if( shipment.isReceived ) {


        for( const pr of shipment.palletsReceived ) {

          const found = expected.find( pe => pe.handle === pr.handle );
          if( found ) {

            Object.assign(
              found,
              { isReceived: true },
              {
                hasProblem: pr.hasProblem,
                note: pr.note,
                showNote: false,
                toggleShowNote: function() { this.showNote = !this.showNote; }
              }
            );

          }
          else {

            audit.push( Object.assign( clone( pr ), { isExpected: false } ) );

          }

        }

      }
      return audit;
    };

    const datify = dString => dString ? new Date( dString ) : null;

    const process = shipment => Object.assign(
      {},
      shipment,
      [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( shipment[ d ] ) } ), {}),
      { palletAudit: palletAudit(shipment) }
    );

    return {

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      editShipment: ( _shipmentId = shipmentId() ) => _data => $q.when( api.editIncomingShipment( _shipmentId, _data ) ),

      getShipmentId: () => shipmentId(),

      loadShipment: ( _shipmentId = shipmentId() ) => $q.when( api.getIncomingShipmentById( _shipmentId ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        const shipment = resp.shipment;

        return process( shipment);
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

          return resp.shipments.map( process );

        });
      },

      removeShipment: ( _shipmentId = shipmentId() ) => $q.when( api.removeIncomingShipment( _shipmentId ) ),

      // Shipment document functions

      listShipmentDocuments: ( _shipmentId = shipmentId() ) => $q.when( api.listIncomingShipmentDocuments( _shipmentId ) ).then( resp => {

        const displaySize = size => {
          if( size > 1024*1024 ) {
            return `${(size/1024/1024).toFixed(2)} MB`;
          }
          else if ( size > 1024 ) {
            return `${(size/1024).toFixed(2)} KB`;
          }
          else {
            return `${size} B`;
          }
        };
        return resp && resp.documents ? resp.documents.map( d => Object.assign( d, { displaySize: displaySize(d.size) } )  ) : [];
      }),

      uploadShipmentDocument: ( _shipmentId = shipmentId() ) => (documentName, file) => $q.when( api.uploadIncomingShipmentDocument( _shipmentId, documentName, file) ),

      removeShipmentDocument: ( _shipmentId = shipmentId() ) => documentName => $q.when( api.removeIncomingShipmentDocument( _shipmentId, documentName ) ),

      // Shipment pallet functions

      editExpectedPallet: ( _shipmentId = shipmentId() ) => ( _palletId, _data ) => $q.when( api.editIncomingShipmentPallet( _shipmentId, _palletId, _data ) ),

    };


  }
]);

