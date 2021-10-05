import angular from 'angular';

import * as api from '../../api';

/******************* Change Password Controller ********************/
angular.module('myApp').factory('UserSvc', [ '$q', 'LoggedInUser',
  function( $q, LoggedInUser ){

    function passwordInvalid( password ) {
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
    
    const create = data => $q.when( api.createNewUser( data ) );

    function changeUserPassword( password ) {
      return $q.when( api.changeUserPassword( password ) );
    }

    const count = query => $q.when( api.countUsers( query ) );
  
    const editDisabledStatus = ( userId, isDisabled ) => $q.when( api.editUserDisabledStatus( userId, isDisabled ) );

    const editRoles = ( userId, roles ) => $q.when( api.editUserRoles( userId, roles ) );

    function getDisplayRoles() { return LoggedInUser.get().roles.map( cleanRoleString ); }
    
    const list = query => $q.when( api.listUsers( query ) );

    function prettifyUser( user ) {
      const prettyUser = Object.assign( {}, user );
    
      prettyUser.displayName = `${ user.firstName } ${ user.lastName }`.trim();
      prettyUser.displayRoles = user.roles.map( cleanRoleString );
    
      return prettyUser;
    }
    

    return {
      canonicalRoleString,
      changeUserPassword,
      cleanRoleString,
      count,
      create,
      editDisabledStatus,
      editRoles,
      getDisplayRoles,
      list,
      LoggedInUser,
      passwordInvalid,
      prettifyUser
    };
    
  }
]);