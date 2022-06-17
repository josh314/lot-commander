import angular from 'angular';

/*********************** User service ****************************/
angular.module('myApp').factory('LoggedInUser', ['$cookies', function($cookies){

  const get = () => $cookies.getObject('user');

  const hasPermission = ( permission ) => {
    const user = get();
    return user ? user.permissions.includes( permission ) : false;
  };

  return {

    // basic permission functions
    destroy: () => $cookies.remove('user'),
    get: get,
    hasPermission: hasPermission,
    listPermissions: () => get() ? get().permissions: [],

    // specialized permission functions
    hasMarketplacePermission( marketplace ) {

      if( marketplace === 'wholesaleninjas' ) {
        return hasPermission( 'SUBMIT_SHOPIFY_LISTING' );
      }

      if( marketplace === 'bstock' ) {
        return hasPermission( 'SUBMIT_AUCTION' );
      }

      return false;

    }

  };
}]);
