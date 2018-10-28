(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');


	/******************* Scanning Page Controller *************************/
	app.controller('EditManifestCtrl', ['$scope', 'lotStore', 'saveManifest', 'sessionTimeout', function($scope, lotStore, saveManifest, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.lot = lotStore;
		$scope.saveManifest = saveManifest;
	}]);
})();