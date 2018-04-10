(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Manifest List Controller *************************/
	app.controller('ListLotsCtrl', ['$scope', '$state', '$http', '$uibModal', 'lotStore', 'sessionTimeout', function($scope, $state, $http, $uibModal, lotStore, sessionTimeout) {
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


		$scope.launchRequestFileModal = function(lot) {
			if(!lot.manifestId) {
				console.log('No manifested items for this lot.');
				return;
			}

	    const modalInstance = $uibModal.open({
	      templateUrl: '/partials/_request_file_modal.html',
	      size: 'lg',
	      controller: 'RequestFileModalController',
	      resolve: {
	        lot: function () {
	          return lot;
	        }
	      },
	    });

      modalInstance.result.then(function(fileRequest) {
      	if(!fileRequest) {
      		return;
      	}
				const body = {
					manifestId: lot.manifestId,
				}
				if(fileRequest.format==='Bstock') {
					body.bstock = {
						Category: fileRequest.category,
						Condition: fileRequest.condition,
						Packaging: fileRequest.packaging,
					};
				}
				$http.post(`/api/files/generate`, body).then(resp=>{
					//TODO: some sort of acknoledgement of success/failure
					$state.reload();
				});
			}, function () {
	      console.log('Modal dismissed at: ' + new Date());
	    });
		};
	}]);

	/***************** Modal Controller ************************/
	app.controller('RequestFileModalController', [ '$scope', 'lot', 'bstockConstants', function($scope, lot, bstockConstants){
		$scope.lot = JSON.parse(JSON.stringify(lot));
		$scope.bstockConstants = bstockConstants;
	}]);
})();