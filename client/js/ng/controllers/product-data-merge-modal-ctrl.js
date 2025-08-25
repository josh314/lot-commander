import angular from 'angular';


/****************** Product data merge  modal controller ***********************/
angular.module('myApp').controller( 'ProductDataMergeModalCtrl', [

  '$uibModalInstance',
  'data',
  'ProductDataSvc',

  function(

    $uibModalInstance,
    data,
    ProductDataSvc,

  ) {

    const vm = this;
    init();

    function init() {

      const {
        incoming,
        current,
      } = data;

      const dataFields = [
        {
          label: 'ASIN',
          key: 'asin',
          type: 'text',
          replaceWith: incoming.asin,
          currentValue: current.asin,
          selected: false,
        },        {
          label: 'Title',
          key: 'title',
          type: 'textarea',
          replaceWith: incoming.title,
          currentValue: current.title,
          selected: false,
        },
        {
          label: 'Brand',
          key: 'brand',
          type: 'text',
          replaceWith: incoming.brand,
          currentValue: current.brand,
          selected: false,
        },
        {
          label: 'Price',
          key: 'price',
          type: 'number',
          replaceWith: incoming.price,
          currentValue: current.price,
          selected: false,
        },
      ];

      Object.assign(
        vm,
        {

          incoming,
          current,

          replaceWithIsBundle: ProductDataSvc.isBundleListingTitle( incoming.title ),

          images: {
            current: Array.isArray( current.images ) ? current.images : [],
            incoming: incoming.image ? [ incoming.image ] : [],
          },
          selectedImages: {
            current: [],
            incoming: [],
          },
          dataFields,

          confirm,
          splitIncomingBundle,
          toggleSelectAll,
          toggleSelected,
        }
      );

    }

    function getDataField( key ) {
      return vm.dataFields.find( _ => _.key === key );
    }

    function toggleSelectAll() {
      vm.dataFields.forEach( item => item.selected = vm.selectAll );
    }

    function toggleSelected() {
      vm.selectAll = vm.dataFields.every( item => item.selected );
    }

    function splitIncomingBundle() {
      const cleanTitle = ProductDataSvc.cleanBundleTitle( vm.incoming.title );
      if( cleanTitle ) {
        getDataField( 'title' ).replaceWith = cleanTitle;
      }
      const splitPrice = ProductDataSvc.splitBundlePrice( vm.incoming.title, vm.incoming.price );
      if( splitPrice ) {
        getDataField( 'price' ).replaceWith = splitPrice.toFixed(2);
      }
      vm.replaceWithIsBundle = false;
    }

    function confirm() {

      const result = {};

      vm.dataFields.forEach( field => {
        if( field.selected ) {
          result[ field.key ] = field.replaceWith;
        }
      });

      if( vm.selectedImages.incoming.length > 0 || vm.selectedImages.current.length !== vm.images.current.length ) {
        result.images = [
          ...vm.selectedImages.incoming,
          ...vm.selectedImages.current,
        ];
      }

      $uibModalInstance.close( result );

    }

  }
]);
