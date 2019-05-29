import app from '../ng-app';

/******************* Navbar Controller *************************/
app.controller('NavbarCtrl', ['$scope', 'navbarData', function($scope, navbarData) {

  const navItems = navbarData.navItems;

  // what the fuck was the point of the loop below?
  // for(let i=0; i<navItems.length; i++) {
  //   if(navItems[i].drops) {
  //     navItems[i].drops = navItems[i].drops;
  //   }
  // }

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
app.directive('navbarDirective', function(){
  return {
    restrict: 'A',
    replace: true,
    templateUrl: '/partials/_navbar.html',
    controller: 'NavbarCtrl',
  };
});
