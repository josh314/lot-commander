import angular from 'angular';

import * as api from '../../api';
import { Manifest } from '../../manifest';

/******************* Product Data Service ***/
angular.module('myApp').factory( 'ProductDataSvc', [ '$q',
  function( $q ) {

    const getProductDataByBarcode = ( barcode, { source, type } = {} ) => $q.when( api.getProductDataByBarcode( barcode, { source, type } ) ).then( resp => resp.product );

    const searchForProductData = query => $q.when( api.searchForProductData( query ) ).then( resp => resp.products );

    const queueProductDataFetching = barcodes => $q.when( api.queueProductDataFetching( barcodes ) );

    const bulkGetProductData = barcodes => $q.when( api.bulkGetProductData( barcodes ) );

    const saveInternalProductData = productData => $q.when( api.saveInternalProductData( productData ) );

    const getFallbackProductData = barcode => $q.when( api.getFallbackProductData( barcode ) ).then( resp => resp.product );

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
      getFallbackProductData,
      getProductDataByBarcode,
      searchForProductData,
      queueProductDataFetching,
      bulkGetProductData,
      saveInternalProductData,
      getProductDataFromLoadedManifest
    };
  }
]);