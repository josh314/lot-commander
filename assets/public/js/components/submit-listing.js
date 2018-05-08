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

			$scope.marketplaces = ['bstock'];

			$scope.lot = lotStore;
			$scope.waitingForResponse = false;

			$scope.bstockFormConstants = bstockFormConstants;

			$scope.shippingChargeTypes = Object.keys(bstockFormConstants.shippingChargeType);
			$scope.shippingAllowedDestinations = Object.keys(bstockFormConstants.shippingAllowedDestinations);

			$scope.listing = {
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

				$scope.noChargeType = $scope.listing.shipping.chargeType ? false : true;

				if($scope.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
					$scope.invalidShippingCost = ($scope.listing.shipping.cost && $scope.listing.shipping.cost.match(/[0-9]+/)) ? false : true;
					$scope.noCarrier = $scope.listing.shipping.carrier ? false : true;
				}
				else {
					$scope.invalidShippingCost = $scope.noCarrier = false;
				}

				if($scope.noChargeType || $scope.invalidShippingCost || $scope.noCarrier) {
					return;
				}


				$scope.waitingForResponse = true;

				//TODO: wait while submitting 
				$http.post('/api/', { lotId: lotStore._id, listing: $scope.listing}).then(resp=>{
					//TODO: verify submission with modal
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