import angular from 'angular';

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
