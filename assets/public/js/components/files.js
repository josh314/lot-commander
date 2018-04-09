(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Files Controller *************************/
	app.controller('FilesCtrl', ['$scope', '$http', 'sessionTimeout', function($scope, $http, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.files = null;
		$http.get('/api/files/list').then(resp=>{
			$scope.files = resp.data.files;
		});
	}]);
})();