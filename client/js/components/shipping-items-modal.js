import angular from 'angular';

/******************* Shipping Items Modal service ******************************/
angular.module('myApp').factory('shippingItemsModal', [ '$uibModal', 'lotStore',
  function( $uibModal, lotStore ){

    return {
      launch: function() {
        
        const modalInstance = $uibModal.open({
          templateUrl: '/partials/modals/_shipping_items_modal.html',
          size: 'lg',
          controller: 'ShippingItemsModalCtrl as ctrl',
          resolve: {
            shippingItems: function () {
              return lotStore.shippingItems;
            }
          },
        });

        return modalInstance.result.then(

          // close modal cb returns edited shippingItems to the caller
          shippingItems => shippingItems,

          // Cancel cb function
          () => {
            return null;
          }

        );
      }
    };
  }
]);

/***************** Modal Controller ************************/
angular.module('myApp').controller('ShippingItemsModalCtrl', [ '$uibModalInstance', 'dbEnums', 'shippingItems',
  function( $uibModalInstance, dbEnums, shippingItems ){
    // copy shippingItems so we can edit the copy without affecting the original
    const _shippingItems = shippingItems ? JSON.parse( JSON.stringify( shippingItems ) ) : [];

    const vm = this;

    vm.weightUnitsEnum = dbEnums.weightUnits;
    vm.lengthUnitsEnum = dbEnums.lengthUnits;

    vm.shippingItems = _shippingItems;
    vm.errorStyles = vm.shippingItems.map( _ => ({}) );

    vm.addItem = () => {
      const newItem = {
        weightUnits: dbEnums.weightUnits[0],
        heightUnits: dbEnums.lengthUnits[0],
        lengthUnits: dbEnums.lengthUnits[0],
        widthUnits: dbEnums.lengthUnits[0],
      };
      _shippingItems.push(newItem);
    };

    vm.removeItem = (itemIndex) => {
      _shippingItems.splice(itemIndex, 1);
      vm.errorStyles.splice(itemIndex, 1);
    };

    vm.presets = [
      {
        name: '24x18x12',
        weightUnits: dbEnums.weightUnits[0],
        height: 24,
        heightUnits: 'inches',
        length: 18,
        lengthUnits: 'inches',
        width: 12,
        widthUnits: 'inches',
      },
      {
        name: '22x22x22',
        weightUnits: dbEnums.weightUnits[0],
        height: 22,
        heightUnits: 'inches',
        length: 22,
        lengthUnits: 'inches',
        width: 22,
        widthUnits: 'inches',
      },
      {
        name: '16x14x12',
        weightUnits: dbEnums.weightUnits[0],
        height: 16,
        heightUnits: 'inches',
        length: 14,
        lengthUnits: 'inches',
        width: 12,
        widthUnits: 'inches',
      },
      {
        name: '12x10x6',
        weightUnits: dbEnums.weightUnits[0],
        height: 12,
        heightUnits: 'inches',
        length: 10,
        lengthUnits: 'inches',
        width: 6,
        widthUnits: 'inches',
      },
      {
        name: 'pallet',
        weight: 2000,
        weightUnits: dbEnums.weightUnits[0],
        height: 60,
        heightUnits: 'inches',
        length: 48,
        lengthUnits: 'inches',
        width: 48,
        widthUnits: 'inches',
      }
    ];

    vm.addPresetItem = (index) => {
      const newItem = JSON.parse( JSON.stringify(vm.presets[index]) );
      vm.shippingItems.push(newItem);
    };

    function validateDimensions() {
      let valid = true;

      vm.errorStyles = vm.shippingItems.map( item => {

        const itemErrorStyles = {};

        [ 'weight', 'height', 'length', 'width'].forEach( dim => {
          if( typeof item[dim] !== 'number' || item[dim] <= 0) {
            itemErrorStyles[dim] = {
              'border':'3px solid red'
            };
            valid = false;
          }
        });

        return itemErrorStyles;

      });


      return valid;
    }

    vm.validateAndClose = () => {
      if( validateDimensions() ) {

        $uibModalInstance.close(vm.shippingItems);

      }
    };

  }
]);
