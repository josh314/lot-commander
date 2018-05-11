(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* New Lot Controller *************************/
	app.controller('NewLotCtrl', ['$http', '$scope', '$state', 'dbEnums', 'sessionTimeout', function($http, $scope, $state, dbEnums, sessionTimeout) {
		sessionTimeout.timeoutExpired();

		$scope.quickLots = [
			{				
				handlePrefix: 'GM',
				name: 'General Merchandise',
				template: {
					type: 'shelf-pull',
					totalUnits: 400,
					listingData: {
						title: 'Brand Name General Merchandise',
						body: 'some shizz'
					},
				} 
			},
		];

		$scope.lotTypes = dbEnums.lotType;

		$scope.startQuickLot = function(quickLot) {
			const newLot = {
				handle: quickLot.handlePrefix,
			};
			Object.assign(newLot, quickLot.template);
			$scope.startLot(newLot);
		}

		$scope.startCustomLot = function() {
			if(!$scope.handle) {
				$scope.noHandleSubmitted = true;
			}
			else {
				$scope.noHandleSubmitted = false;
				const newLot = {
					handle: $scope.handle,
					description: $scope.desc,
					type: $scope.type,
				};
				$scope.startLot(newLot);
			}
		};

		$scope.startLot = function(newLot) {
			$http.post('/api/db/new-lot', newLot).then(resp=>{
				if(resp.data.error) {
					console.log(resp.data.error);
				}
				else {
					$state.go('main.lots.list');
				}
			})
		}
	}]);
})();