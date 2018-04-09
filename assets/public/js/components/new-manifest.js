(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Newe Manifest Controller *************************/
	app.controller('NewManifestCtrl', ['$scope', '$state', 'manifestStore', 'sessionTimeout', function($scope, $state, manifestStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.startManifest = function() {
			if(!$scope.handle) {
				$scope.noHandleSubmitted = true;
			}
			else {
				//TODO: check if this handle exists in db
				$scope.noHandleSubmitted = false;
				manifestStore.newManifest($scope.handle, $scope.desc);
				$state.go('main.scan');
			}
		};
	}]);
})();