(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Newe Manifest Controller *************************/
	app.controller('ScanCtrl', ['$scope', '$state', '$http', 'focus', 'manifestStore', 'sessionTimeout', function($scope, $state, $http, focus, manifestStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		focus('barcodeInput');
		$scope.manifest = manifestStore;

		$scope.scanBarcode = function() {
			if ($scope.scanForm.barcode.$valid) {
				manifestStore.addInventory($scope.scannedBarcode);
				// focus('barcodeInput');
				$state.reload();
			}
		};

		$scope.decrementInventory = function(barcode) {
			manifestStore.decrementInventory(barcode);
			// focus('barcodeInput');
			$state.reload();
		};

		$scope.submitManifest = function() {
			const url = $scope.manifest._id ? '/api/db/submit/' + $scope.manifest._id : '/api/db/submit';
			$http.post(url, { manifest: $scope.manifest }).then(resp=>{
				$state.go('main.home');
			});
		}
	}]);
})();