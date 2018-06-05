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
			const today = new Date();//fix time zone to EST

			const categoryDatePrefix = `${quickLot.handlePrefix}${today.getMonth()+1}.${today.getDate()}.${today.getFullYear()-2000}`

			const query = {
				// startDate: today,
				handle: { prefix: true, value: categoryDatePrefix }
			};
			$http.post('/api/db/get', query).then(resp=>{
				const handlePattern = new RegExp(`${categoryDatePrefix}-([0-9]+)`);
				const existingLotNumbers = resp.data.reduce((numbers, lot) => {
					const lotNumberMatch = lot.handle.match(handlePattern);
					if(lotNumberMatch) {
						numbers.add(parseInt(lotNumberMatch[1]));
					}
					return numbers;
				}, new Set());
				console.log(existingLotNumbers)
				let newLotNumber = 1;

				while(existingLotNumbers.has(newLotNumber))
					newLotNumber++;

				const newLot = {
					handle: `${categoryDatePrefix}-${newLotNumber}`,
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