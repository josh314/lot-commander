import angular from 'angular';

/******************* One Modal Service to Rule Them All ******************************/
angular.module('myApp').factory('ModalSvc', [

  'ConfirmationModal',
  'InventoryPalletDetailsModalSvc',
  'ManifestFileOptionsModal',
  'messageModal',
  'PalletsFromManifestModalSvc',
  'shippingItemsModal',
  'WaitingModalSvc',

  function(

    ConfirmationModal,
    InventoryPalletDetailsModalSvc,
    ManifestFileOptionsModal,
    messageModal,
    PalletsFromManifestModalSvc,
    shippingItemsModal,
    WaitingModalSvc,

  ){

    return {
      
      confirm: ConfirmationModal.launch.bind( ConfirmationModal ),
      inventoryPalletDetails: InventoryPalletDetailsModalSvc.launch.bind( InventoryPalletDetailsModalSvc ),
      manifestFileOptions: ManifestFileOptionsModal.launch.bind( ManifestFileOptionsModal ),
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


/******************* Message Modal service ******************************/
angular.module('myApp').factory( 'messageModal', [ '$uibModal', function( $uibModal ) {

  return {

    launch: function( message, ctrlFn, dismissFn ) {

      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_message_modal.html',
        size: 'lg',
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

      modalInstance.result.then(ctrlFn || function(){}, dismissFn || function(){});
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

      controller: [ '$scope', 'LoggedInUser', 'pallet', 'palletProperties', function( $scope, LoggedInUser, pallet, palletProperties ){

        const vm = this;
        vm.inputs = Object.assign( { isBrokendown: false, hasProblem: false, category: null, condition: 'shelf-pull' }, pallet );
        vm.errors = {};
        vm.categoryOptions = [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) );
        vm.conditionOptions = [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) );
        vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');
        vm.showBrokendownDate = pallet.isBrokendown;
        vm.showCreatedAtDate = !!pallet.createdAt;
        vm.showShipment = !!pallet.shipment;

        vm.validate = () => {

          vm.errors.emptyHandle = !vm.inputs.handle;

          vm.errors.invalidCost = vm.showPurchasingData ? !( vm.inputs.cost > 0 ) : false;

          const shipment = pallet.shipment;

          if( shipment ) {

            vm.errors.duplicateHandle = !! shipment.palletsReceived.concat( shipment.palletsConsolidated ).find( _p => _p.handle === vm.inputs.handle && _p._id !== pallet._id );

          }

          return Object.values( vm.errors ).every( value => !value );
        };

        vm.finish = () => {
          return $scope.$close( vm.inputs );
        };

      }],
      controllerAs: '$ctrl'

    });

    return modalInstance.result;
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