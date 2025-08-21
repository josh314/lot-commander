import angular from 'angular';


/****************** Product data merge  modal controller ***********************/
angular.module('myApp').controller( 'ProductDataMergeModalCtrl', [

  '$uibModalInstance',
  'data',

  function(

    $uibModalInstance,
    data,

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
          incoming: incoming.asin,
          current: current.asin,
          selected: false,
        },        {
          label: 'Title',
          key: 'title',
          type: 'textarea',
          incoming: incoming.title,
          current: current.title,
          selected: false,
        },
        {
          label: 'Brand',
          key: 'brand',
          type: 'text',
          incoming: incoming.brand,
          current: current.brand,
          selected: false,
        },
        {
          label: 'Price',
          key: 'price',
          type: 'number',
          incoming: incoming.price,
          current: current.price,
          selected: false,
        },
      ];

      Object.assign(
        vm,
        {

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
          toggleSelectAll,
          toggleSelected,
        }
      );

    }

    function toggleSelectAll() {
      vm.dataFields.forEach( item => item.selected = vm.selectAll );
    }

    function toggleSelected() {
      vm.selectAll = vm.dataFields.every( item => item.selected );
    }


    function confirm() {

      const result = {};

      vm.dataFields.forEach( field => {
        if( field.selected ) {
          result[ field.key ] = field.incoming;
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
