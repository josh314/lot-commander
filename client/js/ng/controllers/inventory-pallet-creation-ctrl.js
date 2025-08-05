import angular from 'angular';
import { palletProperties } from '../../constants';

class InventoryPalletValidator {
  constructor( inputs ) {
    if( inputs ) {

      this.pallets = inputs.pallets.map( p => ({ emptyHandle: !p.handle }) );

      for( let i=0; i<inputs.pallets.length; i++ ) {

        for( let j=0; j<inputs.pallets.length; j++ ) {

          if( i!==j && inputs.pallets[i].handle === inputs.pallets[j].handle ) {

            this.pallets[i].duplicateHandle = true;

          }

        }

        this.pallets[i].invalidCost = inputs.checkCosts ? !(inputs.pallets[i].cost > 0) : false;

      }

    }
    else {
      this.clean = true;
    }
  }

  arePalletsValid() {
    const isPalletValid = p => {

      const validHandle = !( p.emptyHandle || p.duplicateHandle );

      return !p.invalidCost && validHandle;
    };

    return this.pallets.every( isPalletValid );
  }

  isValid() {
    return this.clean || this.arePalletsValid();
  }
}

/******************* Inventory Pallet Creation Page Controller *************************/
angular.module('myApp').controller( 'InventoryPalletCreationCtrl', [

  'AddPalletGroupParamsModalSvc',
  'LoggedInUser',
  'ModalSvc',
  'navigate',
  'sessionTimeout',
  'InventoryPalletManagerSvc',

  function(

    AddPalletGroupParamsModalSvc,
    LoggedInUser,
    ModalSvc,
    navigate,
    sessionTimeout,
    InventoryPalletManagerSvc,

  ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.showPurchasingData = LoggedInUser.hasPermission('VIEW_PURCHASING_DATA');

    function init() {

      vm.validator = new InventoryPalletValidator();
      vm.inputs = {
        categoryOptions: [ { displayName: "none", value: null } ].concat( palletProperties.category.map( _ => ( { displayName: _, value: _ } ) ) ),
        conditionOptions: [ { displayName: "none", value: null } ].concat( palletProperties.condition.map( _ => ( { displayName: _, value: _ } ) ) ),
        pallets: [  ],
        checkCosts: vm.showPurchasingData
      };

      vm.refreshValidator = refreshValidator;
      vm.createInventoryPallets = createInventoryPallets;
      vm.setPalletCategories = ( ) => vm.inputs.pallets.forEach( p => p.category = vm.inputs.category );
      vm.setPalletConditions = ( ) => vm.inputs.pallets.forEach( p => p.condition = vm.inputs.condition );
      vm.clearPalletUnits = ( ) => vm.inputs.pallets.forEach( p => delete p.units );
      vm.addPallet = () => addPalletWithData( { hasProblem: false, category: null, condition: null } );
      vm.addPalletGroup = addPalletGroup;
      vm.removePallet = removePallet;

    }

    function refreshValidator() {
      vm.validator = new InventoryPalletValidator( vm.inputs );
    }

    function createInventoryPallets() {

      refreshValidator();

      if( vm.inputs.pallets.length > 0 && vm.validator.isValid() ) {

        const request = vm.inputs.pallets;

        InventoryPalletManagerSvc.create( request )
          .then( _ => navigate.inventoryPalletView() )
          .catch( e => {
            ModalSvc.message( { header: 'Error', body: e.message, type: 'error' } );
          });

      }

    }

    function addPalletWithData( data ) {
      vm.inputs.pallets.push( data );
    }

    function addPalletGroup() {
      AddPalletGroupParamsModalSvc.launch().then( params => {
        for( let i=0; i<params.numPallets; i++ ) {
          addPalletWithData( { handle: `${params.handlePrefix}_${i+1}`, category: params.category, condition: params.condition } );
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

angular.module('myApp').factory( 'AddPalletGroupParamsModalSvc', [ '$uibModal', function( $uibModal ) {

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
        vm.categoryOptions = palletProperties.category;
        vm.conditionOptions = palletProperties.condition;

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