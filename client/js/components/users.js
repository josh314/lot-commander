import angular from 'angular';

import * as api from '../api';

function passwordInvalid(password) {
  if( !password ) {
    return true;
  }

  if(password.length < 20) {
    return true;
  }

  return false;
}

/*********************** Logout service ****************************/
angular.module('myApp').factory('logout', ['$http', '$window', 'sessionTimeout', function($http, $window, sessionTimeout){
  return function() {
    $http.get('/logout').then(()=>{
      console.log("destroying 'lotCommander' cookie");
      sessionTimeout.destroy();
      $window.location.reload();
    });
  };
}]);

/*********************** Timeout session service ****************************/
angular.module('myApp').factory('sessionTimeout', ['$cookies', '$state', function($cookies, $state){
  const cookieName = 'lotCommander';

  function expireTime() {

    // Values for local time browser session timeout
    const timeoutHour = 2;
    const timeoutMinutes = 0;
    const timeoutSeconds = 0;

    const d = new Date();
    d.setHours(timeoutHour);
    d.setMinutes(timeoutMinutes);
    d.setSeconds(timeoutSeconds);
    if(d < new Date()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function getCurrentTimeout() {
    const lotCommanderCookie = $cookies.getObject(cookieName);
    const loginTimeout = lotCommanderCookie ? lotCommanderCookie.timeout : undefined;
    return loginTimeout;
  }

  function timeoutExpired() {
    const timeoutValue = new Date(getCurrentTimeout());
    console.log('current timeout value: ' + timeoutValue);
    if(new Date() > timeoutValue) {
      console.log('logging out...');
      $state.go('main.users.logout');
    }
  }

  function init() {
    console.log('sessionTimeout.init() called');
    let loginTimeout = getCurrentTimeout();
    if(!loginTimeout) {
      console.log("init'ing new timeout value");
      loginTimeout = expireTime();
      let lotCommanderCookie = {
        timeout: loginTimeout,
      };
      $cookies.putObject(cookieName, lotCommanderCookie);
    } else {
      loginTimeout = new Date(loginTimeout);
    }
    console.log('Session will timeout at: ' + loginTimeout);
  }

  function destroy() {
    $cookies.remove(cookieName);
  }

  return {
    init: init,
    timeoutExpired: timeoutExpired,
    destroy: destroy
  };
}]);

/*************** Logout Controller **************************/
angular.module('myApp').controller('LogoutCtrl', ['logout', function(logout){
  logout();
}]);

/******************* Change Password Controller ********************/
angular.module('myApp').controller('ChangeUserPasswordCtrl', ['$scope', '$http', 'logout', 'sessionTimeout', function($scope, $http, logout, sessionTimeout){
  sessionTimeout.timeoutExpired();
  $scope.passwordMismatch = false;
  $scope.passwordInvalid = false;

  $scope.submitPasswordChange = function() {

    $scope.passwordInvalid = passwordInvalid($scope.password);
    $scope.passwordMismatch = ($scope.password !== $scope.confirmPassword);

    if($scope.passwordInvalid || $scope.passwordMismatch) {
      return;
    }

    const submitData = { password: $scope.password };
    $http.post('/api/users/change-password', submitData).then(function(){
      logout();
    });
  };
}]);

/******************* Create User Controller ********************/
angular.module('myApp').controller('CreateUserCtrl', [ '$q', '$state', 'messageModal', 'sessionTimeout', function( $q, $state, messageModal, sessionTimeout ){
  sessionTimeout.timeoutExpired();

  const vm = this;

  vm.form = {};

  function navigateToHome() {
    $state.load('main.home');
  }

  vm.submit = function() {

    vm.noName = !vm.form.name;
    vm.noRole = !vm.form.role;
    vm.noUsername = !vm.form.username;
    vm.passwordInvalid = passwordInvalid(vm.form.password);
    vm.passwordMismatch = (vm.form.password !== vm.form.confirmPassword);

    if(
      vm.passwordInvalid || 
      vm.passwordMismatch ||
      vm.noName ||
      vm.noUsername ||
      vm.noRole 
    ) {
      return;
    }

    const newUserData = Object.assign( {}, vm.form );
    delete newUserData.confirmPassword;

    return $q.when( api.createNewUser( newUserData ) ).then( resp => {

      if(resp.success) {
        return messageModal.launch(
          {header: 'Success', body: `User "${vm.form.username}" successfully created`, type: 'info'},
          navigateToHome,
          navigateToHome
        );
      }


      if( resp.message === 'USER_EXISTS' ) {
        vm.userExists = true;
        return;
      }
      else {
        return messageModal.launch(
          {header: 'Failure', body: `An error occured. Please try again later.`, type: 'error'},
          navigateToHome,
          navigateToHome
        );
      }

    });

  };
}]);