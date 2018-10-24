(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Scanning Page Controller *************************/
	app.controller('EditManifestCtrl', ['$scope', '$state', '$http', 'lotStore', 'sessionTimeout', function($scope, $state, $http, lotStore, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.lot = lotStore;

		$scope.saveManifest = function() {
      lotStore.updateTotalUnits();
			$http.post('/api/db/save-manifest/', {lot: lotStore}).then(resp=>{
				$state.go('main.home');
			});
		}
	}]);
})();