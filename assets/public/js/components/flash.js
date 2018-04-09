(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Flash Message controller *******************************/
	app.controller('FlashCtrl', ['$scope', function($scope) {
		$scope.isHidden = false;
		$scope.closeFlash = function () {
			$scope.isHidden = true;
		};
	}]);
})();
