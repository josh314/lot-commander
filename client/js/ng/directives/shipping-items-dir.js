/*********************** Shipping Items Directive ***********************/
angular.module('myApp').directive('shippingItemsDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_shipping_items.html',
    scope: {
      shippingItems: '=',
      showEditingControls: '=',
      editShippingItemsCb: '&',
      showPrintControls: '=',
      print: '&', // calls the expression in the directive attribute value (in the parent scope)
      skipValidation: '=',
      showDeveloper: '=',
    },
    controller: [ '$scope', 'ModalSvc', function ( $scope, ModalSvc ) {

      $scope.editShippingItems = function() {

        return ModalSvc.shippingItems( $scope.shippingItems, $scope.skipValidation ).then( function( shippingItems ) {

          if( shippingItems && $scope.editShippingItemsCb ) {
            return $scope.editShippingItemsCb( { shippingItems } );
          }

        });

      };

    }],
  };
});