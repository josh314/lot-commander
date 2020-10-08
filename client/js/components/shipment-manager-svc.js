import angular from 'angular';

import * as api from '../api';


/******************* Shipment Manager Service *************************/
//
// This service provides some utility functionality to the shipments API and UI
//
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 'ShipmentFactory',
  function( $q, $stateParams, ShipmentFactory ) {

    const shipmentId = () =>  $stateParams.shipmentId;

    return {

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      getShipmentId: () => shipmentId(),

      loadShipment: ( _shipmentId = shipmentId() ) => $q.when( api.getIncomingShipmentById( _shipmentId ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        return ShipmentFactory( resp.shipment );
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

          return resp.shipments.map( data => ShipmentFactory( data ) );

        });
      },

    };


  }
]);


/******************* Constructor for Shipment Objects *************************/
angular.module('myApp').factory('ShipmentFactory', [ '$q', 
  function( $q ) {
    const datify = dString => dString ? new Date( dString ) : null;

    function Shipment( _data ) {
    
      const shipment = Object.assign(
        {},
        _data,
        [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
      );
  
  
      shipment.palletsReceived.forEach( pr => {
        const pe = shipment.palletsExpected.find( _pallet => _pallet.handle === pr.handle );
    
        if( pe ) {
          pe.isReceived = true;
        }
    
        pr.isExpected = !!pe;
    
      });

    
      shipment.isComplete = function() {
        return shipment.palletsExpected.every( pe => pe.isReceived );
      }
    
      shipment.noUnexpectedPallets = function() {
        return shipment.palletsReceived.every( pr => pr.isExpected );
      }
    
      shipment.hasProblem = function() {
        return shipment.palletsReceived.every( pr => !pr.hasProblem );
      }
    
      // API functions


      shipment.editShipment = _data => $q.when( api.editIncomingShipment( shipment._id, _data ) );

      shipment.receiveShipment = ( ) => $q.when( api.receiveIncomingShipment( shipment._id ) );
      shipment.unreceiveShipment = ( ) => $q.when( api.unreceiveIncomingShipment( shipment._id ) );

      shipment.removeShipment = ( ) => $q.when( api.removeIncomingShipment( shipment._id ) );

      // Shipment document functions

      shipment.listShipmentDocuments = ( ) => $q.when( api.listIncomingShipmentDocuments( shipment._id ) ).then( resp => {

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
      });

      shipment.uploadShipmentDocument = ( documentName, file) => $q.when( api.uploadIncomingShipmentDocument( shipment._id, documentName, file) );

      shipment.removeShipmentDocument = documentName => $q.when( api.removeIncomingShipmentDocument( shipment._id, documentName ) );

      // Shipment pallet functions

      shipment.editExpectedPallet = ( _palletId, _data ) => $q.when( api.editIncomingShipmentPallet( shipment._id, _palletId, _data ) );

      shipment.removeExpectedPallet = _palletId => $q.when( api.removeIncomingShipmentPallet( shipment._id, _palletId ) );

      shipment.addExpectedPallet = _data => $q.when( api.addIncomingShipmentPallet( shipment._id, _data ) );

      shipment.receivePallet = _data => $q.when( api.receiveIncomingShipmentPallet( shipment._id, _data ) );

      shipment.unreceivePallet = _data => $q.when( api.unreceiveIncomingShipmentPallet( shipment._id, _data ) );

      shipment.editReceivedPallet = ( _palletId, _data ) => $q.when( api.editIncomingShipmentPalletReceived( shipment._id, _palletId, _data ) );


      shipment.editExpectedPallet = ( _palletId, _data ) => $q.when( api.editIncomingShipmentPallet( shipment._id, _palletId, _data ) );
    
      shipment.editReceivedPallet = ( _palletId, _data ) => $q.when( api.editIncomingShipmentPalletReceived( this._id, _palletId, _data ) );
    
      return shipment;
    }

    return Shipment;
  }

]);