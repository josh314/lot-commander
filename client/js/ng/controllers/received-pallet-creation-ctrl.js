import angular from 'angular';

class ReceivedPalletValidator {
  constructor( inputs ) {
    if( inputs ) {
      this.pallets = inputs.pallets.map( p => ({ invalidHandle: !p.handle }) );
    }
    else {
      this.clean = true;
    }
  }

  arePalletsValid() {
    const isPalletValid = p => !p.invalidHandle;

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || this.arePalletsValid();
  }
}

/******************* Received Pallet Creation Page Controller *************************/
angular.module('myApp').controller('ReceivedPalletCreationCtrl', [ 'AddPalletGroupParamsModalSvc', 'messageModal', 'navigate', 'palletCategories', 'sessionTimeout', 'ReceivedPalletManagerSvc',
  function( AddPalletGroupParamsModalSvc, messageModal, navigate, palletCategories, sessionTimeout, ReceivedPalletManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    function init() {

      vm.validator = new ReceivedPalletValidator();
      vm.inputs = {
        categoryOptions: [ "" ].concat( palletCategories ),
        pallets: [  ]
      };

      vm.refreshValidator = refreshValidator;
      vm.createReceivedPallets = createReceivedPallets;
      vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
      vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
      vm.addPallet = () => addPalletWithData( { hasProblem: false } );
      vm.addPalletGroup = addPalletGroup;
      vm.removePallet = removePallet;

    }

    function refreshValidator() {
      vm.validator = new ReceivedPalletValidator( vm.inputs );
    }

    function createReceivedPallets() {

      refreshValidator();

      if( vm.inputs.pallets.length > 0 && vm.validator.isValid() ) {

        const request = vm.inputs.pallets;

        ReceivedPalletManagerSvc.create( request )
          .then( _ => navigate.receivedPalletList() )
          .catch( e => {
            messageModal.launch({header: 'Error', body: e.message, type: 'error'});
          });

      }

    }

    function addPalletWithData( data ) {
      vm.inputs.pallets.push( data );
    }

    function addPalletGroup() {
      AddPalletGroupParamsModalSvc.launch().then( params => {
        for( let i=0; i<params.numPallets; i++ ) {
          addPalletWithData( { handle: `${params.handlePrefix}_${i+1}`, category: params.category } );
        }
      } );
    }

    function removePallet( idx ) {
      vm.inputs.pallets.splice( idx, 1 );
      if( vm.validator.pallets ) {
        vm.validator.pallets.splice( idx, 1 );
      }
    }

    init();
  }
]);

angular.module('myApp').factory( 'AddPalletGroupParamsModalSvc', [ '$uibModal', 'palletCategories', function( $uibModal, palletCategories ) {

  return {
    launch: launch,
  };

  function launch( ) {
    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_add_pallet_group_params_modal.html',
      size: 'lg',
      backdrop: 'static',

      controller: [ '$scope', function( $scope ) {

        const vm = this;
        vm.inputs = {};
        vm.categoryOptions = palletCategories;

        vm.validate = () => vm.inputs.handlePrefix && vm.inputs.numPallets > 0;

        vm.finish = function() {

          if( vm.validate() ) {
            $scope.$close( vm.inputs );
          }

        };

      }],
      controllerAs: '$ctrl'

    });

    return modalInstance.result;
  }

}]);