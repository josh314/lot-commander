import angular from 'angular';

import * as api from '../../api';
import * as util from '../../utilities';

/***************************************
 * Helpers
 * =======
 *
 ******/

const queryParams = ( params ) => {

  const qp = Object.assign( {}, params );

  if( "isBrokendown" in qp ) {

    if( qp.isBrokendown !== null ) {
      qp.is_brokendown = qp.isBrokendown ? 1 : 0;
    }

    delete qp.isBrokendown;
  }

  if( "toBeListed" in qp ) {

    if( qp.toBeListed !== null ) {
      qp.to_be_listed = qp.toBeListed ? 1 : 0;
    }

    delete qp.toBeListed;
  }

  if( "isRepacked" in qp ) {

    if( qp.isRepacked !== null ) {
      qp.is_repacked = qp.isRepacked ? 1 : 0;
    }

    delete qp.isRepacked;
  }

  if( "hasLot" in qp ) {

    if( qp.hasLot !== null ) {
      qp.has_lot = qp.hasLot ? 1 : 0;
    }

    delete qp.hasLot;
  }

  if( qp.populateShipment ) {
    qp.populate_shipment = 1;
    delete qp.populateShipment;
  }

  if( qp.populateLot ) {
    qp.populate_lot = 1;
    delete qp.populateLot;
  }

  if( qp.shipmentHandle ) {
    qp.shipment_handle = qp.shipmentHandle;
    delete qp.shipmentHandle;
  }

  return qp;
};


/******************* Inventory Pallet Manager Service *************************/
//
// This service provides some utility functionality to the pallets API and UI
//
angular.module('myApp').service( 'InventoryPalletManagerSvc', [

  '$q',
  '$stateParams',
  'InventoryPallet',
  'ModalSvc',
  'InventoryPalletListColumns',

  function(

    $q,
    $stateParams,
    InventoryPallet,
    ModalSvc,
    InventoryPalletListColumns,

  ) {

    const _palletId = () =>  $stateParams.palletId;

    return {

      getPalletId: _palletId,

      get: ( palletId, { populate = [] } ) => $q.when( api.getInventoryPallet( palletId, { populate } ) ).then( resp => new InventoryPallet( resp.pallet, { loadDocuments: true } ) ),

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

        return $q.when( api.listInventoryPallets( query ) ).then( pallets => {
          if( !pallets ) {
            return [];
          }

          return pallets.map( data => new InventoryPallet( data, { loadDocuments: true } ) );

        });
      },

      count: filter => $q.when( api.countInventoryPallets( queryParams( filter ) ) ),

      aggregate: date => $q.when( api.aggregateInventoryPallets( date ) ),

      create: pallets => $q.when( api.createInventoryPallets( pallets ) ),

      getListColumns: columnNames => InventoryPalletListColumns( columnNames ),

      details: pallet => ModalSvc.inventoryPalletDetails( pallet ),
    };
  }
]);

/*********************** InventoryPallet class */
angular.module('myApp').factory( 'InventoryPallet', [

  '$q',
  'ModalSvc',

  function(

    $q,
    ModalSvc,

  ) {

    const datify = dString => dString ? new Date( dString ) : null;

    class InventoryPallet {

      constructor( _data, { loadDocuments = true } = {} ) {


        Object.assign( this,
          { isHydrated: true, showNote: false, isExpected: false },
          _data,
          [ 'brokendownDate', 'repackedDate', 'deletedDate' , 'createdAt', 'updatedAt'].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
        );

        // This defines a promise which is resolved once this.documents is populated. Awaiting this data-field prevents `dereferencing undefined` errors.  Use it like so:
        //
        // await pallet.documentsAreLoaded;
        // const manifest = pallet.documents[0];
        //
        this.documentsAreLoaded = loadDocuments ? this.loadDocuments() : Promise.resolve(null);

      }

      breakdown( isBrokendown ) {

        return $q.when( api.breakdownInventoryPallet( this._id, isBrokendown ) ).then( resp => {

          if( !resp || !resp.pallet ) return;

          this.isBrokendown = resp.pallet.isBrokendown;
          this.brokendownDate = resp.pallet.brokendownDate && datify( resp.pallet.brokendownDate );

        } );

      }

      repack( isRepacked ) {

        return $q.when( api.repackInventoryPallet( this._id, isRepacked ) ).then( resp => {

          if( !resp || !resp.pallet ) return;

          this.isRepacked = resp.pallet.isRepacked;
          this.repackedDate = resp.pallet.repackedDate && datify( resp.pallet.repackedDate );

        } );

      }

      delete( ) {

        return $q.when( api.deleteInventoryPallet( this._id ) ).then( resp => {

          if( !resp || !resp.pallet ) return;

          this.isDeleted = resp.pallet.isDeleted;
          this.deletedDate = resp.pallet.deletedDate && datify( resp.pallet.deletedDate );

        } );

      }

      _generateEditDocument( _data ) {

        const editFields = [
          'handle',
          'category',
          'condition',
          'units',
          'removedItems',
          'retailValue',
          'salePrice',
          'cost',
          'toBeListed',
          'hasProblem',
          'note'
        ];

        const editDoc = {};

        for( let f of editFields ) {
          editDoc[ f ] = _data[ f ];
        }

        return editDoc;
      }

      edit( _data ) {

        const editDoc = this._generateEditDocument( _data );

        return $q.when( api.editInventoryPallet( this._id, editDoc ) ).then( resp => {

          if( !resp || !resp.pallet ) return;

          for( let [ modifiedField, newValue ] of Object.entries( editDoc ) ) {
            this[ modifiedField ] = newValue;
          }

          return this;
        } );

      }

      save() {

        const editDoc = this._generateEditDocument( this );

        if( this._id ) {
          return $q.when( api.editInventoryPallet( this._id, editDoc ) );
        }
        else {
          return $q.when( api.createInventoryPallets( [ editDoc ] ) );
        }

      }

      detailsModal() {

        return ModalSvc.inventoryPalletDetails( this ).then( details => {

          let newBrokendownStatus = null;
          if( this.isBrokendown !== details.isBrokendown ) {
            newBrokendownStatus = details.isBrokendown;
            delete details.isBrokendown;
          }

          let newRepackedStatus = null;
          if( this.isRepacked !== details.isRepacked ) {
            newRepackedStatus = details.isRepacked;
            delete details.isRepacked;
          }

          const isChanged = Object.keys( details ).some( _key => details[ _key ] !== this[ _key ] );
          if( isChanged ) {
            Object.assign( this, details );
          }

          const breakdownPromise = newBrokendownStatus !== null ? this.breakdown( newBrokendownStatus ) : Promise.resolve( null );
          const repackPromise = newRepackedStatus !== null ? this.repack( newRepackedStatus ) : Promise.resolve( null );
          const savePromise = isChanged ? this.save() : Promise.resolve( null );

          return Promise.allSettled( [ breakdownPromise, repackPromise, savePromise ] );

        } )
          .catch( e => e ? console.error(e) : console.log('Pallet edit canceled.') );

      }

      // Pallet documents
      listDocuments( ) {
        return $q.when( api.listObjectDocuments( this._id, this.isReceived ? 'received-pallet' : 'consolidated-pallet' ) ).then( resp => {

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
      }

      getDocument( documentName ) {
        return $q.when( api.getObjectDocument( this._id, this.isReceived ? 'received-pallet' : 'consolidated-pallet', documentName ) );
      }
      uploadDocument( file, { documentType, isRestricted } ) {
        return $q.when( api.uploadObjectDocument( this._id, this.isReceived ? 'received-pallet' : 'consolidated-pallet', file, { documentType, isRestricted } ) );
      }
      updateDocumentProperties( documentName, { documentType, isRestricted } ) {
        return $q.when( api.updateObjectDocumentProperties( this._id, this.isReceived ? 'received-pallet' : 'consolidated-pallet', documentName, { documentType, isRestricted } ) );
      }
      removeDocument( documentName ) {
        return $q.when( api.removeObjectDocument( this._id, this.isReceived ? 'received-pallet' : 'consolidated-pallet', documentName ) );
      }

      loadDocuments() {
        return this.listDocuments().then( resp => {
          this.documents = (resp && resp.documents) ? resp.documents : [];
        } );
      }

      getManifestMetadata() {
        if( this.documents ) {
          const manifest = this.documents.find( _d => _d.documentType === 'manifest' );
          return manifest;
        }
      }

      hasManifest() {
        return !!this.getManifestMetadata();
      }

      canRepack() {
        return this.hasManifest() && this.toBeListed && !this.isRepacked && !this.lot;
      }

      canMakeLot() {
        if( this.lot ) {
          return false;
        }

        return this.toBeListed && this.isRepacked;

      }

      getTotalUnitsRemoved() {
        if( this.removedItems && this.removedItems.reduce ) {
          return this.removedItems.reduce( ( acc, _item ) => acc + ( _item.numRemoved || 0 ) , 0 );
        }
        else {
          return 0;
        }
      }

      getTotalRetailValueRemoved() {
        if( this.removedItems && this.removedItems.reduce ) {
          return this.removedItems.reduce( ( acc, _item ) => acc + ( _item.unitRetailPrice * _item.numRemoved || 0 ) , 0 );
        }
        else {
          return 0;
        }
      }

    }

    return InventoryPallet;
  }
]);

angular.module('myApp').factory( 'InventoryPalletListColumns', [ 'LoggedInUser', function( LoggedInUser ) {

  const showPurchasingData = LoggedInUser.hasPermission( 'VIEW_PURCHASING_DATA' );
  const showMakeLot = LoggedInUser.hasPermission( 'CREATE_LOT' );
  const showRepackPallet = LoggedInUser.hasPermission( 'EDIT_INVENTORY_PALLET_DOCUMENT' );

  const __COLUMNS__ = {
    handle: {
      optionName: 'Pallet ID',
      header: 'Pallet ID',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    shipment: {
      optionName: 'Shipment',
      header: 'Shipment',
      permitted: true,
      defaultActive: true,
      optionAvailable: true,
      noSort: true
    },
    lot: {
      optionName: 'Lot',
      header: 'Lot',
      permitted: true,
      defaultActive: false,
      optionAvailable: true,
      noSort: true
    },
    category: {
      optionName: 'Category',
      header: 'Category',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    condition: {
      optionName: 'Condition',
      header: 'Condition',
      defaultSortAscending: true,
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    createdAt: {
      optionName: 'Created',
      header: 'Created',
      defaultSortAscending: false,
      transform: util.prettifyDate.bind( util ),
      permitted: true,
      defaultActive: true,
      optionAvailable: true
    },
    breakdown: {
      optionName: 'Mark As Breakdown',
      header: 'Mark As Breakdown',
      permitted: true,
      defaultActive: true,
      optionAvailable: true,
      noSort: true,
    },
    brokendownDate: {
      optionName: 'Brokendown on',
      header: 'Brokendown on',
      transform: util.prettifyDate.bind( util ),
      permitted: true,
      defaultActive: false,
      optionAvailable: true
    },
    isRepacked: {
      optionName: 'Repacked?',
      header: 'Repacked?',
      permitted: true,
      defaultActive: false,
      optionAvailable: true,
      noSort: true,
    },
    repackedDate: {
      optionName: 'Repacked date',
      header: 'Repacked date',
      transform: util.prettifyDate.bind( util ),
      permitted: true,
      defaultActive: false,
      optionAvailable: true
    },
    hasProblem: {
      optionName: 'Problem?',
      header: 'Problem?',
      permitted: true,
      defaultActive: false,
      optionAvailable: true,
      noSort: true,
    },
    note: {
      optionName: 'Note',
      header: 'Note',
      permitted: true,
      defaultActive: false,
      optionAvailable: true,
      noSort: true,
    },
    cost: {
      optionName: 'Cost',
      header: 'Cost',
      permitted: showPurchasingData,
      defaultActive: false,
      optionAvailable: showPurchasingData,
      transform: util.displayAsMoney.bind( util ),
      noSort: true,
    },
    repackPallet: {
      optionName: 'Repack pallet button',
      header: '',
      permitted: showRepackPallet,
      defaultActive: false,
      optionAvailable: showRepackPallet,
      noSort: true,
    },
    makeLot: {
      optionName: 'Make Lot button',
      header: '',
      permitted: showMakeLot,
      defaultActive: false,
      optionAvailable: showMakeLot,
      noSort: true,
    },
  };

  function Factory( _columnNames ) {

    const columns = {};

    for( let [ _cname, _cdata ] of Object.entries( __COLUMNS__ ) ) {

      columns[ _cname ] = Object.assign( {}, _cdata );

      if( angular.isArray( _columnNames ) ) {
        columns[ _cname ].active = __COLUMNS__[ _cname ].permitted && _columnNames.includes( _cname );
      }
      else {
        columns[ _cname ].active = __COLUMNS__[ _cname ].permitted && __COLUMNS__[ _cname ].defaultActive;
      }

    }

    return columns;
  }


  return Factory;

}]);
