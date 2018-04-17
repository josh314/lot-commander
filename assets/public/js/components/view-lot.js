(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* View Lot Controller *************************/
	app.controller('ViewLotCtrl', ['$http', '$scope', '$state', '$stateParams', '$uibModal', 'fileUpload', 'lotStore', 'messageModal', 'sessionTimeout',
		function($http, $scope, $state, $stateParams, $uibModal, fileUpload, lotStore, messageModal, sessionTimeout) {		
			sessionTimeout.timeoutExpired();
			$scope.lot = lotStore;
			$scope.selectedListing = 'bstock';

			function getLot() {
				$http.get('/api/db/get/' + $stateParams.lotId).then(resp=>{
					const lot = resp.data;
					lotStore.save(lot);
					$scope.images = lot.images;
					$scope.listings = lot.listings;
					if(lot.manifestId) {
						$http.get('/api/db/manifest/'+lot.manifestId).then(resp=>{
							lotStore.setInventory(resp.data.manifest.inventory);
						});
					}
				});
			}
			getLot();

			$scope.getImageLink = function(image) {
				return image.filename;
			}

			$scope.updatePrimaryImage = function(image) {
				$http.post('/api/image/primary', {lotId: $scope.lot._id, primaryImage: image}).then(resp=>{
					console.log(resp)
					if(!resp.error) {
						$state.reload();
					}
				})
			};

	    $scope.uploadImage = function(){
	    	if($scope.imageToUpload) {
			    const image = $scope.imageToUpload;
			    const uploadUrl = "/api/image/upload";
			    const metadata = { lotId: lotStore._id, primary: false };
			    fileUpload.uploadFileToUrl(image, uploadUrl, metadata).then(resp=>{
			    	$state.reload();
			    });
			  }
	    };

			$scope.editLot = function() {
		    const modalInstance = $uibModal.open({
		      templateUrl: '/partials/_edit_lot_modal.html',
		      size: 'lg',
		      controller: 'EditLotModalController', 
		      resolve: {
		        lot: function () {
		          return lotStore;
		        }
		      },
		    });

	      modalInstance.result.then(function (lot) {
					$http.post('/api/db/edit-lot/'+lotStore._id, lot).then(resp=>{
						// console.log(resp);
						lotStore.save(lot);
						$state.reload();
					});
		    }, function () {
		      console.log('Modal dismissed at: ' + new Date());
		    });
			}

			$scope.scanItems = function() {
				if(lotStore.manifestId) {
					$http.get('/api/db/manifest/'+lotStore.manifestId).then(resp=>{
						lotStore.setInventory(resp.data.manifest.inventory);
					})
				}
				$state.go('main.scan');
			}

			$scope.removeImage = function(image) {
				const data = {
					lotId: $scope.lot._id,
					image: image
				};
				$http.post('/api/image/remove', data).then(resp=>{
					if(!resp.data.error) {
						$state.reload();
					}
					else {
						messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'})
					}
				})
			}
	}]);

	/***************** Modal Controllers ************************/
	app.controller('EditLotModalController', [ '$scope', 'dbEnums', 'lot', function($scope, dbEnums, lot){
		$scope.lot = JSON.parse(JSON.stringify(lot));
		$scope.listings = $scope.lot.listings;
		$scope.lotStatusEnum = dbEnums.lotStatus;
		$scope.selectedListing = 'bstock';
	}]);
})();