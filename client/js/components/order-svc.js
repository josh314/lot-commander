import 'angular';


angular.module('myApp').factory('OrderSvc', [ '$stateParams', 'api', 
  function( $stateParams , api ) { 

    return {
      getOrder: getOrder
    };

    function getOrder(orderId) {

      if(!orderId) {
        orderId = $stateParams.orderId;
      }

      return api.getOrderById(orderId);

    }

  }
]);
