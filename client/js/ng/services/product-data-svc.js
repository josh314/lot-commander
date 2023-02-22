import angular from 'angular';

import * as api from '../../api';

/******************* Product Data Service ***/
angular.module('myApp').factory( 'ProductDataSvc', [ '$q',
  function( $q ) {

    const getProductDataByBarcode = barcode => $q.when( api.getProductDataByBarcode( barcode ) ).then( resp => resp.product );

    const queueProductDataFetching = barcodes => $q.when( api.queueProductDataFetching( barcodes ) );

    const bulkGetProductData = barcodes => $q.when( api.bulkGetProductData( barcodes ) );

    return {
      getProductDataByBarcode,
      queueProductDataFetching,
      bulkGetProductData
    };
  }
]);