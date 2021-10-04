import angular from 'angular';


/******************* Navbar Controller *************************/
angular.module('myApp').controller('NavbarCtrl', [ 'LoggedInUser', 'navbarData', function( LoggedInUser, navbarData ) {

  const vm = this;

  const userPermissionFilter =  _ => _.userPermission ?  LoggedInUser.hasPermission( _.userPermission ) : true;

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

/*********************** Navbar Directive ***********************/
angular.module('myApp').directive('navbarDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_navbar.html',
  };
});
