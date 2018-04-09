(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/*********************** Footer Directive ***********************/
	app.directive('footerDirective', function(){
		return {
			restrict: 'A',
			replace: true,
			templateUrl: '/partials/_footer.html',
		};
	});

})();
