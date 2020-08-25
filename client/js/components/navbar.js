import angular from 'angular';

const roleAccessFilter = roles => _ => _.roleAccess ? roles.includes( _.roleAccess ) : true;

const suppressUnauthorizedNavigation = ( navItems, roles ) => {
  const firstPass = navItems.filter( roleAccessFilter(roles) );
  
  const secondPass = firstPass.map( item => {
    if( item.drops && item.drops.length ) {
      return Object.assign( item , { drops: item.drops.filter( roleAccessFilter(roles) ) });
    }
    else {
      return item;
    }
  });

  return secondPass.filter( item => item.drops ? item.drops.length > 0 : true );
};

/******************* Navbar Controller *************************/
angular.module('myApp').controller('NavbarCtrl', ['$scope', 'navbarData', 'user', function($scope, navbarData, user) {

  const navItems = suppressUnauthorizedNavigation( navbarData.navItems, user.get().roles );

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
