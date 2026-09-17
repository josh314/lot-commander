import angular from 'angular';


/******************* Navbar Controller *************************/
angular.module('myApp').controller('NavbarCtrl', [ 'LoggedInUser', 'navbarData', function( LoggedInUser, navbarData ) {

  const vm = this;

  // assume permissions are either strings or object with a single key ( 'and'/'or' ) at each level with values arrays of strings or similar objects
  const isPermitted = permission => {
    if(angular.isString( permission ) ) {
      return LoggedInUser.hasPermission( permission );
    }
    else  if( angular.isObject( permission ) ) {

      if( permission[ 'or' ] ) {
        return permission[ 'or' ].reduce( ( acc, _ ) => acc || isPermitted( _ ) , false );
      }
      else if( permission[ 'and' ] ) {
        return permission[ 'and' ].reduce( ( acc, _ ) => acc && isPermitted( _ ) , true );
      }

    }
    
  };

  const userPermissionFilter =  _ => _.userPermission ? isPermitted( _.userPermission ) : true;

  const userPermittedNavItems =
    navbarData.navItems
      .filter( userPermissionFilter )
      .map(item => {
        if( item.drops && item.drops.length ) {
          return Object.assign( item , { drops: item.drops.filter( userPermissionFilter ) });
        }
        else {
          return item;
        }
      })
      .filter( item => item.drops ? item.drops.length > 0 : true );

  vm.navbar = {
    brand: navbarData.brand,
    navItems: userPermittedNavItems,
  };

  vm.isCollapsed = true;
  vm.toggleCollapse  = function() { vm.isCollapsed = !vm.isCollapsed; };
  vm.collapse = function() { vm.isCollapsed = true; };
  vm.expand = function() { vm.isCollapsed = false;};

  vm.dropdownOpen = false;
  vm.dropdownCollapse = function() { vm.dropdownOpen = false; };
}]);
