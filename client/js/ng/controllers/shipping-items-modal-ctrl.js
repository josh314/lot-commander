import angular from 'angular';

/***************** Modal Controller ************************/
angular.module('myApp').controller('ShippingItemsModalCtrl', [ '$uibModalInstance', 'shippingItems', 'ShippingItemsSvc',
  function( $uibModalInstance, shippingItems, ShippingItemsSvc ){
    // copy shippingItems so we can edit the copy without affecting the original
    const _shippingItems = shippingItems ? JSON.parse( JSON.stringify( shippingItems ) ) : [];
    const weightUnitsEnum = ShippingItemsSvc.weightUnitsEnum;
    const lengthUnitsEnum = ShippingItemsSvc.lengthUnitsEnum;

    const vm = this;

    vm.weightUnitsEnum = weightUnitsEnum;
    vm.lengthUnitsEnum = lengthUnitsEnum;

    vm.shippingItems = _shippingItems;
    vm.errorStyles = vm.shippingItems.map( _ => ({}) );

    vm.addItem = () => {
      const newItem = {
        weightUnits: weightUnitsEnum[0],
        heightUnits: lengthUnitsEnum[0],
        lengthUnits: lengthUnitsEnum[0],
        widthUnits: lengthUnitsEnum[0],
      };
      _shippingItems.push(newItem);
    };

    vm.removeItem = (itemIndex) => {
      _shippingItems.splice(itemIndex, 1);
      vm.errorStyles.splice(itemIndex, 1);
    };

    vm.presets = ShippingItemsSvc.presets;

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
