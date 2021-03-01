import angular from 'angular';

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
angular.module('myApp').controller('CounterToolCtrl', ['$localStorage', 'AudioAlertSvc', 'counterToolModal', 'focus', 'navigate', 'sessionTimeout',
  function($localStorage, AudioAlertSvc, counterToolModal, focus, navigate, sessionTimeout) {
    sessionTimeout.timeoutExpired();
    const vm = this;

    vm.counter = new Counter($localStorage);
    vm.displayBarcodeFilter = '';
    vm.displayBarcodesList = [];

    const resetScanner = () => {
      vm.scannedBarcode = '';
      focus('barcodeInput');
    };

    const resetCounterUnitsInput = () => {
      vm.counterUnitsInput = '';
      focus('counterUnitsInput');
    };

    vm.setDisplayBarcodesList = () =>{
      const filterPattern = new RegExp(vm.displayBarcodeFilter);
      vm.displayBarcodesList = vm.counter.getBarcodes().map( (_barcode, _idx) => ({ barcode: _barcode, idx: _idx}) ).filter( _ => filterPattern.test(_.barcode) );
    };

    const refreshDisplay = () => {
      vm.setDisplayBarcodesList();
      resetScanner();
    };

    if( vm.counter.isStarted() ) {
      refreshDisplay();
    }
    else {
      resetCounterUnitsInput();
    }

    const startCounter = ( units ) => {
      vm.counter.start( units );
      resetScanner();
    };

    const clearDisplayBarcodeFilter = () => {
      vm.displayBarcodeFilter = '';
      refreshDisplay();
    };

    vm.startCounter = () => {
      if( vm.counterUnitsInput ) {
        startCounter( vm.counterUnitsInput );
      }
      else {
        AudioAlertSvc.fail();
        resetCounterUnitsInput();
      }
    };

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
      refreshDisplay();
    };

    const notifyIfDone = () => {
      if( vm.counter.isDone() ) { // If done scanning, launch modal
        counterToolModal.launch(
          {
            header: 'Complete',
            html: `<p>All items scanned! Click:</p>
                    <ul>
                      <li><b>Repeat</b> to perform another count of the same amount</li>
                      <li><b>Finish</b> to reset the counter</li>
                      <li><b>Back</b> to continue working on the current count</li>
                    </ul>`,
            type: 'success'
          },
          [
            {
              style: 'primary',
              text: 'Repeat',
              result: 'repeat',
              cb: () => vm.repeatCount()
            },
            {
              style: 'danger',
              text: 'Finish',
              result: 'finish',
              cb: () => vm.finishCounting()
            },
          ],
        );
      }
    };

    vm.scanBarcode = () => {

      vm.barcodeInvalid = invalidBarcode( vm.scannedBarcode );
      if ( vm.scannedBarcode && !vm.barcodeInvalid ){
        vm.counter.addBarcode( vm.scannedBarcode );
        AudioAlertSvc.success();
        notifyIfDone();
      }
      else {
        AudioAlertSvc.fail();
      }
      refreshDisplay();
    };

    vm.manualAddItem = () => {
      vm.counter.addBarcode('xxxxxxxxxxxx');
      refreshDisplay();
      notifyIfDone();
    };

    vm.deleteBarcode = index => {
      vm.counter.deleteBarcodeByIndex(index);
      clearDisplayBarcodeFilter();
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
