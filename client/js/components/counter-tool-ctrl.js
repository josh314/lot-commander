import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail-2.wav';

const successBeep = new Audio(successBeepWav);
const failBeep = new Audio(failBeepWav);

const invalidBarcode = barcode => !barcode.match(/^[0-9]{8,15}$/);

function Counter($localStorage) {

  let counter = $localStorage['tools__scan_counter'];

  this.start = ( units ) => {
    if( units ) {
      $localStorage['tools__scan_counter'] = {
        units: units,
        barcodes: [],
      };
      counter = $localStorage['tools__scan_counter'];
    }
  };

  this.isStarted = () => !!counter;

  this.destroy = () => delete $localStorage['tools__scan_counter'];

  this.getBarcodes = () => counter ? counter.barcodes : [];

  this.addBarcode = barcode => this.isDone() ? null : counter.barcodes = [barcode].concat(counter.barcodes);

  this.deleteBarcodeByIndex = index => counter.barcodes.splice( index, 1 );

  this.isDone = () => {
    return counter.barcodes.length >= counter.units;
  };

}


/******************* Counter Tool Controller *************************/
angular.module('myApp').controller('CounterToolCtrl', ['$localStorage', 'counterToolModal', 'focus', 'navigate', 'sessionTimeout',
  function($localStorage, counterToolModal, focus, navigate, sessionTimeout) {
    sessionTimeout.timeoutExpired();
    const vm = this;

    vm.counter = new Counter($localStorage);

    const resetScanner = () => {
      vm.scannedBarcode = '';
      focus('barcodeInput');
    };

    const resetCounterUnitsInput = () => {
      vm.counterUnitsInput = '';
      focus('counterUnitsInput');
    }

    if( vm.counter.isStarted() ) {
      resetScanner();
    }
    else {
      resetCounterUnitsInput();
    }


    vm.startCounter = () => {
      if( vm.counterUnitsInput ) {
        vm.counter.start( vm.counterUnitsInput );
        resetScanner();
      }
      else {
        failBeep.play();
        resetCounterUnitsInput();
      }
    }

    vm.finishCounting = () => {
      if( vm.counter.isDone() ) {
        vm.counter.destroy();
        navigate.reload();
      }
      else {
        counterToolModal.launch({header: 'Error', body: `Not finished scanning!`, type: 'error'});
      }
    };

    const notifyIfDone = () => {
      if( vm.counter.isDone() ) { // If done scanning, launch modal
        counterToolModal.launch(
          {header: 'Complete', body: `All items scanned! Click the finish button now to proceed.`, type: 'success'},
          () => vm.finishCounting(),
          'Finish'
        );
      }
    };

    vm.scanBarcode = () => {

      vm.barcodeInvalid = invalidBarcode( vm.scannedBarcode );
      if ( vm.scannedBarcode && !vm.barcodeInvalid ){
        vm.counter.addBarcode( vm.scannedBarcode );
        successBeep.play();
        notifyIfDone();
      }
      else {
        failBeep.play();
      }
      resetScanner();
    };

    vm.manualAddItem = () => {
      vm.counter.addBarcode('xxxxxxxxxxxx');
      notifyIfDone();
      resetScanner();
    };

    vm.deleteBarcode = index => {
      vm.counter.deleteBarcodeByIndex(index);
      resetScanner();
    };

    vm.reset = () => {
      counterToolModal.launch(
        {header: 'Reset?', body: `Reset this counter?`, type: 'success'},
        () => {
          vm.counter.destroy();
          navigate.reload();
        },
        'Reset'
      );

    };

  }
]);

/*******************  Modal service ******************************/
angular.module('myApp').factory('counterToolModal', ['$uibModal', function($uibModal){
  return {
    launch: function(message, commandBtnFn, commandBtnText) {

      const modalInstance = $uibModal.open({
        template: `
          <div class="modal-header">
            <h3 class="modal-title" ng-class="messageSeverity">{{message.header}}</h3>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-xs-12">
                <p ng-show="message.body">{{message.body}}</p>
                <div ng-show="message.html" ng-bind-html="message.html"></div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-danger" type="button" ng-click="$close()" ng-show="commandBtnText">{{commandBtnText}}</button>
            <button class="btn btn-success" type="button" ng-click="$dismiss()">Dismiss</button>
          </div>
          `,
        size: 'lg',
        controller: 'counterToolModalController',
        resolve: {
          message: function () {
            return message;
          },
          commandBtnText: function () {
            return commandBtnText;
          }
        },
      });

      modalInstance.result.then(commandBtnFn || function(){}, function(){});
    }
  };
}]);

/***************** Modal Controller ************************/
angular.module('myApp').controller('counterToolModalController', [ '$scope', 'message', 'commandBtnText', function($scope, message, commandBtnText){
  $scope.message = JSON.parse(JSON.stringify(message));
  $scope.commandBtnText = commandBtnText;
}]);
