(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Manifest List Controller *************************/
	app.controller('ListLotsCtrl', ['$scope', '$state', '$http', 'launchRequestFileModal', 'lotStore', 'sessionTimeout', function($scope, $state, $http, launchRequestFileModal, lotStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.lots = [];

		function updateLotList() {
			//TODO: incorporate search/sort options
			const query = {};
			$http.post('/api/db/get', query).then(resp=>{
				const lots = resp.data;
				lots.forEach((lot,idx,array)=>{
					lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString()
				});
				$scope.lots = lots;
			});
		}
		updateLotList();

		$scope.editLot = function(lotId) {
			const targetLot = $scope.lots.find(lot => lot._id === lotId);
			if(targetLot) {
				lotStore.save(targetLot);
				if(lotStore.manifestId) {
					$http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
						lotStore.setInventory(resp.data.manifest.inventory);
					})
				}
				$state.go('main.scan');
			}
		}


		$scope.launchRequestFileModal = launchRequestFileModal;
	}]);
})();