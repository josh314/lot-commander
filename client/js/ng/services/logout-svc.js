import angular from 'angular';

import * as api from '../../api';

/*********************** Logout service ****************************/
angular.module('myApp').factory('logout', [ '$window', 'sessionTimeout', 'LoggedInUser', function( $window, sessionTimeout, LoggedInUser ){
  return function() {
    api.logoutUser().then(()=>{
      console.log("destroying 'lotCommander' cookie");
      sessionTimeout.destroy();
      LoggedInUser.destroy();
      $window.location.reload();
    });
  };
}]);