import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Flash Message controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', ['ImageSvc', function(ImageSvc) {
  const vm = this;

  vm.image = ImageSvc.getStore();

}]);

