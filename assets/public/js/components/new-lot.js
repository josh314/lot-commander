(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* New Lot Controller *************************/
	app.controller('NewLotCtrl', ['$http', '$scope', '$state', 'dbEnums', 'quickLotsBoilerplate', 'sessionTimeout', function($http, $scope, $state, dbEnums, quickLotsBoilerplate, sessionTimeout) {
		sessionTimeout.timeoutExpired();

		$scope.quickLots = quickLotsBoilerplate;

		$scope.lotTypes = dbEnums.lotType;

		$scope.startQuickLot = function(quickLot) {
			const today = new Date();
			const query = {
				startDate: today,
			};
			$http.post('/api/db/get', query).then(resp=>{
				const selectedCategoryLots = resp.data.filter(x => x.handle.startsWith(quickLot.handlePrefix))
				const lotNumber = 1 + selectedCategoryLots.length;
				const newLot = {
					handle: `${quickLot.handlePrefix}${today.getMonth()+1}.${today.getDate()}.${today.getFullYear()-2000}-${lotNumber}`,
					unmanifested: true,
				};
				Object.assign(newLot, quickLot.template);
				$scope.startLot(newLot);
			});
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