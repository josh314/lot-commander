import angular from 'angular';

/******************* Create User Controller ********************/
angular.module('myApp').controller('CreateUserCtrl', [ 'messageModal', 'navigate', 'sessionTimeout', 'UserSvc',
  function( messageModal, navigate, sessionTimeout, UserSvc ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.roles = UserSvc.getDisplayRoles( );
    vm.form = {
      roles: {}
    };

    function navigateToHome() {
      navigate.home();
    }

    vm.submit = function() {

      vm.noFirstName = !vm.form.firstName;
      vm.noLastName = !vm.form.lastName;
      vm.noRoles = !Object.keys(vm.form.roles).length;
      vm.noUsername = !vm.form.username;
      vm.passwordInvalid = UserSvc.passwordInvalid(vm.form.password);
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
        roles: Object.keys(vm.form.roles).map( role => UserSvc.canonicalRoleString( role ) )
      };

      return UserSvc.create( newUserData ).then( resp => {

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
  }
]);
