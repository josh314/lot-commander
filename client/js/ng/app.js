import angular from 'angular';
import "angular-cookies";
import "angular-animate";
import "angular-sanitize";
import "angular-ui-router";
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
  { name: "main.lots", abstract: true, navName: 'Lots', url: '/lots', templateUrl: '/partials/_container.html' },
  { name: "main.lots.new", navName: 'New Lot', navParent: 'Lots', url: '/new', templateUrl: '/partials/_new_lot.html', userPermission: 'CREATE_LOT' },
  { name: "main.lots.scan", url: '/scan', templateUrl: '/partials/_scan.html', userPermission: 'EDIT_LOT' },
  { name: "main.lots.edit-manifest", url: '/edit-manifest', templateUrl: '/partials/_edit_manifest.html', userPermission: 'EDIT_LOT' },
  { name: "main.lots.list", navName: 'List Lots', navParent: 'Lots', url: '/list', templateUrl: '/partials/_list_lots.html', userPermission: 'VIEW_LOT' },
  { name: "main.lots.view", url: '/view/{lotId}', templateUrl: '/partials/_view_lot.html', controller: 'ViewLotCtrl', userPermission: 'VIEW_LOT' },
  { name: "main.lots.submit-listing", url: '/submit-listing', templateUrl: '/partials/_submit_listing.html', userPermission: { 'or': [ 'SUBMIT_SHOPIFY_LISTING', 'SUBMIT_AUCTION' ] } },
  { name: "main.lots.image-editor", url: '/image-editor', templateUrl: '/partials/_image_editor.html', userPermission: 'EDIT_LOT' },
  { name: "main.lots.gallery", url: '/gallery/{lotId}', templateUrl: '/partials/_gallery.html', userPermission: 'VIEW_LOT' },
  { name: "main.lots.upload-manifest", url: '/upload-manifest/{lotId}', templateUrl: '/partials/_upload_lot_manifest.html', userPermission: 'EDIT_LOT' },
  // auctions
  // { name: "main.auctions", abstract: true, url: '/auctions', templateUrl: '/partials/_container.html' },
  // { name: "main.auctions.list", navName: 'List Auctions', url: '/list', templateUrl: '/partials/_list_auctions.html', userPermission: 'LIST_AUCTIONS' },

  // manifest files
  { name: "main.manifests", abstract: true, navName: 'Manifests', url: '/manifests', templateUrl: '/partials/_container.html' },
  { name: "main.manifests.clean", navName: 'Clean', navParent: 'Manifests', url: '/clean', templateUrl: '/partials/_clean_manifest.html' },
  { name: "main.manifests.list", navName: 'List', navParent: 'Manifests', url: '/list', templateUrl: '/partials/_list_manifests.html' },

  // reports
  // { name: "main.reports", navName: 'Reports',  url: '/reports', templateUrl: '/partials/_reports.html', userPermission: 'VIEW_REPORT' },

  // tools
  // { name: "main.tools", abstract:true, navName: "Tools", url: "/tools", templateUrl: 'partials/_container.html'},
  // { name: "main.tools.counter", navName: "Counter", navParent: 'Tools', url: "/counter", templateUrl: 'partials/tools/_counter_tool.html' },

  // incoming shipments
  { name: "main.shipments", abstract: true, navName: "Shipments", url: "/shipments", templateUrl: 'partials/_container.html'},
  { name: "main.shipments.list", navName: "All shipments", navParent: 'Shipments', url: "/list", templateUrl: 'partials/receiving/_shipment_list.html', userPermission: 'VIEW_INCOMING_SHIPMENT' },
  { name: "main.shipments.creation", navName: "New Shipment", navParent: 'Shipments', url: '/create', templateUrl: '/partials/receiving/_shipment_creation.html', userPermission: 'CREATE_INCOMING_SHIPMENT' },
  { name: "main.shipments.creation-post", url: '/{shipmentId}/create-post', templateUrl: '/partials/receiving/_shipment_creation_post.html', userPermission: 'CREATE_INCOMING_SHIPMENT' },
  { name: "main.shipments.details", url: '/{shipmentId}', templateUrl: '/partials/receiving/_shipment_details.html', userPermission: 'VIEW_INCOMING_SHIPMENT' },
  { name: "main.shipments.receiving", url: '/{shipmentId}/receive', templateUrl: '/partials/receiving/_shipment_receiving.html', userPermission: 'RECEIVE_INCOMING_SHIPMENT' },
  { name: "main.shipments.clean-manifest", url: '/{shipmentId}/manifests/clean', templateUrl: '/partials/_clean_manifest.html', userPermission: 'VIEW_INCOMING_SHIPMENT' },

  // inventory pallets
  { name: "main.inventory-pallets", abstract: true, navName: "Pallets", url: "/pallets", templateUrl: 'partials/_container.html'},
  { name: "main.inventory-pallets.view", navName: "All pallets", navParent: 'Pallets', url: '/list', templateUrl: '/partials/receiving/_inventory_pallet_view.html', userPermission: 'LIST_INVENTORY_PALLETS' },
  { name: "main.inventory-pallets.creation", url: '/create', templateUrl: '/partials/receiving/_inventory_pallet_creation.html', userPermission: 'CREATE_INVENTORY_PALLET' },
  { name: "main.inventory-pallets.to-be-listed", navName: "Pallets to be listed", navParent: 'Pallets', url: '/to-be-listed', templateUrl: '/partials/receiving/_inventory_pallets_to_be_listed.html', userPermission: 'LIST_INVENTORY_PALLETS_TO_BE_LISTED' },
  { name: "main.inventory-pallets.repack", navName: "Repack pallet", navParent: 'Pallets', url: '/{palletId}/repack', optionalParams: ['palletId'], templateUrl: '/partials/receiving/_inventory_pallet_repack.html', userPermission: { 'or': [ 'REPACK_INVENTORY_PALLET', 'EDIT_INVENTORY_PALLET' ] } },


  // ordes
  { name: "main.orders", abstract: true, navName: "Orders", url: "/orders", templateUrl: 'partials/_container.html'},
  // { name: "main.orders.list", navName: 'All orders', navParent: 'Orders', url: "/list", templateUrl: 'partials/orders/_orders_list.html', userPermission: 'LIST_SHOPIFY_ORDERS' },
  { name: "main.orders.queue", navName: 'Queue', navParent: 'Orders', url: "/queue", templateUrl: 'partials/orders/_order_queue.html', userPermission: 'LIST_SHOPIFY_ORDERS' },

  // Costs aggregation
  { name: "main.costs", abstract: true, navName: "Costs", url: "/costs", templateUrl: 'partials/_container.html'},
  { name: "main.costs.purchases", navName: 'Purchases', navParent: 'Costs', url: "/purchases", templateUrl: 'partials/_purchase_aggregation.html', userPermission: 'VIEW_PURCHASING_DATA' },
  { name: "main.costs.transportation", navName: "Transportation", navParent: 'Costs', url: '/transportation', templateUrl: '/partials/_transportation_cost_aggregation.html', userPermission: { 'and': [ 'VIEW_PURCHASING_DATA', 'VIEW_TRANSPORTATION_COST' ] } },

  //Manual Inventory
  { name: "main.manual-inventory", navName: 'Inventory', url: "/manual-inventory", templateUrl: 'partials/_manual_inventory.html', userPermission: 'VIEW_MANUAL_INVENTORY' },

  // Store
  { name: "main.store", abstract: true, navName: 'Store', url: '/store', templateUrl: '/partials/_container.html' },
  { name: "main.store.shipping-rates", navParent: 'Store', navName: 'Shipping Rates', url: '/shipping-rates', templateUrl: '/partials/_store_shipping_rates.html', userPermission: 'EDIT_STORE_SHIPPING_RATES' },
  { name: "main.store.content", navParent: 'Store', navName: 'Content', url: '/content', templateUrl: '/partials/_store_content.html', userPermission: 'EDIT_STORE_CONTENT' },

  // users
  { name: "main.users", abstract:true, navName: "Users", url: "/users", templateUrl: 'partials/_container.html'},
  { name: "main.users.list", navName: "List", navParent: "Users", url: "/list", templateUrl: 'partials/users/_list_users.html', userPermission: 'VIEW_USER' },
  { name: "main.users.change-password", navName: "Change Password", navParent: 'Users', url: "/change-password", templateUrl: 'partials/users/_change_password.html' },
  { name: "main.users.create", navName: "New User", navParent: "Users", url: "/create", templateUrl: 'partials/users/_create_user.html', userPermission: 'CREATE_USER' },
  { name: "main.users.logout", url: "/logout", navName: 'Logout', navParent: 'Users', controller:'LogoutCtrl' },

  // History
  { name: "main.history", url: "/history/{species}/{id}", templateUrl: 'partials/_history.html', userPermission: 'VIEW_EVENTS' },

];

const stateConfigData = [];
const navbar = {
  brand: {title:"Lot Commander", route:"/", state:"main.home"},
  navItems: []
};

// Format state data for registering with ui-router and building navbar data structure
stateData.forEach(function(stateObj){
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

  const _state = {
    name: stateObj.name,
    abstract: stateObj.abstract,
    url: stateObj.url,
    templateUrl: stateObj.templateUrl,
    controller: stateObj.controller
  };

  if( stateObj.optionalParams ) {

    _state.params = {};

    for( let paramName of stateObj.optionalParams ) {

      _state.params[ paramName ] = { squash: true, value: null };

    }

  }

  stateConfigData.push( _state );

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

angular.module('myApp').constant('palletProperties', {
  category: [
    "general merchandise",
    "cosmetics",
    "personal care",
    "clothing"
  ],
  condition: [
    'shelf-pull',
    'salvage',
    'case-packed',
    'customer returns'
  ]
});

import {
  __STANDARD_MANIFEST_PALLET_ID_COLUMN__,
  __STANDARD_MANIFEST_BARCODE_COLUMN__,
  __STANDARD_MANIFEST_QUANTITY_COLUMN__,
  __STANDARD_MANIFEST_DESCRIPTION_COLUMN__,
  __STANDARD_MANIFEST_CATEGORY_COLUMN__,
  __STANDARD_MANIFEST_UNIT_COST_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_COST_COLUMN__,
  __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_COLUMNS__,
  __STANDARD_MANIFEST_DISPLAY_COLUMNS__,
} from '../manifest-constants';
angular.module('myApp').constant( 'StandardManifestColumnsConst', {
  __STANDARD_MANIFEST_PALLET_ID_COLUMN__,
  __STANDARD_MANIFEST_BARCODE_COLUMN__,
  __STANDARD_MANIFEST_QUANTITY_COLUMN__,
  __STANDARD_MANIFEST_DESCRIPTION_COLUMN__,
  __STANDARD_MANIFEST_CATEGORY_COLUMN__,
  __STANDARD_MANIFEST_UNIT_COST_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_COST_COLUMN__,
  __STANDARD_MANIFEST_UNIT_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_RETAIL_PRICE_COLUMN__,
  __STANDARD_MANIFEST_UNIT_SALE_PRICE_COLUMN__,
  __STANDARD_MANIFEST_TOTAL_SALE_PRICE_COLUMN__,
  columns: __STANDARD_MANIFEST_COLUMNS__,
  displayColumns: __STANDARD_MANIFEST_DISPLAY_COLUMNS__,
});

//************************************************************************
//********************* Config Block *************************************
//************************************************************************
angular.module('myApp').config(
  ['$locationProvider', '$stateProvider', '$urlRouterProvider', '$urlMatcherFactoryProvider', 'stateConfigData',
    function($locationProvider, $stateProvider, $urlRouterProvider, $urlMatcherFactoryProvider, stateConfigData) {
      $locationProvider.html5Mode({enabled: true});
      $urlRouterProvider.otherwise('/');
      $urlMatcherFactoryProvider.strictMode(false);

      // register states with $stateProvider

      angular.forEach(stateConfigData, function(state) { $stateProvider.state(state); });
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