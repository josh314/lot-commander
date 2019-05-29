(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	// File model directive
	app.directive('fileModel', ['$parse', function ($parse) {
	  return {
	     restrict: 'A',
	     link: function(scope, element, attrs) {
	        var model = $parse(attrs.fileModel);
	        var modelSetter = model.assign;
	        element.bind('change', function(){
	           scope.$apply(function(){
	              modelSetter(scope, element[0].files[0]);
	           });
	        });
	     }
	  };
	}]);

	// File model directive
	app.directive('fileListModel', ['$parse', function ($parse) {
	  return {
	     restrict: 'A',
	     link: function(scope, element, attrs) {
	        var model = $parse(attrs.fileListModel);
	        var modelSetter = model.assign;
	        element.bind('change', function(){
	           scope.$apply(function(){
	              modelSetter(scope, element[0].files);
	           });
	        });
	     }
	  };
	}]);

	// File upload service
	app.service('fileUpload', ['$http', function ($http) {
	  this.uploadFileToUrl = function(file, uploadUrl, metadata){
	     var fd = new FormData();
	     fd.append('file', file);
	     for( let [key, val] of Object.entries(metadata)) {
		     fd.append(key, val);
	     }

	     return $http.post(uploadUrl, fd, {
	        transformRequest: angular.identity,
	        headers: {'Content-Type': undefined}
	     })
	  }
	}]);

})();