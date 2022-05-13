import angular from 'angular';

/******************* List Users Controller **********************/
angular.module('myApp').controller( 'ListUsersCtrl', [

  'ModalSvc',
  'sessionTimeout',
  'UserSvc',

  function(

    ModalSvc,
    sessionTimeout,
    UserSvc,

  ){

    sessionTimeout.timeoutExpired();

    const __PAGE_SIZE__ = 10;

    const vm = this;
    vm.users = [];
    vm.hideDisabled = true;
    vm.availableRoles = UserSvc.getDisplayRoles();
    vm.canDisableUser = UserSvc.LoggedInUser.hasPermission( 'ENABLE_USER' );
    vm.canEditUserRoles = UserSvc.LoggedInUser.hasPermission( 'EDIT_USER_ROLES' );

    vm.pagination = {
      current: 1,
      totalItems: 0,
      pageSize: __PAGE_SIZE__,
      pageChange: refreshUserList
    };

    refreshUserList( {
      page: 1
    } );

    function refreshUserList(  ) {
      const baseUserQuery = {
        superuser: 0
      };
      if( vm.hideDisabled ) {
        baseUserQuery.disabled = 0;
      }

      UserSvc.count( baseUserQuery ).then( resp => {
        vm.pagination.totalItems = resp.count;

        const pagedUserQuery = Object.assign(
          baseUserQuery,
          {
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          }
        );

        UserSvc.list( pagedUserQuery ).then( users => {
          vm.users = users.map( UserSvc.prettifyUser.bind( UserSvc ) ).map( addHandlers ).map( tagLoggedInUser );
        });
      });
    }

    function tagLoggedInUser( user ) {
      if( user.id === UserSvc.LoggedInUser.get().id ) {
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
          p = UserSvc.editDisabledStatus( this.id, this.isDisabledEdit )
            .then( resp => {
              if( resp.success ) {
                return this.isDisabled = this.isDisabledEdit;
              }
              else {
                throw new Error(resp.error);
              }
            })
            .catch( e => {
              return ModalSvc.message({header: 'Failure', body: e.message, type: 'error'});
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
          roles[ UserSvc.cleanRoleString(r) ] = true;
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
        const rolesEditCanonical = Object.entries( this.rolesEdit ).filter( kv => kv[1] ).map( kv => kv[0] ).map( UserSvc.canonicalRoleString.bind( UserSvc ) ).sort();
        let p; // will be set to a promise

        if( JSON.stringify(rolesEditCanonical) !== JSON.stringify(this.roles)  ) {
          // TODO: check user permission before submitting edit
          p = UserSvc.editRoles( this.id, rolesEditCanonical )
            .then( resp => {
              if( resp.success ) {
                this.roles = rolesEditCanonical;
                this.displayRoles = this.roles.map( UserSvc.cleanRoleString.bind( UserSvc ) );
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
              return ModalSvc.message({header: 'Failure', body: e.message, type: 'error'});
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

  }
]);