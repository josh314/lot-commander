import angular from 'angular';

class ReceivedPalletValidator {
  constructor( inputs ) {
    if( inputs ) {
      this.invalidHandle = !inputs.handle;
    }
    else {
      this.clean = true;
    }
  }

  isValid() {
    return this.clean || !this.invalidHandle;
  }
}

/******************* Received Pallet Creation Page Controller *************************/
angular.module('myApp').controller('ReceivedPalletCreationCtrl', [ 'messageModal', 'navigate', 'palletCategories', 'sessionTimeout', 'ReceivedPalletManagerSvc',
  function(  messageModal, navigate, palletCategories, sessionTimeout, ReceivedPalletManagerSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.validator = new ReceivedPalletValidator();
    vm.inputs = {
      categoryOptions: [ "" ].concat( palletCategories ),
    };

    vm.refreshValidator = refreshValidator;
    vm.createReceivedPallets = createReceivedPallets;

    function refreshValidator() {
      vm.validator = new ReceivedPalletValidator( vm.inputs );
    }

    function palletRequest() {

      const pallet = Object.assign( {}, vm.inputs );
      
      // TODO: date transformations? timezone stuff?

      delete pallet.categoryOptions;

      return pallet;

    }

    function createReceivedPallets() {

      refreshValidator();

      if( vm.validator.isValid() ) {
        ReceivedPalletManagerSvc.create( [ palletRequest() ] )
          .then( _ => navigate.receivedPalletList() )
          .catch( e => {
            messageModal.launch({header: 'Error', body: e.message, type: 'error'});
          });

      }

    }

  }
]);