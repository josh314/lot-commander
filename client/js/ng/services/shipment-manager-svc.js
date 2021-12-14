import angular from 'angular';

import * as api from '../../api';

/***************************************
 * Helpers
 * =======
 * 
 ******/

const queryParams = ( params ) => {

  const qp = {};

  if( params.handle ) {
    qp.handle = params.handle;
  }

  if( params.vendor ) {
    qp.vendor = params.vendor;
  }

  if( params.status === 'not received' ) {
    qp.received = 0;
  }
  else if ( params.status === 'received' ) {
    qp.received = 1;
  }

  if( params.includeClosed ) {
    qp.include_closed = 1;
  }

  if( params.populatePalletsReceived ) {
    qp.populate_pallets_received = 1;
  }

  if( params.populatePalletsConsolidated ) {
    qp.populate_pallets_consolidated = 1;
  }

  return qp;
};

/******************* Shipment Manager Service *************************/
//
// This service provides some utility functionality to the shipments API and UI
//
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 'ShipmentFactory',
  function( $q, $stateParams, ShipmentFactory ) {

    const _shipmentId = () =>  $stateParams.shipmentId;

    return {

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      getShipmentId: () => _shipmentId(),

      loadShipment: ( { shipmentId, populate = [] } = {} ) => $q.when( api.getIncomingShipmentById( shipmentId || _shipmentId(), { populate: populate } ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        return ShipmentFactory( resp.shipment );
      }),

      buildAnonymousPalletHandle( shipmentHandle, number ) {
        return ShipmentFactory.buildAnonymousPalletHandle( shipmentHandle, number );
      },

      listShipments: ( { filter, sort, num, page } ) => {
        
        const query = { num, page };

        Object.assign( query, queryParams(filter) );
  
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

      countShipments: filter => $q.when( api.countIncomingShipments( queryParams( filter ) ) ),

      uploadShipmentDocument: ( { shipmentId, file, isRestricted } ) => $q.when( api.uploadIncomingShipmentDocument( shipmentId || _shipmentId(), file, isRestricted ) ),

    };


  }
]);


/******************* Constructor for Shipment Objects *************************/
angular.module('myApp').factory('ShipmentFactory', [ '$q', 'InventoryPalletFactory', 'UtilitiesSvc',
  function( $q, InventoryPalletFactory, UtilitiesSvc ) {
    const datify = dString => dString ? new Date( dString ) : null;

    const buildAnonymousPalletHandle = ( shipmentHandle , number ) => `${ shipmentHandle }_${ number }`; 

    function Shipment( _data ) {

      const shipment = Object.assign(
        {},
        _data,
        [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {}),
        {
          palletsReceived: _data.palletsReceived.map( _ => InventoryPalletFactory( _ ) ),
          palletsConsolidated: _data.palletsConsolidated.map( _ => InventoryPalletFactory( _ ) )
        }
      );

      // Mark received pallets as expected if applicable
      shipment.palletsReceived.forEach( pr => {

        if( angular.isString(pr) ) { // is an unpopulated Mongo ObjectId
          return;
        }

        const pe = shipment.palletsExpected.find( _pallet => _pallet.handle === pr.handle );

        if( pe ) {
          pe.isReceived = true;
        }

        pr.isExpected = !!pe;

      });

      shipment.isComplete = function() {
        return shipment.palletsExpected.every( pe => pe.isReceived );
      };

      shipment.hasAnonymousPallets = () => shipment.palletsExpected.some( pe => pe.isAnonymous );
    
      shipment.noUnexpectedPallets = function() {
        return shipment.palletsReceived.every( pr => pr.isExpected );
      };
    
      shipment.hasProblem = function() {
        return shipment.palletsReceived.some( pr => pr.hasProblem );
      };

      shipment.getTotalUnits = function() { return this.totalUnits || this.palletsExpected.reduce( (total, p) => total + (p.units || 0) , 0); };

      shipment.getNextAnonymousPalletExpected = () => shipment.palletsExpected.find( pe => pe.isAnonymous && !pe.isReceived );
    
      shipment.getNumAnonyomusPalletExpected = () => shipment.palletsExpected.reduce( (_num, p) => _num + ( p.isAnonymous ? 1 : 0 ) , 0);
      shipment.getNumAnonyomusPalletReceived = () => shipment.palletsReceived.reduce( (_num, p) => _num + ( p.isAnonymous ? 1 : 0 ) , 0);

      shipment.buildAnonymousPalletHandle = ( number ) => buildAnonymousPalletHandle( shipment.handle, number );

      shipment.validatePalletHandle = type => handle => {

        if( !handle ) {
          return false;
        }

        let pallets;
        if( type === 'expected' ) {
          pallets = shipment.palletsExpected;
        }
        else if( type === 'received' ) {
          pallets = shipment.palletsReceived;
        }
        else {
          return false;
        }

        if( pallets.find( p => p.handle === handle ) ) {
          return false;
        }

        return true;
      };

      // API functions


      shipment.editShipment = _data => $q.when( api.editIncomingShipment( shipment._id, _data ) );

      shipment.receiveShipment = ( ) => $q.when( api.receiveIncomingShipment( shipment._id ) );
      shipment.unreceiveShipment = ( ) => $q.when( api.unreceiveIncomingShipment( shipment._id ) );

      shipment.removeShipment = ( ) => $q.when( api.removeIncomingShipment( shipment._id ) );

      // Shipment document functions

      shipment.listShipmentDocuments = ( ) => $q.when( api.listIncomingShipmentDocuments( shipment._id ) ).then( resp => {

        return resp && resp.documents ? resp.documents.map( d => Object.assign( d, { displaySize: UtilitiesSvc.humanReadableFileSize(d.size) } )  ) : [];
      });

      shipment.getShipmentDocument = documentName => $q.when( api.getIncomingShipmentDocument( shipment._id, documentName ) );

      shipment.uploadShipmentDocument = ( file, isRestricted ) => $q.when( api.uploadIncomingShipmentDocument( shipment._id, file, isRestricted ) );

      shipment.updateDocumentRestrictionStatus = ( documentName, isRestricted ) => $q.when( api.updateIncomingShipmentDocumentRestrictionStatus( shipment._id, documentName, isRestricted ) );

      shipment.removeShipmentDocument = documentName => $q.when( api.removeIncomingShipmentDocument( shipment._id, documentName ) );

      // Shipment pallet functions

      shipment.editExpectedPallet = ( _palletId, _data ) => $q.when( api.editIncomingShipmentPallet( shipment._id, _palletId, _data ) );

      shipment.removeExpectedPallet = _palletId => $q.when( api.removeIncomingShipmentPallet( shipment._id, _palletId ) );

      shipment.addExpectedPallet = _data => $q.when( api.addIncomingShipmentPallet( shipment._id, _data ) );

      shipment.receivePallet = _data => $q.when( api.receiveIncomingShipmentPallet( shipment._id, _data ) );

      shipment.unreceivePallet = palletId => $q.when( api.unreceiveIncomingShipmentPallet( shipment._id, palletId ) );

      shipment.editReceivedPallet = ( _palletId, _data ) => $q.when( api.editInventoryPallet( _palletId, _data ) );

      shipment.addConsolidatedPallet = _data => $q.when( api.addIncomingShipmentPalletConsolidated( shipment._id, _data ) );

      shipment.removeConsolidatedPallet = palletId => $q.when( api.removeIncomingShipmentPalletConsolidated( shipment._id, palletId ) );
    
      shipment.editConsolidatedPallet = shipment.editReceivedPallet;
    
      // Shipment close/reopen

      shipment.close = ( ) => $q.when( api.closeIncomingShipment( shipment._id ) );
      shipment.reopen = ( ) => $q.when( api.reopenIncomingShipment( shipment._id ) );

      return shipment;
    }

    Shipment.buildAnonymousPalletHandle = buildAnonymousPalletHandle;

    return Shipment;
  }

]);