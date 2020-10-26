import angular from 'angular';
import "angular-cookies";
import "angular-animate";
import "angular-sanitize";
import "@uirouter/angularjs";
import "angular-ui-bootstrap";
import "ngstorage";

/************************************************************************
************************ Angular app init *******************************
************************************************************************/
angular.module('myApp', ['ui.bootstrap', 'ui.router', 'ngAnimate', 'ngSanitize', 'ngCookies', 'ngStorage']);

/************************************************************************
************************ Data and constants *****************************
************************************************************************/
const stateData = [
  { name: "main", abstract:true, templateUrl: '/partials/_main.html'},
  { name: "main.home", url: '/', templateUrl: '/partials/_home.html'},
  // states for managing lots
  { name: "main.lots", abstract: true, url: '/lots', templateUrl: '/partials/_container.html' },
  { name: "main.lots.new", navName: 'New Lot', url: '/new', templateUrl: '/partials/_new_lot.html', controller: 'NewLotCtrl'},
  { name: "main.lots.scan", url: '/scan', templateUrl: '/partials/_scan.html', controller: 'ScanCtrl'},
  { name: "main.lots.edit-manifest", url: '/edit-manifest', templateUrl: '/partials/_edit_manifest.html', controller: 'EditManifestCtrl'},
  { name: "main.lots.list", navName: 'List Lots', url: '/list', templateUrl: '/partials/_list_lots.html', controller: 'ListLotsCtrl'},
  { name: "main.lots.view", url: '/view/{lotId}', templateUrl: '/partials/_view_lot.html', controller: 'ViewLotCtrl'},
  { name: "main.lots.submit-listing", url: '/submit-listing', templateUrl: '/partials/_submit_listing.html', controller: 'SubmitListingCtrl'},
  { name: "main.lots.image-editor", url: '/image-editor', templateUrl: '/partials/_image_editor.html' },
  { name: "main.lots.gallery", url: '/gallery/{lotId}', templateUrl: '/partials/_gallery.html' },
  { name: "main.lots.upload-manifest", url: '/upload-manifest/{lotId}', templateUrl: '/partials/_upload_lot_manifest.html' },
  // auctions
  { name: "main.auctions", abstract: true, url: '/auctions', templateUrl: '/partials/_container.html' },
  { name: "main.auctions.list", navName: 'List Auctions', url: '/list', templateUrl: '/partials/_list_auctions.html', controller: 'ListAuctionsCtrl', userPermission: 'LIST_AUCTIONS' },
  // orders
  { name: "main.orders", abstract: true, url: '/orders', templateUrl: '/partials/_container.html'},
  { name: "main.orders.pending", navName: 'Orders', url: '/pending', templateUrl: '/partials/_list_pending_orders.html', userPermission: 'LIST_ORDERS' },
  { name: "main.orders.pick", url: '/pick/{orderId}', templateUrl: '/partials/_order_pick_list.html', userPermission: 'VIEW_ORDER'  },
  // manifest files
  { name: "main.manifests", abstract: true, navName: 'Manifests', url: '/manifests', templateUrl: '/partials/_container.html' },
  { name: "main.manifests.clean", navName: 'Clean', navParent: 'Manifests', url: '/clean', templateUrl: '/partials/_clean_manifest.html' },
  { name: "main.manifests.list", navName: 'List', navParent: 'Manifests', url: '/list', templateUrl: '/partials/_list_manifests.html' },

  // reports
  { name: "main.reports", navName: 'Reports',  url: '/reports', templateUrl: '/partials/_reports.html', userPermission: 'VIEW_REPORT' },

  // tools
  { name: "main.tools", abstract:true, navName: "Tools", url: "/tools", templateUrl: 'partials/_container.html'},
  { name: "main.tools.counter", navName: "Counter", navParent: 'Tools', url: "/counter", templateUrl: 'partials/tools/_counter_tool.html' },

  // receiving
  { name: "main.receiving", abstract: true, navName: "Receiving", url: "/receiving", templateUrl: 'partials/_container.html'},
  { name: "main.receiving.shipment-list", navName: "Shipments", navParent: 'Receiving', url: "/shipments", templateUrl: 'partials/receiving/_shipment_list.html', userPermission: 'VIEW_INCOMING_SHIPMENT' },
  { name: "main.receiving.shipment-creation", navName: "New Shipment", navParent: 'Receiving', url: '/shipments/create', templateUrl: '/partials/receiving/_shipment_creation.html', userPermission: 'CREATE_INCOMING_SHIPMENT' },
  { name: "main.receiving.shipment-details", url: '/shipments/{shipmentId}', templateUrl: '/partials/receiving/_shipment_details.html', userPermission: 'VIEW_INCOMING_SHIPMENT' },
  { name: "main.receiving.shipment-receiving", url: '/shipments/{shipmentId}/receive', templateUrl: '/partials/receiving/_shipment_receiving.html', userPermission: 'RECEIVE_INCOMING_SHIPMENT' },

  // users
  { name: "main.users", abstract:true, navName: "Users", url: "/users", templateUrl: 'partials/_container.html'},
  { name: "main.users.list", navName: "List", navParent: "Users", url: "/list", templateUrl: 'partials/users/_list_users.html', userPermission: 'VIEW_USER' },
  { name: "main.users.change-password", navName: "Change Password", navParent: 'Users', url: "/change-password", templateUrl: 'partials/users/_change_password.html', controller:'ChangeUserPasswordCtrl'},
  { name: "main.users.create", navName: "New User", navParent: "Users", url: "/create", templateUrl: 'partials/users/_create_user.html', userPermission: 'CREATE_USER' },
  { name: "main.users.logout", url: "/logout", navName: 'Logout', navParent: 'Users', controller:'LogoutCtrl' },

];

const stateConfigData = [];
const navbar = {
  brand: {title:"Lot Commander", route:"/", state:"main.home"},
  navItems: []
};

// Format state data for registering with ui-router and building navbar data structure
stateData.forEach(function(stateObj){
  stateConfigData.push({ name: stateObj.name, url: stateObj.url, templateUrl: stateObj.templateUrl, controller: stateObj.controller});
  if(stateObj.navParent) {
    const navParent = navbar.navItems.find(function(elem) { return elem.title == stateObj.navParent; });//must define navParent before child
    if( angular.isUndefined (navParent.drops ) ) {
      navParent.drops = [];
    }
    navParent.drops.push({ state: stateObj.name, title: stateObj.navName, userPermission: stateObj.userPermission});
  }
  else if (stateObj.navName) {
    navbar.navItems.push({ state: stateObj.name, title: stateObj.navName, route: stateObj.url, userPermission: stateObj.userPermission});
  }
});
angular.module('myApp').constant('stateConfigData', stateConfigData);
angular.module('myApp').constant('navbarData', navbar);

angular.module('myApp').constant('bstockConstants', {
  Category: [
    'Appliances',
    'Automotive',
    'Books, Music and Movies',
    'Cell Phones',
    'Commercial Assets',
    'Computers and Software',
    'Consumer Electronics',
    'Fashion',
    'Furniture',
    'General Merchandise',
    'Health & Beauty',
    'Home & Garden',
    'Jewelry & Watches',
    'Mixed Lots',
    'Sporting Goods',
    'Toys',
    'TVs',
  ],
  Condition: [
    'New',
    'Refurbished',
    'Shelf Pulls',
    'Used',
    'Customer Returns',
    'Salvage',
  ],
  Packaging: [
    'Brown/White Box',
    'Not Original',
    'Original',
    'Other Packaging',
    'See Image(s)',
  ],
});

angular.module('myApp').constant('lotCategories', [
  {
    prefix: 'AP',
    name: 'Apparel'
  },
  {
    prefix: 'CS',
    name: 'Cosmetics'
  },
  {
    prefix: 'GM',
    name: 'General Merchandise'
  },
  {
    prefix: 'NP',
    name: 'Nail Polish'
  },
  {
    prefix: 'PC',
    name: 'Personal Care'
  },
  {
    prefix: 'VT',
    name: 'Vitamins & Supplements'
  },
]);

angular.module('myApp').constant('palletCategories', [
  "general merchandise",
  "cosmetics",
  "personal care",
  "clothing"
]);

//************************************************************************
//********************* Config Block *************************************
//************************************************************************
angular.module('myApp').config(
  ['$locationProvider', '$stateProvider', '$urlRouterProvider', '$urlMatcherFactoryProvider', 'stateConfigData',
    function($locationProvider, $stateProvider, $urlRouterProvider, $urlMatcherFactoryProvider, stateConfigData) {
      $locationProvider.html5Mode({enabled: true});
      $urlRouterProvider.otherwise('/');
      $urlMatcherFactoryProvider.strictMode(false);

      // Create an array of state objects to be registered with $stateProvider
      var states = [];
      stateConfigData.forEach(function(state) {
        states.push({name: state.name, abstract: state.abstract, url: state.url, templateUrl: state.templateUrl, controller:state.controller});
      });
      angular.forEach(states, function(state) { $stateProvider.state(state); });
    }
  ]
);

//************************************************************************
//************************ Run Block *************************************
//************************************************************************
angular.module('myApp').run(['$rootScope', '$document', function($rootScope, $document) {
  $rootScope.$on('$stateChangeSuccess', function() {
    $document.prop('body').scrollTop = $document.prop('documentElement').scrollTop = 0;
  });
}]);