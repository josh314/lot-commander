import angular from 'angular';

const userPermissionFilter = permissions => _ => _.userPermission ? permissions.includes( _.userPermission ) : true;

const suppressUnauthorizedNavigation = ( navItems, permissions ) => {
  const firstPass = navItems.filter( userPermissionFilter(permissions) );
  
  const secondPass = firstPass.map( item => {
    if( item.drops && item.drops.length ) {
      return Object.assign( item , { drops: item.drops.filter( userPermissionFilter(permissions) ) });
    }
    else {
      return item;
    }
  });

  return secondPass.filter( item => item.drops ? item.drops.length > 0 : true );
};

/******************* Navbar Controller *************************/
angular.module('myApp').controller('NavbarCtrl', ['$scope', 'navbarData', 'user', function($scope, navbarData, user) {

  const navItems = suppressUnauthorizedNavigation( navbarData.navItems, user.get().permissions );

  $scope.navbar = {
    brand: navbarData.brand,
    navItems: navItems,
  };

  $scope.isCollapsed = true;
  $scope.toggleCollapse  = function() { $scope.isCollapsed = !$scope.isCollapsed; };
  $scope.collapse = function() {$scope.isCollapsed = true; };
  $scope.expand = function() {$scope.isCollapsed = false;};

  $scope.dropdownOpen = false;
  $scope.dropdownCollapse = function() {$scope.dropdownOpen = false; };
}]);

/*********************** Navbar Directive ***********************/
angular.module('myApp').directive('navbarDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_navbar.html',
    controller: 'NavbarCtrl',
  };
});
