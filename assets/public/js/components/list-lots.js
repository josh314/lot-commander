(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Manifest List Controller *************************/
	app.controller('ListLotsCtrl', ['$scope', '$state', '$http', '$uibModal', 'manifestStore', 'sessionTimeout', function($scope, $state, $http, $uibModal, manifestStore, sessionTimeout) {
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

		// $scope.editManifest = function(manifestId) {
		// 	const targetManifest = $scope.manifests.find(man => man._id === manifestId);
		// 	if(targetManifest) {
		// 		manifestStore.newManifest(targetManifest.handle, targetManifest.description, targetManifest.inventory, targetManifest._id )
		// 		$state.go('main.scan');
		// 	}
		// }


		// $scope.launchRequestFileModal = function(manifest) {
	 //    const modalInstance = $uibModal.open({
	 //      templateUrl: '/partials/_request_file_modal.html',
	 //      size: 'lg',
	 //      controller: 'RequestFileModalController',
	 //      resolve: {
	 //        manifest: function () {
	 //          return manifest;
	 //        }
	 //      },
	 //    });

  //     modalInstance.result.then(function(fileRequest) {
  //     	if(!fileRequest) {
  //     		return;
  //     	}
		// 		const body = {
		// 			manifestId: manifest._id,
		// 		}
		// 		if(fileRequest.format==='Bstock') {
		// 			body.bstock = {
		// 				Category: fileRequest.category,
		// 				Condition: fileRequest.condition,
		// 				Packaging: fileRequest.packaging,
		// 			};
		// 		}
		// 		$http.post(`/api/files/generate`, body).then(resp=>{
		// 			//TODO: some sort of acknoledgement of success/failure
		// 			$state.reload();
		// 		});
		// 	}, function () {
	 //      console.log('Modal dismissed at: ' + new Date());
	 //    });
		// };
	}]);

	// /***************** Modal Controller ************************/
	// app.controller('RequestFileModalController', [ '$scope', 'manifest', 'bstockConstants', function($scope, manifest, bstockConstants){
	// 	$scope.manifest = JSON.parse(JSON.stringify(manifest));
	// 	$scope.bstockConstants = bstockConstants;
	// }]);
})();