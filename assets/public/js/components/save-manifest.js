(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Service for saving manifsets ***********************/
	app.factory('saveManifest', ['$http', '$state', 'lotStore', function($http, $state, lotStore){
		return function() {

			// This filters out completely empty lines
			lotStore.inventory = lotStore.inventory.filter(item=>{
				if(item.barcode || item.description || item.quantity || item.price) {
					return true;
				}
			})

			console.log(lotStore.inventory)

      lotStore.updateTotalUnits();
			$http.post('/api/db/save-manifest/', {lot: lotStore}).then(resp=>{
				$state.go('main.home');
			});
		}
	}]);

})();