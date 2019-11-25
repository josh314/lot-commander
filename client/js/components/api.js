import angular from 'angular';

/****************** API service *****************************
* Service for handling remote connections to the backend API
*
* Note: We can't use async/await in these functions since it screws with the angular 
*       $digest cycle. Stick with regular plomises 
* 
*
*****/
angular.module('myApp').factory('api', ['$http', function($http){

  /*************************************************
  *  Export object
  *
  ************/

  return {
    getOrders: getOrders,
    getOrderById: getOrderById,
  };

  /*************************************************
  * Orders
  *
  ************/

  function getOrders(page) {

    const query = {
      page: page,
    };

    return $http.post('/api/orders/list', query).then(resp=>{
      return resp.data;
    });

  }

  function getOrderById(orderId) {

    return $http.get(`/api/orders/details/${orderId}`).then(resp=>{
      return resp.data;
    });

  }

}]);