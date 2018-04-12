(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* View Lot Controller *************************/
	app.controller('ViewLotCtrl', ['$http', '$scope', '$stateParams', '$uibModal', 'lotStore', 'sessionTimeout', function($http, $scope, $stateParams, $uibModal, lotStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();

		function getLot() {
			//TODO: incorporate search/sort options
			$http.get('/api/db/get/' + $stateParams.lotId).then(resp=>{
				const lot = resp.data;
				lotStore.save(lot);
				if(lot.manifestId) {
					$http.get('/api/db/manifest/'+lot.manifestId).then(resp=>{
						lotStore.setInventory(resp.data.manifest.inventory)
					});
				}
			});
		}
		getLot();

		$scope.editLot = function() {
	    const modalInstance = $uibModal.open({
	      templateUrl: '/partials/_edit_lot_modal.html',
	      size: 'md',
	      controller: 'EditLotModalController', 
	      resolve: {
	        lot: function () {
	          return lotStore;
	        }
	      },
	    });

      modalInstance.result.then(function (lot) {
      	console.log(lot)
				// const data = { description: 'test' };
				// $http.post('api/db/edit-lot/'+lotStore._id, data).then(resp=>{
				// 	console.log(resp);
				// 	$state.go('main.list');
				// });
	    }, function () {
	      console.log('Modal dismissed at: ' + new Date());
	    });
		}

		$scope.lot = lotStore;
	}]);

	/***************** Modal Controller ************************/
	app.controller('EditLotModalController', [ '$scope', 'lot', function($scope, lot){
		$scope.lot = JSON.parse(JSON.stringify(lot));
		$scope.lotStatusEnum = lotStatusEnum;
	}]);
})();