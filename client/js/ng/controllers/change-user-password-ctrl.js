import angular from 'angular';

/******************* Change Password Controller ********************/
angular.module('myApp').controller('ChangeUserPasswordCtrl', [ 'logout', 'sessionTimeout', 'UserSvc',

  function( logout, sessionTimeout, UserSvc ){
    sessionTimeout.timeoutExpired();

    const vm = this;
    vm.passwordMismatch = false;
    vm.passwordInvalid = false;

    vm.submitPasswordChange = function() {

      vm.passwordInvalid = UserSvc.passwordInvalid( vm.password );
      vm.passwordMismatch = ( vm.password !== vm.confirmPassword );

      if( vm.passwordInvalid || vm.passwordMismatch ) {
        return;
      }

      UserSvc.changeUserPassword( vm.password ).then(function(){
        logout();
      });

    };

  }
]);
