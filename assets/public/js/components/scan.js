(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Scanning Page Controller *************************/
	app.controller('ScanCtrl', ['$scope', '$http', '$interval', '$state', 'focus', 'lotStore', 'messageModal', 'saveManifest', 'sessionTimeout',
		function($scope, $http, $interval, $state, focus, lotStore, messageModal, saveManifest, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		focus('barcodeInput');
		$scope.lot = lotStore;

		let autoSaveTimer;
		const autoSaveInterval = 30*1000;
		const autosaveFn = ()=>{
			console.log(`Auto-saving lot: ${lotStore.handle}`);
			return saveManifest().catch(e=>{
				$interval.cancel(autoSaveTimer);
				const m = `
					<p>An error has occured while scanning.</p>
					<details>
						<summary>Details</summary>
						<p>${e.message}</p>
					</details>
				`;
				console.log(m)
				messageModal.launch(
					{
			  		header: 'Error',
			  		html: m,
			  		type: 'error'
			  	},
			  	null,
			  	()=>{ autoSaveTimer = $interval(autosaveFn, autoSaveInterval); }
		  	);
			});
		};
		autoSaveTimer = $interval(autosaveFn, autoSaveInterval);
			
		$scope.saveManifest = function() {
			console.log(`Auto-saving lot: ${lotStore.handle}`);
			$interval.cancel(autoSaveTimer);
			saveManifest().then(()=>{
				$state.go('main.lots.view', {lotId: lotStore._id});
			});
		}

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
						});
					}
					$state.reload();
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

		$scope.$on('$stateChangeStart', function( event ) {
			console.log(`Auto-saving lot: ${lotStore.handle}`);
			$interval.cancel(autoSaveTimer);
			saveManifest();
		});


	}]);
})();