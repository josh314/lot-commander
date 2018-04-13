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
	// File upload service
	app.service('fileUpload', ['$http', function ($http) {
	  this.uploadFileToUrl = function(file, uploadUrl){
	     var fd = new FormData();
	     fd.append('file', file);
	     $http.post(uploadUrl, fd, {
	        transformRequest: angular.identity,
	        headers: {'Content-Type': undefined}
	     })
	     // .success(function(){
	     // })
	     // .error(function(){
	     // });
	  }
	}]);

	/******************* Manifest Files Controller *************************/
	app.controller('ManifestFilesCtrl', ['$scope', '$http', 'sessionTimeout', function($scope, $http, sessionTimeout) {
		sessionTimeout.timeoutExpired();
		$scope.files = null;
		$http.get('/api/files/list').then(resp=>{
			$scope.files = resp.data.files;
		});
	}]);
})();