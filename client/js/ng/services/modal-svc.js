import angular from 'angular';

import * as util from '../../utilities';

/******************* One Modal Service to Rule Them All ******************************/
angular.module('myApp').factory('ModalSvc', [

  'ChooseOptionsModal',
  'ConfirmationModal',
  'InventoryPalletDetailsModalSvc',
  'ManifestFileOptionsModal',
  'MergeSheetsOptionsModalSvc',
  'messageModal',
  'PalletsFromManifestModalSvc',
  'shippingItemsModal',
  'WaitingModalSvc',

  function(

    ChooseOptionsModal,
    ConfirmationModal,
    InventoryPalletDetailsModalSvc,
    ManifestFileOptionsModal,
    MergeSheetsOptionsModalSvc,
    messageModal,
    PalletsFromManifestModalSvc,
    shippingItemsModal,
    WaitingModalSvc,

  ){

    return {

      chooseOptions: ChooseOptionsModal.launch.bind( ChooseOptionsModal ),
      confirm: ConfirmationModal.launch.bind( ConfirmationModal ),
      inventoryPalletDetails: InventoryPalletDetailsModalSvc.launch.bind( InventoryPalletDetailsModalSvc ),
      manifestFileOptions: ManifestFileOptionsModal.launch.bind( ManifestFileOptionsModal ),
      mergeSheetsOptions: MergeSheetsOptionsModalSvc.launch.bind( MergeSheetsOptionsModalSvc ),
      message: messageModal.launch.bind( messageModal ),
      packagingTypeInfo: packagingTypeInfoModal,
      palletsFromManifest: PalletsFromManifestModalSvc.launch.bind( PalletsFromManifestModalSvc ),
      shippingItems: shippingItemsModal.launch.bind( shippingItemsModal ),
      wait: WaitingModalSvc.launch.bind( WaitingModalSvc ),

    };

    function packagingTypeInfoModal() {
      const packagingInfoHtml = `
      <dl>
        <dt>box lot</dt>
        <dd>Standard small lot packed into one or more boxes</dd>
        <dt>pallets</dt>
        <dd>Pallet lot that is eligible for Pallet Breakdown Service</dd>
        <dt>pallets:bulky</dt>
        <dd>Pallet lot that is not eligible for Pallet Breakdown Service, but is within the normal size range for a pallet</dd>
        <dt>pallets:oversized</dt>
        <dd>Pallet-sized lot containing oversized items which exceed the normal dimensions of a pallet. Not eligible for Pallet Breakdown Service</dd>
        <dt>truckloads</dt>
        <dd>Truckloads or LTL lots</dd>
      </dl>
    `;
      return messageModal.launch( { header: 'Packaging Types', html: packagingInfoHtml, type: 'info' } );
    }

  }
]);

/******************* Choose Options Modal service ******************************/
angular.module('myApp').factory( 'ChooseOptionsModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( { header, message, options, chooseOnlyOne = false } ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_choose_options_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          data: function () {
            return {
              header,
              message,
              options: JSON.parse( JSON.stringify( options ) ),
              chooseOnlyOne
            };
          }
        },

        controller: [ 'data', function( data ) {

          const vm = this;
          Object.assign( vm, data );
          vm.options.forEach( _ => _.selected = false );

          const countSelected = () => vm.options.filter( _ => _.selected ).length;

          vm.isOverChosen = () => {

            if ( chooseOnlyOne && countSelected() > 1 ) {
              return true;
            }
            else {
              return false;
            }

          };

          vm.disableButton = () => {

            if( countSelected() <=0 ) {
              return true;
            }
            else {
              return vm.isOverChosen();
            }

          };

        }],
        controllerAs: '$ctrl'

      });

      return modalInstance.result;
    }

  };
}]);

/******************* Message Modal service ******************************/
angular.module('myApp').factory( 'messageModal', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( message ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_message_modal.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          message: function () {
            return JSON.parse( JSON.stringify( message ) ); // deep clone
          }
        },
        controller: [ 'message', function( message ){

          const vm = this;
          vm.message = message;

        }],
        controllerAs: '$ctrl'
      });

      return modalInstance.result;
    }

  };

}]);


/******************* Confirmation Modal service ******************************/
angular.module('myApp').factory( 'ConfirmationModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( message ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_confirmation_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          message: function () {
            return JSON.parse( JSON.stringify( message ) ); // deep clone
          }
        },

        controller: [ 'message', function( message ){

          const vm = this;
          vm.message = message;

        }],
        controllerAs: '$ctrl'

      });

      return modalInstance.result;
    }

  };

}]);


/******************* Waiting modal service ******************************/
angular.module('myApp').factory( 'WaitingModalSvc', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( { waitFor, delay } ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_waiting_modal.html',
        size: 'lg',
        backdrop: 'static',
        controller: [ '$scope','$timeout', function( $scope, $timeout ){

          if( waitFor && delay ) {

            waitFor.then( result => {

              $timeout( delay ).then( () => $scope.$close( result ) );

            } );

          }
          else if( waitFor ) {

            waitFor.then( result => $scope.$close( result ) );

          }
          else if( delay ) {

            $timeout( delay ).then( () => $scope.$close() );

          }

        }],
        controllerAs: '$ctrl'
      });

      return modalInstance.result;
    }

  };

}]);


/******************* Manifest File Options Modal service ******************************/
angular.module('myApp').factory( 'ManifestFileOptionsModal', [ '$uibModal', function( $uibModal ){

  return {

    launch: function( { filename, sheetNames }, ctrlFn ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_manifest_file_options_modal.html',
        size: 'lg',
        backdrop: 'static',

        resolve: {
          options: function () {
            return {
              filename,
              sheetNames
            };
          }
        },

        controller: [ 'options', function( options ){

          const vm = this;
          vm.manifestOptions = options;

        }],
        controllerAs: '$ctrl'

      });

      return modalInstance.result.then( ctrlFn || function(){}, _ => null );
    }

  };
}]);


/**************************** For viewing/editing inventory pallet details **********************/
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

      controller: [ '$scope', 'LoggedInUser', 'navigate', 'pallet', 'palletProperties', function( $scope, LoggedInUser, navigate, pallet, palletProperties ){

        const vm = this;
        vm.pallet = pallet;
        vm.inputs = Object.assign( { isBrokendown: false, hasProblem: false, category: null, condition: 'shelf-pull' }, pallet );
        vm.errors = {};
        vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) );
        vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) );

        vm.disableEditing = ! LoggedInUser.hasPermission( 'EDIT_INVENTORY_PALLET' );
        vm.allowShipmentNavigation = LoggedInUser.hasPermission( 'VIEW_INCOMING_SHIPMENT' );
        vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
        vm.showDeveloper = LoggedInUser.isDeveloper();
        vm.showPricingData = LoggedInUser.hasPermission('VIEW_PRICING_DATA');
        vm.allowEditPricingData = LoggedInUser.hasPermission('EDIT_PRICING_DATA') || !vm.pallet.retailValue;
        vm.showBrokendownDate = pallet.isBrokendown;
        vm.showCreatedAtDate = !!pallet.createdAt;
        vm.showShipment = !!pallet.shipment;

        vm.validate = () => {

          vm.errors.emptyHandle = !vm.inputs.handle;

          vm.errors.invalidCost = vm.showPurchasingData ? !( vm.inputs.cost > 0 ) : false;

          const shipment = pallet.shipment;

          if( shipment && shipment.palletsReceived && shipment.palletsConsolidated ) {

            vm.errors.duplicateHandle = !! shipment.palletsReceived.concat( shipment.palletsConsolidated ).find( _p => _p.handle === vm.inputs.handle && _p._id !== pallet._id );

          }

          return Object.values( vm.errors ).every( value => !value );
        };

        vm.finish = () => {
          return $scope.$close( vm.inputs );
        };

        vm.navigateToShipment = () => {
          if( vm.inputs.shipment._id ) {
            navigate.shipmentDetails( vm.inputs.shipment._id );
            $scope.$close( vm.inputs );
          }
        };

        vm.viewRemovedItems = () => viewRemovedItemsModal( pallet );

      }],
      controllerAs: '$ctrl'

    });

    return modalInstance.result;
  }

  function viewRemovedItemsModal( pallet ) {

    const _modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_inventory_pallet_removed_items_modal.html',
      size: 'lg',
      backdrop: 'static',


      resolve: {
        pallet: function () {
          return pallet;
        }
      },

      controller: [ 'LoggedInUser', 'pallet', 'StandardManifestColumnsConst', function( LoggedInUser, pallet, StandardManifestColumnsConst ){

        const __BARCODE__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_BARCODE_COLUMN__;
        const __DESCRIPTION__ = StandardManifestColumnsConst.__STANDARD_MANIFEST_DESCRIPTION_COLUMN__;

        function cmpRemovedItems( a, b ) {
          if( a[ __BARCODE__ ] < b[ __BARCODE__ ] ) {
            return -1;
          }
          else if ( a[ __BARCODE__ ] > b[ __BARCODE__ ] ) {
            return 1;
          }
          else if( a[ __DESCRIPTION__ ] < b[ __DESCRIPTION__ ] ) {
            return -1;
          }
          else {
            return 1;
          }
        }

        const vm = this;
        vm.showPurchasingData = () => LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

        vm.removedItems = JSON.parse( JSON.stringify( pallet.removedItems ) );
        vm.removedItems.forEach( _ => _.totalValue = util.displayAsMoney( _.numRemoved * _.unitRetailPrice ) );
        vm.removedItems.sort( cmpRemovedItems );

        vm.totalRemovedUnits = pallet.getTotalUnitsRemoved();
        vm.totalRemovedRetailValue = util.displayAsMoney( pallet.getTotalRetailValueRemoved() );
        vm.standardManifestColumns = StandardManifestColumnsConst;

      }],
      controllerAs: '$ctrl'

    });
  }



}] );

/******************* Shipping Items Modal service ******************************/
angular.module('myApp').factory( 'shippingItemsModal', [ '$uibModal', 'lotStore',
  function( $uibModal, lotStore ){

    return {
      launch: function() {

        const modalInstance = $uibModal.open({
          templateUrl: '/partials/modals/_shipping_items_modal.html',
          size: 'lg',
          backdrop: 'static',

          controller: 'ShippingItemsModalCtrl as ctrl',
          resolve: {
            shippingItems: function () {
              return lotStore.shippingItems;
            }
          },
        });

        return modalInstance.result.then(

          // close modal cb returns edited shippingItems to the caller
          shippingItems => shippingItems,

          // Cancel cb function
          () => {
            return null;
          }

        );
      }
    };
  }
]);

/********************* Pallets from manifest modal **************************/
angular.module('myApp').factory( 'PalletsFromManifestModalSvc', [ '$uibModal', function( $uibModal ) {

  return {
    launch: launch,
  };

  // launches the modal
  function launch( manifestFile, parseOptions, cb ) {

    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_pallets_expected_from_manifest_modal.html',
      size: 'lg',
      backdrop: 'static',
      resolve: {
        manifestFile: function () {
          return manifestFile;
        },
        parseOptions: function() {
          return parseOptions;
        }
      },
      controller: 'PalletsFromManifestModalCtrl',
      controllerAs: '$ctrl'
    });

    modalInstance.result.then( cb || function(){}, function(){} );
  }

}]);


/********************* Merge sheets options modal **************************/
angular.module('myApp').factory( 'MergeSheetsOptionsModalSvc', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( sheetnames ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_merge_sheets_options_modal.html',
        size: 'lg',
        backdrop: 'static',
        resolve: {
          sheetnames: function () {
            return JSON.parse( JSON.stringify( sheetnames ) );
          },
        },
        controller:  [ 'palletProperties', 'sheetnames', 'StandardManifestColumnsConst', function( palletProperties, sheetnames, StandardManifestColumnsConst ){

          const vm = this;
          vm.inputs = {
            mergedSheetName: 'Data',
            sheetColumnOptions: [ 'Sheet' ].concat( StandardManifestColumnsConst.displayColumns ),
            palletCategoryOptions: [''].concat( palletProperties.category ),
            sheetColumnName: 'Category',
            sheetnameTransforms: sheetnames.map( sn => ( { sheetname: sn, transformValue: '' } ) ),
          };

          vm.compileOptions = () => {

            return {
              mergedSheetName: vm.inputs.mergedSheetName,
              sheetColumnName: vm.inputs.sheetColumnName,
              sheetnameTransformMap: new Map( vm.inputs.sheetnameTransforms.map( obj => [ obj.sheetname, obj.transformValue ] ) ),
            };

          };

        }],
        controllerAs: '$ctrl'
      });

      return modalInstance.result;
    }

  };

}]);

