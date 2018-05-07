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

			$scope.submitListing = function() {

				$scope.waitingForResponse = true;

				//TODO: wait while submitting 
				// $http.post('', {}).then(resp=>{
				// $scope.waitingForResponse = false;
				// 	//TODO: verify submission with modal
				// 	$state.go('main.lots.list');
				// });
			};

			$scope.backToLotDetails = function() {
				$state.go('main.lots.view', { lotId: lotStore._id});
			}

	}]);
})();