(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Lot List Page Controller *************************/
	app.controller('ListLotsCtrl', ['$scope', '$state', '$http', 'dbEnums', 'lotStore', 'messageModal', 'requestFileModal', 'saveLot', 'sessionTimeout', 
		function($scope, $state, $http, dbEnums, lotStore, messageModal, requestFileModal, saveLot, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.lots = [];

		$scope.statusOptions = dbEnums.lotStatus;
		$scope.lotStatus = 'All';

		$scope.marketplaces = [undefined].concat(dbEnums.marketplaces);
		console.log(dbEnums)

		function updateLotList() {
			//TODO: incorporate search/sort options
			const query = {
				status: $scope.lotStatus==='All' ? undefined : $scope.lotStatus,
				handle: $scope.lotHandle,
				endDate: $scope.endDate,
				startDate: $scope.startDate,
			};
			$http.post('/api/db/get', query).then(resp=>{
				const lots = resp.data;
				lots.forEach((lot,idx,array)=>{
					lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString();
					lot.readableCreatedAt = (new Date(lot.createdAt)).toLocaleString();
				});
				$scope.lots = lots;
			});
		}
		updateLotList();
		$scope.update = updateLotList;

		$scope.scanItems = function(lotId) {
			const targetLot = $scope.lots.find(lot => lot._id === lotId);
			if(targetLot) {
				lotStore.save(targetLot);
				if(lotStore.manifestId) {
					$http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
						lotStore.setInventory(resp.data.manifest.inventory);
					})
				}
				$state.go('main.lots.scan');
			}
		}

		$scope.viewLot = function(lotId) {
			const targetLot = $scope.lots.find(lot => lot._id === lotId);
			if(targetLot) {
				lotStore.save(targetLot);
				if(lotStore.manifestId) {
					$http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
						lotStore.setInventory(resp.data.manifest.inventory);
					})
				}
				$state.go('main.lots.view');
			}
		}

		$scope.requestFile = function(lot) {
			if(!lot.manifestId && !lot.thirdPartyManifests.length) {
				messageModal.launch({header: 'Error', body: 'No manifested items for this lot.', type: 'error'});
			} 
			else {
				requestFileModal.launch(lot);
			}
		};

		$scope.saveLot = saveLot;

	}]);
})();