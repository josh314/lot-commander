(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');


	/******************* Scanning Page Controller *************************/
	app.controller('EditManifestCtrl', ['$scope', '$state', 'lotStore', 'saveManifest', 'sessionTimeout', function($scope, $state, lotStore, saveManifest, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.lot = lotStore;
		$scope.saveManifest = () => saveManifest().then(resp=>{
			// $state.go('main.home');
			$state.go('main.lots.view', {lotId: lotStore._id})
		});

	}]);
})();