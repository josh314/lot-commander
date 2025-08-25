import angular from 'angular';

import { lotCategories } from '../../constants';
import * as api from '../../api';
import { Manifest } from '../../manifest';

/****************************************************************
 * Helper Functions & Utilities
 * ============================
 *
 ****************************************************************/

function productTitleForCategory( category ) {

  const cat = lotCategories.find( c => c.value === category );
  if( cat ) {
    return `${ cat.displayName } item`;
  }
  else {
    return 'Miscellaneous item';
  }

}

const priceRegex = /^\d+(\.\d{1,2})?$/;
function isPrice( str ) {
  return priceRegex.test( str );
}

function fillerPrice() {
  const max = 16;
  const min = 11;
  return Math.floor(Math.random() * (max - min) ) + min + 0.99;
}

function isAsin( str ) {
  return typeof str === 'string' && str.match(/^B[A-Z0-9]{9}$/);
}

const amazonUrlFromAsin = ( asin ) => `https://www.amazon.com/dp/${ asin }`;

const bundleListingTitlePatterns = [
  /\(?Pack of ([0-9]+)\)?/i,
  /\(?Case of ([0-9]+)\)?/i,
  /\(?([0-9]?)[- ]?P(ac)?k\)?/i
];

function isBundleListingTitle( title ) {

  for( let i=0; i < bundleListingTitlePatterns.length; i++ ) {

    const test = bundleListingTitlePatterns[i].test( title );

    if( test ) {
      return true;
    }

  }

  return false;
}

function parseBundleListingTitle( title ) {

  let quantity;

  let cleanTitle;
  if( title ) {

    for( let i=0; i < bundleListingTitlePatterns.length; i++ ) {
      const match = title.match( bundleListingTitlePatterns[i] );

      if( match && match[1] ) {
        quantity = match[1];
        cleanTitle = title.replace( match[0], '' ).trim();
        break;
      }
    }

  }

  return {
    title: cleanTitle || title,
    quantity: parseInt( quantity ) || 1
  };
}

function cleanBundleTitle( title ) {
  return parseBundleListingTitle( title ).title;
}

function splitBundlePrice( title, price ) {
  const listingUnitQuantity = parseBundleListingTitle( title ).quantity || 1;
  return price / listingUnitQuantity;
}

/************************************************
 * Product Data Service
 * ====================
 *
 ************************************************/


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
      getProductDataFromLoadedManifest,

      // Helper functions & utilities
      amazonUrlFromAsin,
      cleanBundleTitle,
      fillerPrice,
      isAsin,
      isBundleListingTitle,
      isPrice,
      parseBundleListingTitle,
      productTitleForCategory,
      splitBundlePrice,
    };
  }
]);