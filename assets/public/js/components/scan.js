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
				lotStore.addInventory($scope.scannedBarcode);
				// focus('barcodeInput');
				$state.reload();
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