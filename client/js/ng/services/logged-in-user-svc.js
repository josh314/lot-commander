import angular from 'angular';

/*********************** User service ****************************/
angular.module('myApp').factory('LoggedInUser', ['$cookies', function($cookies){

  const get = () => $cookies.getObject('user');

  return {
    destroy: () => $cookies.remove('user'),
    get: get,
    hasPermission: ( permission ) => {
      const user = get();
      return user ? user.permissions.includes( permission ) : false;
    },
    listPermissions: () => get() ? get().permissions: [],
  };
}]);
