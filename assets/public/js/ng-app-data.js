(function() {
  'use strict';
  var app = angular.module("myApp");

  var stateData = [
    { name: "main", abstract:true, templateUrl: '/partials/_main.html'},
    { name: "main.home", url: '/', templateUrl: '/partials/_home.html'},
    // states for managing lots
    { name: "main.lots", abstract: true, url: '/lots', templateUrl: '/partials/_container.html' },
    { name: "main.lots.new", navName: 'New Lot', url: '/new', templateUrl: '/partials/_new_lot.html', controller: 'NewLotCtrl'},
    { name: "main.lots.scan", url: '/scan', templateUrl: '/partials/_scan.html', controller: 'ScanCtrl'},
    { name: "main.lots.list", navName: 'List Lots', url: '/list', templateUrl: '/partials/_list_lots.html', controller: 'ListLotsCtrl'},
    { name: "main.lots.view", url: '/view/{lotId}', templateUrl: '/partials/_view_lot.html', controller: 'ViewLotCtrl'},
    { name: "main.lots.submit-listing", url: '/submit-listing', templateUrl: '/partials/_submit_listing.html', controller: 'SubmitListingCtrl'},

    // manifest files
    { name: "main.manifests", abstract: true, navName: 'Manifests', url: '/manifests', templateUrl: '/partials/_container.html' },
    { name: "main.manifests.list", navName: 'List', navParent: 'Manifests', url: '/list', templateUrl: '/partials/_manifest_files_list.html', controller: 'ManifestFilesListCtrl'},
    { name: "main.manifests.upload", navName: 'Upload', navParent: 'Manifests', url: '/3rd-party-manifest-upload', templateUrl: '/partials/_3rd_party_manifest_upload.html', controller: 'Upload3pManifestCtrl'},
    // users
    { name: "main.users", abstract:true, navName: "Users", url: "/users", templateUrl: 'partials/_container.html'},
    { name: "main.users.change-password", navName: "Change Password", navParent: 'Users', url: "/change-password", templateUrl: 'partials/users/_change_password.html', controller:'ChangeUserPasswordCtrl'},
    { name: "main.users.logout", url: "/logout", navName: 'Logout', navParent: 'Users', controller:'LogoutCtrl' },

  ];
 
  var stateConfigData = [];
  var navbar = {
    brand: {title:"Lot Commander", route:"/", state:"main.home"},
    navItems: []
  };

  // Format state data for registering with ui-router and building navbar data structure
  stateData.forEach(function(stateObj){
    stateConfigData.push({ name: stateObj.name, url: stateObj.url, templateUrl: stateObj.templateUrl, controller: stateObj.controller});
    if(stateObj.navParent) {
      parent = navbar.navItems.find(function(elem) { return elem.title == stateObj.navParent; });//must define parent before child
      if(parent.drops === undefined)
        parent.drops = [];
      parent.drops.push({ state: stateObj.name, title: stateObj.navName, userAccess: stateObj.userAccess });
    }
    else if (stateObj.navName) {
      navbar.navItems.push({ state: stateObj.name, title: stateObj.navName, route: stateObj.url, userAccess: stateObj.userAccess });
    }
  });
  app.constant('stateConfigData', stateConfigData);
  app.constant('navbarData', navbar);

  app.constant('bstockConstants', {
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

})();
