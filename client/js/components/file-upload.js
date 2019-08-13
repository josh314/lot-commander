import angular from 'angular';

// File model directive
angular.module('myApp').directive('fileModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      const model = $parse(attrs.fileModel);
      const modelSetter = model.assign;
      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files[0]);
        });
      });
    }
  };
}]);

// File model directive
angular.module('myApp').directive('fileListModel', ['$parse', function ($parse) {
  return {
    restrict: 'A',
    link: function(scope, element, attrs) {
      const model = $parse(attrs.fileListModel);
      const modelSetter = model.assign;
      element.bind('change', function(){
        scope.$apply(function(){
          modelSetter(scope, element[0].files);
        });
      });
    }
  };
}]);

// File upload service
angular.module('myApp').service('fileUpload', ['$http', function ($http) {
  this.uploadFileToUrl = function(file, uploadUrl, metadata={}){
    const fd = new FormData();
    fd.append('file', file);
    for( let [key, val] of Object.entries(metadata)) {
      fd.append(key, val);
    }

    return $http.post(uploadUrl, fd, {
      transformRequest: angular.identity,
      headers: {'Content-Type': undefined}
    });
  };
}]);

