import * as api from './api';

import printJS from 'print-js';

export const printPickReceipt = (orderId) => {
  printJS(`/api/print/pick-receipt/${orderId}`);
};

export const printIncomingShipmentLabels = ( shipmentId, palletList ) => {
  printJS(`/api/print/labels/incoming-shipments/${ shipmentId }/pallets-${ palletList }`);
};

export async function printPackageLabels( packageIds ) {

  const resp = await api.getLabelsforPackageList( packageIds );
  const url = URL.createObjectURL( resp );
  printJS( { printable: url, type: 'pdf' } );

}

export const printLotShippingItemsLabels = ( lotId ) => {
  printJS(`/api/print/labels/lots/${ lotId }/shipping-items`);
};

export const printPalletShippingItemsLabels = ( palletId ) => {
  printJS(`/api/print/labels/pallets/${ palletId }/shipping-items`);
};

export const printPalletSplitGroupLabels = ( palletId, splitGroupId ) => {
  printJS(`/api/print/labels/pallets/${ palletId }/split-groups/${splitGroupId}`);
};

export const printOrderLabels = ( orderId ) => {
  printJS(`/api/print/labels/orders/${ orderId }`);
};
