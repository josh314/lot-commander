(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Scanning Page Controller *************************/
	app.controller('ScanCtrl', ['$scope', '$state', '$http', 'focus', 'lotStore', 'saveManifest', 'sessionTimeout', function($scope, $state, $http, focus, lotStore, saveManifest, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		focus('barcodeInput');
		$scope.lot = lotStore;
		$scope.saveManifest = () => saveManifest().then( ()=>$state.go('main.lots.view', {lotId: lotStore._id}) );

		$scope.scanBarcode = function() {
			if ($scope.scanForm.barcode.$valid) {
				const item = lotStore.addInventory($scope.scannedBarcode);
				if(item) {
					if(item.quantity==1) {
						$http.get(`/api/product-data/${item.barcode}`).then(resp=>{
							if(resp && resp.data) {
								item.description = resp.data.title;
								item.price = resp.data.price;
							}
							saveManifest().then(()=> $state.reload());
						})
					}
					else {
						// focus('barcodeInput');
						saveManifest().then(()=> $state.reload());
					}
				}
			}
		};

		$scope.decrementInventory = function(barcode) {
			lotStore.decrementInventory(barcode);
			// focus('barcodeInput');
			saveManifest().then(()=> $state.reload());
		};

		$scope.deleteProduct = function(barcode) {
			lotStore.deleteProduct(barcode);
			saveManifest().then(()=> $state.reload());
		};

	}]);
})();