import angular from 'angular';

import * as api from '../api';

const datify = dString => dString ? new Date( dString ) : null;

class Shipment {
  constructor( _data ) {
    Object.assign(
      this,
      _data,
      [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
    );


    this.palletsReceived.forEach( pr => {
      const pe = this.palletsExpected.find( _pallet => _pallet.handle === pr.handle );
  
      if( pe ) {
        pe.isReceived = true;
      }
  
      pr.isExpected = !!pe;
  
    });
  }

  isComplete() {
    return this.palletsExpected.every( pe => pe.isReceived );
  }

  noUnexpectedPallets() {
    return this.palletsReceived.every( pr => pr.isExpected );
  }

  hasProblem() {
    return this.palletsReceived.every( pr => !pr.hasProblem );
  }

}

/******************* Shipment Manager Service *************************/
//
// This service provides some utility functionality to the shipments API and UI
//
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 
  function( $q, $stateParams ) {

    const shipmentId = () =>  $stateParams.shipmentId;

    return {

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      editShipment: ( _shipmentId = shipmentId() ) => _data => $q.when( api.editIncomingShipment( _shipmentId, _data ) ),

      getShipmentId: () => shipmentId(),

      loadShipment: ( _shipmentId = shipmentId() ) => $q.when( api.getIncomingShipmentById( _shipmentId ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        return new Shipment( resp.shipment );
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

          return resp.shipments.map( data => new Shipment( data ) );

        });
      },

      receiveShipment: ( _shipmentId = shipmentId() ) => $q.when( api.receiveIncomingShipment( _shipmentId ) ),
      unreceiveShipment: ( _shipmentId = shipmentId() ) => $q.when( api.unreceiveIncomingShipment( _shipmentId ) ),

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

      removeExpectedPallet: ( _shipmentId = shipmentId() ) => _palletId => $q.when( api.removeIncomingShipmentPallet( _shipmentId, _palletId ) ),

      addExpectedPallet: ( _shipmentId = shipmentId() ) => _data => $q.when( api.addIncomingShipmentPallet( _shipmentId, _data ) ),

      receivePallet: ( _shipmentId = shipmentId() ) => _data => $q.when( api.receiveIncomingShipmentPallet( _shipmentId, _data ) ),

      unreceivePallet: ( _shipmentId = shipmentId() ) => _data => $q.when( api.unreceiveIncomingShipmentPallet( _shipmentId, _data ) ),

      editReceivedPallet: ( _shipmentId = shipmentId() ) => ( _palletId, _data ) => $q.when( api.editIncomingShipmentPalletReceived( _shipmentId, _palletId, _data ) ),

    };


  }
]);

