import angular from 'angular';
import * as util from '../../utilities';

/****************** Product data search  modal controller ***********************/
angular.module('myApp').controller( 'ProductDataSearchModalCtrl', [

  '$uibModalInstance',
  'ModalSvc',
  'ProductDataSvc',
  'data',

  function(

    $uibModalInstance,
    ModalSvc,
    ProductDataSvc,
    data

  ) {

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {
          displayItems: [],
          query: data.query,

          amazonUrlFromAsin: ProductDataSvc.amazonUrlFromAsin,
          displayAsMoney: util.displayAsMoney,
          search,
          selectProduct,
          viewSearchItemDetails,
        }
      );

      if( vm.query ) {
        search();
      }
    }

    async function search() {

      const products = await ModalSvc.wait( {
        waitFor: ProductDataSvc.searchForProductData( vm.query )
      } );

      vm.displayItems = [];
      for( const _product of products ) {

        const found = vm.displayItems.find( item => item.product.asin === _product.asin );
        if( found ) {
          continue;
        }

        vm.displayItems.push( { product: _product, isBundle: ProductDataSvc.isBundleListingTitle( _product.title ) } );

      }

    }

    function selectProduct( item ) {

      $uibModalInstance.close( item.product );

    }

    function closeSearchItemDetails() {

      vm.displayItems.forEach( item => item.detailedView = false );

    }

    function viewSearchItemDetails( item ) {
      closeSearchItemDetails();
      item.detailedView = true;
    }

  }
]);

