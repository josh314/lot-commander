import angular from 'angular';

import printJS from 'print-js';

/******************* Print labels service ******************************/
angular.module('myApp').factory('PrintSvc', [ function(){

  const verifyShippingData = lot => {
    if(lot.numBoxes) {
      return true;
    }

    if(lot.shippingItems && lot.shippingItems.length && lot.shippingItems.every( _ => _.weight && _.height && _.length && _.width )) {
      return true;
    }

    return false;
  };

  const printLotLabels = lot => {
    if( verifyShippingData( lot ) ) {
      printJS(`/api/print/labels/lots/${lot._id}`);
      return true;
    }
    else {
      return false;
    }
  };

  const printPickReceipt = (orderId) => {
    printJS(`/api/print/pick-receipt/${orderId}`);
  };

  return {
    printLotLabels: printLotLabels,
    printPickReceipt: printPickReceipt,
  };

}]);
