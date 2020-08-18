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

  this.getTarget = () => counter ? counter.units : '';

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

    const startCounter = ( units ) => {
      vm.counter.start( units );
      resetScanner();
    };

    vm.startCounter = () => {
      if( vm.counterUnitsInput ) {
        startCounter( vm.counterUnitsInput );
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

    vm.repeatCount = () => {
      const target = vm.counter.getTarget();
      vm.counter.destroy();
      startCounter( target );
    }

    const notifyIfDone = () => {
      if( vm.counter.isDone() ) { // If done scanning, launch modal
        counterToolModal.launch(
          {header: 'Complete', body: `All items scanned! Click the finish button now to proceed.`, type: 'success'},
          [
            {
              style: 'danger',
              text: 'Finish',
              result: 'finish',
              cb: () => vm.finishCounting()
            },
            {
              style: 'primary',
              text: 'Repeat',
              result: 'repeat',
              cb: () => {
                vm.repeatCount()
              }
            },
          ],
        )
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
        [
          {
            style: 'danger',
            text: 'Reset',
            result: 'reset',
            cb: () => {
              vm.counter.destroy();
              navigate.reload();
            },
          }
        ]
      );

    };

  }
]);


/*******************  Modal service ******************************/
angular.module('myApp').factory('counterToolModal', ['$uibModal', function($uibModal){
  return {
    /******************************************
     * @param {Object} message
     * @param {string} message.header
     * @param {string} message.body
     * @param {string} message.html
     * @param {Object[]} buttons
     * @param {string} buttons[].text
     * @param {string} buttons[].style
     * @param {string} buttons[].result
     * @param {function} buttons[].cb
     */
    launch: function(message, buttons) {

      const modalInstance = $uibModal.open({
        template: `
          <div class="modal-header">
            <h3 class="modal-title" ng-class="messageSeverity">${message.header}</h3>
          </div>
          <div class="modal-body">
            <div class="row">
              <div class="col-xs-12">
                ${message.body ? `<p>${message.body}</p>` : ''}
                ${message.html ? message.html : ''}
              </div>
            </div>
          </div>
          <div class="modal-footer">
            ${ buttons.reduce( (acc, btn) => `${acc}<button class="btn btn-${btn.style ? btn.style : 'success'}" type="button" ng-click="$close('${btn.result}')">${btn.text}</button>`, '' ) }
            <button class="btn btn-success" type="button" ng-click="$dismiss()">Back</button>
          </div>
          `,
        size: 'lg',
      });

      modalInstance.result.then(
        result => {
          const cb = buttons.find( btn => btn.result === result ).cb;
          if( cb ) {
            cb();
          }
        },
        function(){}
      );
    }
  };
}]);
