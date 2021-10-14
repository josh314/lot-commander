import angular from 'angular';
// File model directive
angular.module('myApp').directive( 'fileModel', [ '$parse', 'FileModelSvc', function ( $parse, FileModelSvc ) {
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

      scope.$watch(function() {
        return FileModelSvc.reset();
      }, function(){
        element[0].files = new DataTransfer().files;
        FileModelSvc.endReset();
      });

    }
  };
}]);

angular.module('myApp').factory( 'FileModelSvc', function() {

  let _resetFlag = null;

  return {
    reset: () => _resetFlag,
    startReset: startReset,
    endReset: endReset
  };

  function startReset() {
    _resetFlag = true;
  }

  function endReset() {
    _resetFlag = null;
  }

});