import angular from 'angular';

/******************* Shipping Items Modal service ******************************/
angular.module('myApp').factory('shippingItemsModal', ['$uibModal', 'lotStore', 'saveLot',
  function($uibModal, lotStore, saveLot){

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

          // Close cb function
          shippingItems=>{
            // Save the edited copy
            lotStore.shippingItems = shippingItems;
            return saveLot(lotStore).then( resp => !!resp /* casts to boolean */ );
          },

          // Cancel cb function
          () => {
            return false;
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
  }
]);
