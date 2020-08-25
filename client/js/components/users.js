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
angular.module('myApp').factory('logout', ['$http', '$window', 'sessionTimeout', 'user', function($http, $window, sessionTimeout, user){
  return function() {
    $http.get('/logout').then(()=>{
      console.log("destroying 'lotCommander' cookie");
      sessionTimeout.destroy();
      user.destroy();
      $window.location.reload();
    });
  };
}]);


/*********************** User service ****************************/
angular.module('myApp').factory('user', ['$cookies', function($cookies){
  return {
    destroy: () => $cookies.remove('user'),
    get: () => $cookies.getObject('user'),
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
angular.module('myApp').controller('CreateUserCtrl', [ '$q', '$state', 'messageModal', 'sessionTimeout', 'user', function( $q, $state, messageModal, sessionTimeout, user ){
  sessionTimeout.timeoutExpired();

  const cleanRoleString = str => str.replace(/__/g, '').replace(/_/g, ' ').toLowerCase();
  const canonicalRoleString = str => `__${str.replace(/ /g, '_')}__`.toUpperCase();
  const __ROLES__ = user.get().roles.map( cleanRoleString );

  const vm = this;

  vm.roles = __ROLES__;
  vm.form = {
    roles: {}
  };

  function navigateToHome() {
    $state.go('main.home');
  }

  vm.submit = function() {

    vm.noName = !vm.form.name;
    vm.noRoles = !Object.keys(vm.form.roles).length;
    vm.noUsername = !vm.form.username;
    vm.passwordInvalid = passwordInvalid(vm.form.password);
    vm.passwordMismatch = (vm.form.password !== vm.form.confirmPassword);

    if(
      vm.passwordInvalid || 
      vm.passwordMismatch ||
      vm.noName ||
      vm.noUsername ||
      vm.noRoles
    ) {
      return;
    }

    const newUserData = {
      name: vm.form.name,
      username: vm.form.username,
      password: vm.form.password,
      roles: Object.keys(vm.form.roles).map( canonicalRoleString )
    };

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
      else if ( resp.message === 'UNAUTHORIZED' ) {
        return messageModal.launch(
          {header: 'Failure', body: `An error occured. Please try again later.`, type: 'error'},
          navigateToHome,
          navigateToHome
        );
      }
      else {
        return messageModal.launch(
          {header: 'Failure', body: `Unauthorized to create user.`, type: 'error'},
          navigateToHome,
          navigateToHome
        );
      }

    });

  };
}]);