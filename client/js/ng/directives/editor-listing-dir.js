import angular from 'angular';

/*********************** Rich Text Editor Directives for Listing Body and Title ***********************/
angular.module('myApp').directive('editorListingBodyDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_editor_listing_body.html',
    scope: {
      lot: '=', // two-way binding
      generateOnLoadIfEmpty: '<',
    },
    controllerAs: '$ctrl',
    controller: [ '$scope', 'ListingsSvc', 'ModalSvc', function ( $scope, ListingsSvc, ModalSvc ) {

      const vm = this;
      init();

      function init() {

        Object.assign(
          vm,
          {
            lot: $scope.lot,

            tinymceOptions: {
              setup: function( editor ) {
                editor.ui.registry.addButton('generateListingBodyHtml', {
                  text: "Add Template",
                  onAction: generateListingBodyHtml,
                });
              },
              branding: false,
              promotion: false,
              plugins: [
                'emoticons',
                'link',
                'lists',
              ],
              toolbar: [
                {
                  name: 'history',
                  items: [
                    'undo',
                    'redo',
                  ]
                },
                {
                  name: 'styles',
                  items: [
                    'styles',
                  ]
                },
                {
                  name: 'formatting',
                  items: [
                    'bold',
                    'italic',
                    'strikethrough',
                    'link',
                    'forecolor',
                  ]
                },
                {
                  name: 'lists',
                  items: [
                    'bullist',
                    'numlist',
                  ]
                },
                {
                  name: 'indentation',
                  items: [
                    'outdent',
                    'indent',
                  ]
                },
                {
                  name: 'emoticons',
                  items: [
                    'emoticons',
                  ]
                },
                {
                  name: 'generateListingBodyHtml',
                  items: [
                    'generateListingBodyHtml',
                  ]
                },
              ],
              height: 500,
            },
          }
        );

        if( $scope.generateOnLoadIfEmpty && !vm.lot.listingData.body ) {
          generateListingBodyHtml();
        }

      }

      function generateListingBodyHtml() {

        return ModalSvc.wait({

          waitFor: ListingsSvc.getLotListingBodyTemplate( $scope.lot ).then( bodyHtml => $scope.lot.listingData.body = bodyHtml ),

        });

      }

    }],
  };
});

angular.module('myApp').directive('editorListingTitleDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_editor_listing_title.html',
    scope: {
      lot: '=', // two-way binding
      invalidTitle: '=',
      generateOnLoadIfEmpty: '<',
    },
    controllerAs: '$ctrl',
    controller: [ '$scope', 'ListingsSvc', 'ModalSvc', function ( $scope, ListingsSvc, ModalSvc ) {

      const vm = this;
      init();

      function init() {

        Object.assign(
          vm,
          {

            // Since the reference to the lot won't change, we can just assign it to the controller and changes will be communicated to the parent via two-way binding
            lot: $scope.lot,

            tinymceOptions: {
              setup: function( editor ) {
                editor.ui.registry.addButton('generateListingTitle', {
                  text: "Add Template",
                  onAction: generateListingTitle,
                });
              },
              format: 'text',
              branding: false,
              promotion: false,
              menubar: false,
              statusbar: false,
              toolbar: [
                {
                  name: 'emoticons',
                  items: [
                    'emoticons',
                  ]
                },
                {
                  name: 'generateListingTitle',
                  items: [
                    'generateListingTitle',
                  ]
                },
              ],
              toolbar_location: 'bottom',
              plugins: [
                'emoticons'
              ],
              height: 20,
              resize: false,
            },

            verifyTitle,

          }
        );

        if( $scope.generateOnLoadIfEmpty && !vm.lot.listingData.title ) {
          generateListingTitle();
        }

        verifyTitle();

      }

      function generateListingTitle() {

        // This promise resolves immediately but forces Angular to refresh the model
        return ModalSvc.wait({
          waitFor: Promise.resolve().then( () => {

            vm.lot.listingData.title = ListingsSvc.getLotListingTitleTemplate( vm.lot );

            verifyTitle();

          }),
        });

      }

      function verifyTitle() {

        vm.invalidTitle = false;

        if( vm.lot.listingData.title ) {

          vm.titleTooLong = ListingsSvc.isTitleTooLong( vm.lot.listingData.title );

          if(vm.titleTooLong.bstock && vm.lot.destinationMarketplace==='bstock') {
            // return false;
            vm.invalidTitle = true;
          }

          if(vm.titleTooLong.shopify && vm.lot.destinationMarketplace==='wholesaleninjas') {
            // return false;
            vm.invalidTitle = true;
          }

          vm.titleContainsLineBreaks = vm.lot.listingData.title.includes('\n') | vm.lot.listingData.title.includes('&nbsp;');
          if( vm.titleContainsLineBreaks ) {
            // return false;
            vm.invalidTitle = true;
          }

        }

        // After updating the controller's invalidTitle property, it's necessary to assign it to the $scope so that it is communicated to the parent $scope via two-way binding
        $scope.invalidTitle = vm.invalidTitle;

      }

      vm.verifyTitle = verifyTitle;

    }],
  };
});
