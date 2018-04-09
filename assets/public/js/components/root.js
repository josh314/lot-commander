(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');
	/******************* Angular App Root Controller ****************************/
	app.controller('RootCtrl', ['sessionTimeout', function(sessionTimeout) {
		sessionTimeout.init();
	}]);
})();
