(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* New Lot Controller *************************/
	app.controller('NewLotCtrl', ['$http', '$scope', '$state', 'dbEnums', 'sessionTimeout', function($http, $scope, $state, dbEnums, sessionTimeout) {
		sessionTimeout.timeoutExpired();

		$scope.lotTemplates = [
			{
				title: 'General Merchandise',
				type: 'shelf-pulls',
				handlePrefix: 'GM',
				lotSize: 400 
			},
		];

		$scope.lotTypes = dbEnums.lotType;
		$scope.startLot = function() {
			if(!$scope.handle) {
				$scope.noHandleSubmitted = true;
			}
			else {
				//TODO: check if this handle exists in db
				$scope.noHandleSubmitted = false;
				var newLot = {
					handle: $scope.handle,
					description: $scope.desc,
					type: $scope.type,
				};
				$http.post('/api/db/new-lot', newLot).then(resp=>{
					if(resp.data.error) {
						console.log(resp.data.error);
					}
					else {
						$state.go('main.lots.list');
					}
				})
			}
		};


		$scope.startCustomLot = function() {
			if(!$scope.handle) {
				$scope.noHandleSubmitted = true;
			}
			else {
				//TODO: check if this handle exists in db
				$scope.noHandleSubmitted = false;
				var newLot = {
					handle: $scope.handle,
					description: $scope.desc,
					type: $scope.type,
				};
				$http.post('/api/db/new-lot', newLot).then(resp=>{
					if(resp.data.error) {
						console.log(resp.data.error);
					}
					else {
						$state.go('main.lots.list');
					}
				})
			}
		};

		$scope.startLot() = function(newLot) {
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