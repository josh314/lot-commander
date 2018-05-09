(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Scanning Page Controller *************************/
	app.controller('SubmitListingCtrl', ['$scope', '$state', '$http', 'bstockFormConstants', 'lotStore', 'messageModal', 'sessionTimeout', 
		function($scope, $state, $http, bstockFormConstants, lotStore, messageModal, sessionTimeout) {
			sessionTimeout.timeoutExpired();

			if(!lotStore._id) {
				$state.go('main.lots.list');
			}

			$scope.lot = lotStore;
			$scope.waitingForResponse = false;

			$scope.bstockFormConstants = bstockFormConstants;

			// Form dropdown values
			$scope.marketplaces = ['bstock'];
			$scope.bstockCategories = Object.keys(bstockFormConstants.category);
			$scope.bstockConditions = Object.keys(bstockFormConstants.condition);
			$scope.bstockPackagings = Object.keys(bstockFormConstants.packaging);
			$scope.bstockShippingChargeTypes = Object.keys(bstockFormConstants.shippingChargeType);
			$scope.bstockShippingAllowedDestinations = Object.keys(bstockFormConstants.shippingAllowedDestinations);

			//Form default values
			$scope.listing = {
				auctionStartPrice: '300',
				shipping: {
					allowedDestinations: bstockFormConstants.shippingAllowedDestinations['Continental US only (Alaska and Hawaii excluded)'],
					chargeType: bstockFormConstants.shippingChargeType['Fixed Cost'],
				},
			};

			$scope.submitListing = function() {

				$scope.noMarketplace = $scope.listing.marketplace ? false : true;
				if($scope.noMarketplace) {
					return;
				}

				$scope.invalidAuctionPrice = ($scope.listing.auctionStartPrice && $scope.listing.auctionStartPrice.match(/[0-9]+/)) ? false : true;
				$scope.noChargeType = $scope.listing.shipping.chargeType ? false : true;

				$scope.noBstockCondition = $scope.listing.condition ? false : true;
				$scope.noBstockCategory = $scope.listing.category ? false : true;
				$scope.noBstockPackaging = $scope.listing.packaging ? false : true;

				if($scope.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
					$scope.invalidShippingCharge = ($scope.listing.shipping.charge && $scope.listing.shipping.charge.match(/[0-9]+/)) ? false : true;
					$scope.noCarrier = $scope.listing.shipping.carrier ? false : true;
				}
				else {
					$scope.invalidShippingCharge = $scope.noCarrier = false;
				}

				if($scope.invalidAuctionPrice || $scope.noChargeType || $scope.invalidShippingCharge || $scope.noCarrier || $scope.noBstockPackaging || $scope.noBstockCategory || $scope.noBstockCondition ) {
					return;
				}


				$scope.waitingForResponse = true;

				//TODO: wait while submitting 
				$http.post('/api/listings/submit', { lotId: lotStore._id, listing: $scope.listing}).then(resp=>{
					//TODO: verify submission with modal
					if(resp.data.error) {
						messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
					}
					$state.go('main.lots.list');
				})
				.catch(e=>{
					console.log(e);
				})
				.then(_=>{
					$scope.waitingForResponse = false;
				})
			};

			$scope.backToLotDetails = function() {
				$state.go('main.lots.view', { lotId: lotStore._id});
			}

	}]);
})();