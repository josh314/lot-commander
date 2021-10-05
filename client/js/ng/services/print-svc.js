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

  const printIncomingShipmentLabels = ( shipmentId, palletList ) => {
    printJS(`/api/print/labels/incoming-shipments/${ shipmentId }/pallets-${ palletList }`);
  };

  const printIncomingShipmenPalletLabel = ( shipmentId, palletList, palletId ) => {
    printJS(`/api/print/labels/incoming-shipments/${ shipmentId }/pallets-${ palletList }/${palletId}`);
  };

  return {
    printIncomingShipmentLabels: printIncomingShipmentLabels,
    printIncomingShipmenPalletLabel: printIncomingShipmenPalletLabel,
    printLotLabels: printLotLabels,
    printPickReceipt: printPickReceipt
  };

}]);
