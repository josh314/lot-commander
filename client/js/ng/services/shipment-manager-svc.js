import angular from 'angular';

import * as api from '../../api';
import * as util from '../../utilities';

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

  if( "isPaidFor" in params && params.isPaidFor !== null ) {

    qp.is_paid_for = params.isPaidFor ? 1 : 0;

  }

  if( "isReadyForTransportation" in params && params.isReadyForTransportation !== null ) {

    qp.is_ready_for_transportation = params.isReadyForTransportation ? 1 : 0;

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
angular.module('myApp').service('ShipmentManagerSvc', [ '$q', '$stateParams', 'LoggedInUser', 'ModalSvc', 'ShipmentFactory',
  function( $q, $stateParams, LoggedInUser, ModalSvc, ShipmentFactory ) {

    const _shipmentId = () =>  $stateParams.shipmentId;

    const shipmentDocumentTypes = [ '', 'invoice', 'manifest', 'BOL' ].filter( _ => {

      if( _ === 'invoice' && !LoggedInUser.hasPermission('VIEW_PURCHASING_DATA') ) {
        return false;
      }

      return true;
    } );


    function uploadShipmentDocument( { shipmentId, file, documentType, isRestricted } ) {
      return $q.when( api.uploadObjectDocument( shipmentId || _shipmentId(), 'shipment', file, { documentType, isRestricted } ) );
    }


    async function uploadShipmentDocumentWithRetry( { shipmentId, file, documentType, isRestricted } ) {

      try {

        return uploadShipmentDocument( {
          shipmentId: shipmentId,
          file: file,
          documentType: documentType,
          isRestricted: isRestricted
        } );

      }
      catch( e ) {

        console.error( e );

        const isConfirmed = await ModalSvc.confirm({
          header: 'Document upload error',
          body: `Error uploading ${ file.name }. Try again?`,
        });

        if( isConfirmed ) {
          return uploadShipmentDocumentWithRetry( { shipmentId, file, documentType, isRestricted } );
        }
        else {
          return null;
        }

      }
    }


    return {

      ShipmentFactory: ShipmentFactory,

      shipmentDocumentTypes: shipmentDocumentTypes,

      createShipment: ( shipment ) => $q.when( api.createIncomingShipment( shipment ) ),

      getShipmentId: () => _shipmentId(),

      hydrateShipment: async ( __shipment, hydratePalletObjects = false ) => {

        const _shipment = angular.isString( __shipment ) ? await this.loadShipment( __shipment ) : __shipment;

        const shipment = _shipment.isHydrated ? _shipment : ShipmentFactory( _shipment, hydratePalletObjects );

        return shipment;
      },

      loadShipment: ( { shipmentId, populate = [], hydratePalletObjects = false } = {} ) => $q.when( api.getIncomingShipmentById( shipmentId || _shipmentId(), { populate: populate } ) ).then( resp => {
        if( !resp || !resp.shipment ) {
          return null;
        }

        return ShipmentFactory( resp.shipment, hydratePalletObjects );
      }),

      loadShipmentByHandle: ( { handle, populate = [], hydratePalletObjects = false } = {} ) => $q.when( api.getIncomingShipmentByHandle( handle , { populate: populate } ) ).then( resp => {

        if( !resp || !resp.shipment ) {
          return null;
        }

        return ShipmentFactory( resp.shipment, hydratePalletObjects );
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

      uploadShipmentDocument,

      uploadShipmentDocumentWithRetry,

      aggregateExpectedPallets: ( startDate, endDate ) => $q.when( api.aggregateExpectedPallets( startDate, endDate ) ),

      aggregateTransportationCosts: ( startDate, endDate, period ) => $q.when( api.aggregateTransportationCosts( startDate, endDate, period ).then( res => {

        return res.map( _ => Object.assign( _, { date: new Date( _.date ), dateString: _.date }) );


      }) ),

    };


  }
]);


/******************* Constructor for Shipment Objects *************************/
angular.module('myApp').factory('ShipmentFactory', [ '$q', 'InventoryPallet',
  function( $q, InventoryPallet ) {
    const datify = dString => dString ? new Date( dString ) : null;

    const buildAnonymousPalletHandle = ( shipmentHandle , number ) => `${ shipmentHandle }_${ number }`;

    function Shipment( _data, hydratePalletObjects = false ) {

      const shipment = Object.assign(
        { isHydrated: true },
        _data,
        [ 'arrivalDateExpected', 'arrivalDate', 'createdAt', 'updatedAt' ].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
      );

      if( hydratePalletObjects ) {
        Object.assign(
          shipment,
          {
            palletsReceived: _data.palletsReceived.map( _ => new InventoryPallet( _, { loadDocuments: true } ) ),
            palletsConsolidated: _data.palletsConsolidated.map( _ => new InventoryPallet( _, { loadDocuments: true } ) )
          }
        );
      }

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

      shipment.getTotalUnitsRemoved = function() {
        if( this.palletsReceived && this.palletsReceived.reduce ) {
          return this.palletsReceived.reduce( function( acc, _p ) {
            if( _p.getTotalUnitsRemoved ) {
              return acc + _p.getTotalUnitsRemoved();
            }
            else {
              return acc;
            }
          }, 0);
        }
      };

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
        else {
          pallets = shipment.palletsReceived.concat( shipment.palletsConsolidated );
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

      shipment.listShipmentDocuments = ( ) => $q.when( api.listObjectDocuments( shipment._id, 'shipment' ) ).then( resp => {

        if( !resp ) {
          throw new Error( { error: true, message: 'Server error.' } );
        }
        else if ( resp.error ) {
          return resp;
        }
        else {

          const documents = resp.documents || [];

          return {
            documents: documents.map( d => Object.assign( d, { displaySize: util.humanReadableFileSize(d.size), documentType: d.documentType || '' } )  )
          };
        }

      });

      shipment.getShipmentDocument = documentName => $q.when( api.getObjectDocument( shipment._id, 'shipment', documentName ) );

      shipment.uploadShipmentDocument = ( file, { documentType, isRestricted } ) => $q.when( api.uploadObjectDocument( shipment._id, 'shipment', file, { documentType, isRestricted } ) );

      shipment.updateShipmentDocumentProperties = ( documentName, { documentType, isRestricted } ) => $q.when( api.updateObjectDocumentProperties( shipment._id, 'shipment', documentName, { documentType, isRestricted } ) );

      shipment.removeShipmentDocument = documentName => $q.when( api.removeObjectDocument( shipment._id, 'shipment', documentName ) );

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

      shipment.listExpectedPalletDocuments = palletId => $q.when( api.listObjectDocuments( palletId, 'shipment-expected-pallet' ) ).then( resp => {

        if( !resp ) {
          throw new Error( { error: true, message: 'Server error.' } );
        }
        else if ( resp.error ) {
          return resp;
        }
        else {

          const documents = resp.documents || [];

          return {
            documents: documents.map( d => Object.assign( d, { displaySize: util.humanReadableFileSize(d.size), documentType: d.documentType || '' } )  )
          };
        }

      });

      shipment.getExpectedPalletDocument = ( palletId, documentName ) => $q.when( api.getObjectDocument( palletId, 'shipment-expected-pallet', documentName ) );

      shipment.uploadExpectedPalletDocument = ( palletId, file, { documentType, isRestricted } ) => $q.when( api.uploadObjectDocument( palletId, 'shipment-expected-pallet', file, { documentType, isRestricted } ) );

      shipment.updateExpectedPalletDocumentProperties = ( palletId, documentName, { documentType, isRestricted } ) => $q.when( api.updateObjectDocumentProperties( palletId, 'shipment-expected-pallet', documentName, { documentType, isRestricted } ) );

      shipment.removeExpectedPalletDocument = ( palletId, documentName ) => $q.when( api.removeObjectDocument( palletId, 'shipment-expected-pallet', documentName ) );

      // Shipment close/reopen

      shipment.close = ( ) => $q.when( api.closeIncomingShipment( shipment._id ) );
      shipment.reopen = ( ) => $q.when( api.reopenIncomingShipment( shipment._id ) );

      return shipment;
    }

    Shipment.buildAnonymousPalletHandle = buildAnonymousPalletHandle;

    return Shipment;
  }

]);