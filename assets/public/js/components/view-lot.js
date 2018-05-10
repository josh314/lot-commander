(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* View Lot Controller *************************/
	app.controller('ViewLotCtrl', ['$http', '$scope', '$state', '$stateParams', '$uibModal', 'fileUpload', 'listingsBoilerplate', 'lotStore', 'messageModal', 'sessionTimeout',
		function($http, $scope, $state, $stateParams, $uibModal, fileUpload, listingsBoilerplate, lotStore, messageModal, sessionTimeout) {		
			sessionTimeout.timeoutExpired();
			$scope.lot = lotStore;
			$scope.listingsBoilerplate = listingsBoilerplate;
			$scope.waitingForResponse = false;

			function getLot() {
				$http.get('/api/db/get/' + $stateParams.lotId).then(resp=>{
					const lot = resp.data;
					lotStore.save(lot);
					$scope.images = lot.images;
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
					if(!resp.error) {
						$state.reload();
					}
				})
			};

	    $scope.uploadImages = function(){
				if($scope.imagesToUpload.length>0) {
					for(let i=0; i<$scope.imagesToUpload.length; i++) {
				    const image = $scope.imagesToUpload[i];
				    const uploadUrl = "/api/image/upload";
				    const metadata = { lotId: lotStore._id, primary: false };
				    fileUpload.uploadFileToUrl(image, uploadUrl, metadata).then(resp=>{
							if(i+1==$scope.imagesToUpload.length) {
								$state.reload();
							}
				    });
				  }
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
				$state.go('main.lots.scan');
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

			$scope.linkManifestBlock = function() {
				$scope.waitingForResponse = true;
				$http.post('/api/db/link-3p-manifest-block', { lotId: lotStore._id, blockId: $scope.searchBlockId}).then(resp=>{
					if(resp.data.error) {
						messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'})
					}
					$scope.waitingForResponse = false;
					$state.reload();
				});
			};

			$scope.configureListingForSubmission = function() {
				$state.go('main.lots.submit-listing');
			};

	}]);

	/***************** Modal Controllers ************************/
	app.controller('EditLotModalController', [ '$scope', 'dbEnums', 'lot', function($scope, dbEnums, lot){
		$scope.lot = JSON.parse(JSON.stringify(lot));
		$scope.lotStatusEnum = dbEnums.lotStatus;
		$scope.lotTypeEnum = dbEnums.lotType;
		$scope.selectedListing = 'bstock';
	}]);
})();