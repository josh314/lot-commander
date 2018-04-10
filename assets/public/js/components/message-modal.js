(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/***************** Modal Controller ************************/
	app.controller('ClientMessageModalController', [ '$scope', 'message', function($scope, message){
		$scope.message = JSON.parse(JSON.stringify(message));
	}]);
})();