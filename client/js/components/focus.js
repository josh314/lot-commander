(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Provides utility function for selecting focus on elements by id ***/
	app.factory('focus', ['$timeout', '$window', function($timeout, $window) {
		return function(id) {
			// timeout makes sure that it is invoked after any other event has been triggered.
			// e.g. click events that need to run before the focus or
			// inputs elements that are in a disabled state but are enabled when those events
			// are triggered.
			$timeout(function() {
				var element = $window.document.getElementById(id);
				if(element)
					element.focus();
			});
		};
	}]);
})();