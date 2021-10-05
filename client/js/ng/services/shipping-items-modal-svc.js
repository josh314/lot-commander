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
