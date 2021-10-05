import angular from 'angular';

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

