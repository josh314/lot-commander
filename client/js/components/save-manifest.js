import app from '../ng-app';

/******************* Service for saving manifsets ***********************/
app.factory('saveManifest', ['$http', '$state', 'lotStore', function($http, $state, lotStore){
  return function() {

    // This filters out completely empty lines
    lotStore.inventory = lotStore.inventory.filter(item=>{
      if(item.barcode || item.description || item.quantity || item.price) {
        return true;
      }
      return false;
    });

    lotStore.updateTotalUnits();
    return $http.post('/api/db/save-manifest/', {lot: lotStore});
  };
}]);
