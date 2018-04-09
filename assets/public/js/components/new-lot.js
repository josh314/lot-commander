(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Newe Manifest Controller *************************/
	app.controller('NewLotCtrl', ['$scope', '$state', 'manifestStore', 'sessionTimeout', function($scope, $state, manifestStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.startLot = function() {
			if(!$scope.lotId) {
				$scope.noLotIdSubmitted = true;
			}
			else {
				//TODO: check if this lotId exists in db
				$scope.noLotIdSubmitted = false;
				manifestStore.newManifest($scope.lotId, $scope.desc);
				$state.go('main.scan');
			}
		};
	}]);
})();