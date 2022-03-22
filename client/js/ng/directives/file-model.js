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

// processes a call-back on file input change.
// I've little idea how this actually works. See https://stackoverflow.com/questions/20146713/ng-change-on-input-type-file
angular.module('myApp').directive("ngUploadChange", function() {

  return {

    scope:{
      ngUploadChange:"&"
    },

    link:function( $scope, $element, _$attrs) {

      $element.on("change", function( event ) {

        $scope.$apply( function() {

          $scope.ngUploadChange( { $event: event } );

        });

      });

      $scope.$on("$destroy", function() {

        $element.off();

      });

    }
  };

});