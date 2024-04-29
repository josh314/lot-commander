import angular from 'angular';

import * as api from '../../api';
import { Manifest } from '../../manifest';

/******************* Product Data Service ***/
angular.module('myApp').factory( 'ProductDataSvc', [ '$q',
  function( $q ) {

    const getProductDataByBarcode = barcode => $q.when( api.getProductDataByBarcode( barcode ) ).then( resp => resp.product );

    const queueProductDataFetching = barcodes => $q.when( api.queueProductDataFetching( barcodes ) );

    const bulkGetProductData = barcodes => $q.when( api.bulkGetProductData( barcodes ) );

    // expects an instance of the Manifest class
    async function getProductDataFromLoadedManifest( manifest ) {

      if( !manifest || !( manifest instanceof Manifest ) ) {
        return [];
      }

      const barcodes = manifest.getUniqueBarcodesAllSheets();

      const { products } = await bulkGetProductData( barcodes );

      return products.filter( _ => _.item && _.item.images ).map( _ => {
        return {
          upc: _.upc,
          title: _.item.title,
          images: _.item.images,
          brand: _.item.brand
        };
      } );

    }

    return {
      getProductDataByBarcode,
      queueProductDataFetching,
      bulkGetProductData,
      getProductDataFromLoadedManifest
    };
  }
]);