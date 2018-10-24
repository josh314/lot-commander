(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Scanning Page Controller *************************/
	app.controller('ScanCtrl', ['$scope', '$state', '$http', 'focus', 'lotStore', 'sessionTimeout', function($scope, $state, $http, focus, lotStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		focus('barcodeInput');
		$scope.lot = lotStore;

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
						})
					}
					// focus('barcodeInput');
					$state.reload();
				}
			}
		};

		$scope.decrementInventory = function(barcode) {
			lotStore.decrementInventory(barcode);
			// focus('barcodeInput');
			$state.reload();
		};

		// $scope.saveManifest = function() {
		// 	const url = $scope.lot._id ? '/api/db/save-manifest/' + $scope.manifest._id : '/api/db/save-manifest/';
		// 	$http.post(url, {lot: lot}).then(resp=>{
		// 		//TODO: display errors
		// 		$state.go('main.home');
		// 	});
		// }
		$scope.saveManifest = function() {
			$http.post('/api/db/save-manifest/', {lot: lotStore}).then(resp=>{
				$state.go('main.home');
			});
		}
	}]);
})();