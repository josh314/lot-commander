(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');
	
	/******************* Manifest Files Controller *************************/
	app.controller('ManifestFilesListCtrl', ['$scope', '$http', 'sessionTimeout', function($scope, $http, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.files = null;
		$http.get('/api/manifest-files/list').then(resp=>{
			$scope.files = resp.data.files;
		});
	}]);
})();