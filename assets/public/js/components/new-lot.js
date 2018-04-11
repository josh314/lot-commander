(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* New Lot Controller *************************/
	app.controller('NewLotCtrl', ['$http', '$scope', '$state', 'sessionTimeout', function($http, $scope, $state, sessionTimeout) {
		sessionTimeout.timeoutExpired();
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
				};
				$http.post('/api/db/new-lot', newLot).then(resp=>{
					if(resp.data.error) {
						console.log(resp.data.error);
					}
					else {
						$state.go('main.list');
					}
				})
			}
		};
	}]);
})();