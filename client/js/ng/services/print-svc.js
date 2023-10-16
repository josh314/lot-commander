import angular from 'angular';

import * as api from '../../api';

import printJS from 'print-js';

/******************* Print labels service ******************************/
angular.module('myApp').factory('PrintSvc', [ function( ){

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

  const printIncomingShipmentPalletLabel = ( shipmentId, palletList, palletId ) => {
    printJS(`/api/print/labels/incoming-shipments/${ shipmentId }/pallets-${ palletList }/${palletId}`);
  };

  async function printPackageLabels( packageIds ) {

    const resp = await api.getLabelsforPackageList( packageIds );
    const url = URL.createObjectURL( resp );
    printJS( { printable: url, type: 'pdf' } );

  }

  const printLotShippingItemsLabels = ( lotId ) => {
    printJS(`/api/print/labels/lots/${ lotId }/shipping-items`);
  };

  const printPalletShippingItemsLabels = ( palletId ) => {
    printJS(`/api/print/labels/pallets/${ palletId }/shipping-items`);
  };

  const printPalletSplitGroupLabels = ( palletId, splitGroupId ) => {
    printJS(`/api/print/labels/pallets/${ palletId }/split-groups/${splitGroupId}`);
  };

  return {
    printIncomingShipmentLabels,
    printIncomingShipmentPalletLabel,
    printLotLabels,
    printLotShippingItemsLabels,
    printPackageLabels,
    printPalletShippingItemsLabels,
    printPalletSplitGroupLabels,
    printPickReceipt,
  };

}]);
