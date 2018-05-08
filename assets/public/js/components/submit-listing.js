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
				if(!$scope.listing.marketplace) {
					$scope.noMarketplace = true;
					return;
				} else {
					$scope.noMarketplace = false;
				}

				if(!$scope.listing.shipping.chargeType) {
					$scope.noChargeType = true;
					return;
				}
				else {
					$scope.noChargeType = false;
				}

				if($scope.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
					if(!$scope.listing.shipping.cost || !$scope.listing.shipping.cost.match(/[0-9]+/)) {
						$scope.invalidShippingCost = true;
						return;
					}
					else {
						$scope.invalidShippingCost = false;
					}
					if(!$scope.listing.shipping.carrier) {
						$scope.noCarrier = true;
						return;
					}
					else {
						$scope.noCarrier = false;
					}
				}

				$scope.waitingForResponse = true;

				//TODO: wait while submitting 
				$http.post('/api/', { lotId: lotStore._id, listing: listing}).then(resp=>{
				$scope.waitingForResponse = false;
					//TODO: verify submission with modal
					$state.go('main.lots.list');
				});
			};

			$scope.backToLotDetails = function() {
				$state.go('main.lots.view', { lotId: lotStore._id});
			}

	}]);
})();