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
			$scope.marketplaces = ['bstock', 'shopify'];
			$scope.bstockCategories = Object.keys(bstockFormConstants.category);
			$scope.bstockConditions = Object.keys(bstockFormConstants.condition);
			$scope.bstockPackagings = Object.keys(bstockFormConstants.packaging);
			$scope.bstockShippingChargeTypes = Object.keys(bstockFormConstants.shippingChargeType);
			$scope.bstockShippingAllowedDestinations = Object.keys(bstockFormConstants.shippingAllowedDestinations);

			const conditionMapping = {
				'shelf-pull': 'Shelf Pulls',
				'customer returns': 'Customer Returns',
				'salvage': 'Salvage',
			}

			//Form default values
			$scope.listing = {
				marketplace: 'bstock',
				// bstock defaults
				auctionStartPrice: '300',
				condition: conditionMapping[$scope.lot.type] || '',
				packaging: 'Original',
				shipping: {
					allowedDestinations: bstockFormConstants.shippingAllowedDestinations['Continental US only (Alaska and Hawaii excluded)'],
					chargeType: bstockFormConstants.shippingChargeType['Fixed Cost'],
					charge: '90',
					carrier: 'UPS',
					notes: 'Lot will ship within one business day after confirmed payment.'
				},
				//shopify defaults
				shopifyInventory: 1,
				shopifyTags: (function(){
					const tags = ['liquidation'];
					const handleTags = {
						'PC': 'personal care',
						'GM': 'general merchandise',
						'VT': 'vitamins',
						'NP': 'nail polish',
						'CS': 'cosmetics',
					};

                    const match = $scope.lot.handle.match(/^([a-zA-Z]{2})/);
					if(match && match[1] && handleTags[match[1]]) {
						tags.push(handleTags[match[1]]);
					}
					return tags.join(', ');
				})(),
			};

			function validateBstockListingOptions() {
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
					return false;
				}
				return true;
			}

			function validateShopifyListingOptions() {
				$scope.invalidShopifyPrice = ($scope.listing.shopifyPrice && $scope.listing.shopifyPrice.match(/[0-9]+/)) ? false : true;
				$scope.invalidShopifyInventory = ($scope.listing.shopifyInventory && ($scope.listing.shopifyInventory >= 0)) ? false : true;

				if($scope.invalidShopifyPrice || $scope.invalidShopifyTags || $scope.invalidShopifyInventory) {
					return false;
				}
				return true;
			}

			function validateListingOptions() {
				if($scope.listing.marketplace=='bstock') {
					return validateBstockListingOptions();
				}
				else if($scope.listing.marketplace=='shopify') {
					return validateShopifyListingOptions();
				}
			}

			$scope.submitListing = function() {

				$scope.noMarketplace = $scope.listing.marketplace ? false : true;
				if($scope.noMarketplace) {
					return;
				}

				if(!validateListingOptions()) {
					return;
				}

				$scope.waitingForResponse = true;

				$http.post('/api/listings/submit', { lotId: lotStore._id, listing: $scope.listing}).then(resp=>{
					console.log(resp);
					if(resp.data.error) {
						messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
					}
					else {
						messageModal.launch({header: 'Status', body: 'Submission successful.', type: 'success'});
						$state.go('main.lots.list');
					}
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