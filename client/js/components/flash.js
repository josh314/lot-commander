import angular from 'angular';

/******************* Flash Message controller *******************************/
angular.module('myApp').controller('FlashCtrl', [ function() {
  const vm = this;

  vm.isHidden = false;
  vm.closeFlash = function () {
    vm.isHidden = true;
  };

}]);

