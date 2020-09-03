import angular from 'angular';

import * as api from '../api';

// Helpers
function passwordInvalid(password) {
  if( !password ) {
    return true;
  }

  if(password.length < 20) {
    return true;
  }

  return false;
}

const canonicalRoleString = str => `__${str.replace(/ /g, '_')}__`.toUpperCase();
const cleanRoleString = str => str.replace(/__/g, '').replace(/_/g, ' ').toLowerCase();

const __DISPLAY_ROLES__ = LoggedInUser => LoggedInUser.get().roles.map( cleanRoleString );

const prettifyUser = user => {
  const prettyUser = Object.assign( {}, user );

  prettyUser.displayName = `${ user.firstName } ${ user.lastName }`.trim();
  prettyUser.displayRoles = user.roles.map( cleanRoleString );

  return prettyUser;
};

/*********************** Logout service ****************************/
angular.module('myApp').factory('logout', ['$http', '$window', 'sessionTimeout', 'LoggedInUser', function($http, $window, sessionTimeout, LoggedInUser){
  return function() {
    $http.get('/logout').then(()=>{
      console.log("destroying 'lotCommander' cookie");
      sessionTimeout.destroy();
      LoggedInUser.destroy();
      $window.location.reload();
    });
  };
}]);


/*********************** User service ****************************/
angular.module('myApp').factory('LoggedInUser', ['$cookies', function($cookies){

  const get = () => $cookies.getObject('user');

  return {
    destroy: () => $cookies.remove('user'),
    get: get,
    hasPermission: ( permission ) => {
      const user = get();
      return user ? user.permissions.includes( permission ) : false;
    }
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
angular.module('myApp').controller('CreateUserCtrl', [ '$q', '$state', 'messageModal', 'sessionTimeout', 'LoggedInUser', function( $q, $state, messageModal, sessionTimeout, LoggedInUser ){
  sessionTimeout.timeoutExpired();

  const vm = this;

  vm.roles = __DISPLAY_ROLES__( LoggedInUser );
  vm.form = {
    roles: {}
  };

  function navigateToHome() {
    $state.go('main.home');
  }

  vm.submit = function() {

    vm.noFirstName = !vm.form.firstName;
    vm.noLastName = !vm.form.lastName;
    vm.noRoles = !Object.keys(vm.form.roles).length;
    vm.noUsername = !vm.form.username;
    vm.passwordInvalid = passwordInvalid(vm.form.password);
    vm.passwordMismatch = (vm.form.password !== vm.form.confirmPassword);

    if(
      vm.passwordInvalid || 
      vm.passwordMismatch ||
      vm.noFirstName ||
      vm.noLastName ||
      vm.noUsername ||
      vm.noRoles
    ) {
      return;
    }

    const newUserData = {
      firstName: vm.form.firstName,
      lastName: vm.form.lastName,
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

/******************* List Users Controller **********************/
angular.module('myApp').controller('ListUsersCtrl', [ '$q', 'messageModal', 'sessionTimeout', 'LoggedInUser', function( $q, messageModal, sessionTimeout, LoggedInUser){
  sessionTimeout.timeoutExpired();

  const vm = this;
  vm.users = {};
  vm.availableRoles = __DISPLAY_ROLES__( LoggedInUser );
  vm.canDisableUser = LoggedInUser.hasPermission( 'ENABLE_USER' );
  vm.canEditUserRoles = LoggedInUser.hasPermission( 'EDIT_USER_ROLES' );


  $q.when( api.listUsers( { superuser: 0} ) ).then( users => {
    vm.users = users.map( prettifyUser ).map( addHandlers ).map( tagLoggedInUser );
  });

  function tagLoggedInUser( user ) {
    if( user.id === LoggedInUser.get().id ) {
      user.loggedIn = true;
    }
    return user;
  }

  // Turn off the rule or eslint will complain about the usage of `this`
  /* eslint-disable angular/controller-as-vm */
  function addHandlers( user ) {
    user.openStatusEdit = function () {
      this.editingStatus = true;
      this.isDisabledEdit = this.isDisabled;
    };
    user.closeStatusEdit = function () {
      this.editingStatus = false;
      delete this.isDisabledEdit;
    };
    user.saveStatusEdit = function () {
      this.editingStatus = false;
      let p; // will be set to a promise

      if( this.isDisabledEdit !== this.isDisabled ) {
        // TODO: check user permission before submitting edit
        p = $q.when( api.editUserDisabledStatus( this.id, this.isDisabledEdit ) )
          .then( resp => {
            if( resp.success ) {
              return this.isDisabled = this.isDisabledEdit;
            }
            else {
              throw new Error(resp.error);
            }
          })
          .catch( e => {
            return messageModal.launch({header: 'Failure', body: e.message, type: 'error'});
          });
      }
      else {
        p = Promise.resolve( true );
      }
      p.then( _ => this.closeStatusEdit() ); // close edit when done
    };
    user.openRolesEdit = function () {
      this.editingRoles = true;
      this.rolesEdit = this.roles.reduce( ( roles, r ) => {
        roles[ cleanRoleString(r) ] = true;
        return roles;
      }, {});
    };
    user.closeRolesEdit = function () {
      this.editingRoles = false;
      delete this.rolesEdit;
    };
    user.saveRolesEdit = function () {
      this.editingRoles = false;

      // filter down to the checked roles and then map to canonical names and sort
      const rolesEditCanonical = Object.entries( this.rolesEdit ).filter( kv => kv[1] ).map( kv => kv[0] ).map( canonicalRoleString ).sort();
      let p; // will be set to a promise

      if( JSON.stringify(rolesEditCanonical) !== JSON.stringify(this.roles)  ) {
        // TODO: check user permission before submitting edit
        p = $q.when( api.editUserRoles( this.id, rolesEditCanonical ) )
          .then( resp => {
            if( resp.success ) {
              this.roles = rolesEditCanonical;
              this.displayRoles = this.roles.map( cleanRoleString );
            }
            else {
              throw new Error(resp.error);
            }
          })
          .then( _ => {
            delete this.rolesEdit;
          })
          .catch( e => {
            console.log(e);
            return messageModal.launch({header: 'Failure', body: e.message, type: 'error'});
          });
      }
      else {
        p = Promise.resolve( true );
      }
      p.then( _ => this.closeRolesEdit() ); // close edit when done
    };
    return user;
  }
  /* eslint-enable */

}]);