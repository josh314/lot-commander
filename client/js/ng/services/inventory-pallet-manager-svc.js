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


/******************* Inventory Pallet Manager Service *************************/
//
// This service provides some utility functionality to the pallets API and UI
//
angular.module('myApp').service('InventoryPalletManagerSvc', [ '$q', '$stateParams', 'InventoryPallet', 'InventoryPalletDetailsModalSvc', 'InventoryPalletListColumns',
  function( $q, $stateParams, InventoryPallet, InventoryPalletDetailsModalSvc, InventoryPalletListColumns ) {

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

        return $q.when( api.listInventoryPallets( query ) ).then( pallets => {
          if( !pallets ) {
            return [];
          }

          return pallets.map( data => new InventoryPallet( data ) );

        });
      },

      count: filter => $q.when( api.countInventoryPallets( queryParams( filter ) ) ),

      aggregate: () => $q.when( api.aggregateInventoryPallets( ) ),

      create: pallets => $q.when( api.createInventoryPallets( pallets ) ),

      getListColumns: () => InventoryPalletListColumns(),

      details: pallet => InventoryPalletDetailsModalSvc.launch( pallet ),
    };
  }
]);

angular.module('myApp').factory('InventoryPallet', [ '$q', 'InventoryPalletDetailsModalSvc',
  function( $q, InventoryPalletDetailsModalSvc ) {
    const datify = dString => dString ? new Date( dString ) : null;

    class InventoryPallet {

      constructor( _data ) {


        Object.assign( this,
          { showNote: false, isExpected: false },
          _data,
          [ 'brokendownDate', 'deletedDate' , 'createdAt', 'updatedAt'].reduce( (acc, d) => Object.assign( acc, { [d]: datify( _data[ d ] ) } ), {})
        );

        if( !this.cost && this.shipment && this.shipment.cost ) {

          this.cost = this.shipment.cost / this.shipment.palletsExpected.length;

        }

      }

      breakdown( isBrokendown ) {

        return $q.when( api.breakdownInventoryPallet( this._id, isBrokendown ) ).then( resp => {

          if( !resp || !resp.pallet ) return;

          this.isBrokendown = resp.pallet.isBrokendown;
          this.brokendownDate = resp.pallet.brokendownDate && datify( resp.pallet.brokendownDate );

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
          'cost',
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

        return InventoryPalletDetailsModalSvc.launch( this ).then( details => {

          let newBrokendownStatus = null;
          if( this.isBrokendown !== details.isBrokendown ) {
            newBrokendownStatus = details.isBrokendown;
            delete details.isBrokendown;
          }


          const isChanged = Object.keys( details ).some( _key => details[ _key ] !== this[ _key ] );
          if( isChanged ) {
            Object.assign( this, details );
          }

          const breakdownPromise = newBrokendownStatus !== null ? this.breakdown( newBrokendownStatus ) : Promise.resolve( null );
          const savePromise = isChanged ? this.save() : Promise.resolve( null );

          return Promise.allSettled( [ breakdownPromise, savePromise ] );

        } );

      }

    }

    return InventoryPallet;
  }
]);

angular.module('myApp').factory( 'InventoryPalletListColumns', [ 'LoggedInUser', 'UtilitiesSvc', function( LoggedInUser, UtilitiesSvc ) {

  const showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

  const __COLUMNS__ = {
    handle: {
      displayName: 'Pallet ID',
      defaultSortAscending: true,
      active: true,
      optionAvailable: true
    },
    shipment: {
      displayName: 'Shipment',
      active: true,
      optionAvailable: true,
      noSort: true
    },
    category: {
      displayName: 'Category',
      defaultSortAscending: true,
      active: true,
      optionAvailable: true
    },
    condition: {
      displayName: 'Condition',
      defaultSortAscending: true,
      active: true,
      optionAvailable: true
    },
    createdAt: {
      displayName: 'Created',
      defaultSortAscending: false,
      transform: UtilitiesSvc.prettifyDate.bind( UtilitiesSvc ),
      active: true,
      optionAvailable: true
    },
    breakdown: {
      displayName: 'Mark As Breakdown',
      active: true,
      optionAvailable: true,
      noSort: true,
    },
    brokendownDate: {
      displayName: 'Brokendown on',
      transform: UtilitiesSvc.prettifyDate.bind( UtilitiesSvc ),
      active: false,
      optionAvailable: true
    },
    hasProblem: {
      displayName: 'Problem?',
      active: false,
      optionAvailable: true,
      noSort: true,
    },
    note: {
      displayName: 'Note',
      active: false,
      optionAvailable: true,
      noSort: true,
    },
    cost: {
      displayName: 'Cost',
      active: false,
      optionAvailable: showPurchasingData,
      transform: _ => _ ? `$${_.toFixed(2)}` : '',
      noSort: true,
    },
  };

  function Factory( ) {

    const columns = {};
    for( let [ _cname, _cdata] of Object.entries( __COLUMNS__ ) ) {
      columns[ _cname ] = Object.assign( {}, _cdata );
    }

    return columns;
  }


  return Factory;

}]);

angular.module('myApp').factory( 'InventoryPalletDetailsModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  function launch( pallet ) {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_inventory_pallet_details_modal.html',
      size: 'lg',
      backdrop: 'static',

      resolve: {
        pallet: function () {
          return pallet;
        }
      },

      controller: [ '$scope', 'LoggedInUser', 'pallet', 'palletProperties', function( $scope, LoggedInUser, pallet, palletProperties ){

        const vm = this;
        vm.inputs = Object.assign( { isBrokendown: false, hasProblem: false, category: null, condition: 'shelf-pull' }, pallet );
        vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) );
        vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) );
        vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
        vm.showBrokendownDate = pallet.isBrokendown;
        vm.showCreatedAtDate = !!pallet.createdAt;
        vm.showShipment = !!pallet.shipment;

        vm.finish = () => {
          return $scope.$close( vm.inputs );
        };

      }],
      controllerAs: '$ctrl'

    });

    return modalInstance.result;
  }


}] );