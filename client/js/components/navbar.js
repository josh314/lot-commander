import angular from 'angular';


/******************* Navbar Controller *************************/
angular.module('myApp').controller('NavbarCtrl', ['$scope', 'LoggedInUser', 'navbarData', function($scope, LoggedInUser, navbarData) {

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

  $scope.navbar = {
    brand: navbarData.brand,
    navItems: userPermittedNavItems,
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
