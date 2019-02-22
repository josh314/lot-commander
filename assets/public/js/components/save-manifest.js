(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Service for saving manifsets ***********************/
	app.factory('saveManifest', ['$http', '$state', 'lotStore', 'messageModal',function($http, $state, lotStore, messageModal){
		return function() {

			// This filters out completely empty lines
			lotStore.inventory = lotStore.inventory.filter(item=>{
				if(item.barcode || item.description || item.quantity || item.price) {
					return true;
				}
			})

      lotStore.updateTotalUnits();
			return $http.post('/api/db/save-manifest/', {lot: lotStore}).catch(e=>{
				const m = `<p>An error has occured while saving the manifest.</p>`;
				messageModal.launch({
			  		header: 'Save Error',
			  		html: m,
			  		type: 'error'
			  	});
			});
		};
	}]);

})();