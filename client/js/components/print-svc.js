import angular from 'angular';

import printJS from 'print-js';

/******************* Print labels service ******************************/
angular.module('myApp').factory('PrintSvc', ['lotStore',
  function(lotStore){

    const verifyShippingData = () => {
      if(lotStore.numBoxes) {
        return true;
      }

      if(lotStore.shippingItems && lotStore.shippingItems.length && lotStore.shippingItems.every( _ => _.weight && _.height && _.length && _.width )) {
        return true;
      }

      return false;
    };

    const printLabels = () => {
      if(verifyShippingData()) {
        printJS(`/api/labels/${lotStore._id}`);
        return true;
      }
      else {
        return false;
      }
    };

    return {
      printLabels: printLabels
    };
  }
]);
