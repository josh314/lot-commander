import angular from 'angular';

/******************* Shipping Items Modal service ******************************/
angular.module('myApp').factory('shippingItemsModal', ['$uibModal', 'lotStore',
  function($uibModal, lotStore){

    return {
      launch: function() {
        
        const modalInstance = $uibModal.open({
          templateUrl: '/partials/modals/_shipping_items_modal.html',
          size: 'lg',
          controller: 'ShippingItemsModalController',
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
angular.module('myApp').controller('ShippingItemsModalController', [ '$scope', 'dbEnums', 'shippingItems',
  function($scope, dbEnums, shippingItems){
    // copy shippingItems so we can edit the copy without affecting the original
    const _shippingItems = shippingItems ? JSON.parse(JSON.stringify(shippingItems)) : [];

    $scope.weightUnitsEnum = dbEnums.weightUnits;
    $scope.lengthUnitsEnum = dbEnums.lengthUnits;

    $scope.shippingItems = _shippingItems;

    $scope.addItem = () => { 
      const newItem = {
        weightUnits: dbEnums.weightUnits[0],
        heightUnits: dbEnums.lengthUnits[0],
        lengthUnits: dbEnums.lengthUnits[0],
        widthUnits: dbEnums.lengthUnits[0],
      };
      _shippingItems.push(newItem);
    };

    $scope.removeItem = (itemIndex) => _shippingItems.splice(itemIndex, 1);

    $scope.presets = [
      {
        weightUnits: dbEnums.weightUnits[0],
        height: 22,
        heightUnits: 'inches',
        length: 22,
        lengthUnits: 'inches',
        width: 22,
        widthUnits: 'inches',
      },
      {
        weightUnits: dbEnums.weightUnits[0],
        height: 16,
        heightUnits: 'inches',
        length: 14,
        lengthUnits: 'inches',
        width: 12,
        widthUnits: 'inches',
      },
      {
        weightUnits: dbEnums.weightUnits[0],
        height: 12,
        heightUnits: 'inches',
        length: 10,
        lengthUnits: 'inches',
        width: 6,
        widthUnits: 'inches',
      }
    ];

    $scope.addPresetItem = (index) => {
      $scope.shippingItems.push($scope.presets[index]);
    };
  }
]);
