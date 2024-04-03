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
      invalidBody: '=?',
    },
    controllerAs: '$ctrl',
    controller: [ '$scope', 'ListingsSvc', 'ModalSvc', function ( $scope, ListingsSvc, ModalSvc ) {

      const vm = this;
      init();

      function init() {

        $scope.dirty = false;

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

        const p = $scope.generateOnLoadIfEmpty && !vm.lot.listingData.body ? generateListingBodyHtml() : Promise.resolve();

        p.then( verifyBody );

      }

      function generateListingBodyHtml() {

        return ModalSvc.wait({

          waitFor: ListingsSvc.getLotListingBodyTemplate( $scope.lot ).then( bodyHtml => $scope.lot.listingData.body = bodyHtml ),

          message: 'Generating Listing Body...',

        });

      }

      function verifyBody() {

        vm.invalidBody = false;

        if( $scope.originalBody !== vm.lot.listingData.body ) {
          $scope.dirty = true;
        }

        if( vm.lot.listingData.body ) {

          vm.bodyEmpty = false;

        }
        else if ( $scope.dirty ) {
          vm.bodyEmpty = true;
          vm.invalidBody = true;
        }

        // After updating the controller's invalidBody property, it's necessary to assign it to the $scope so that it is communicated to the parent $scope via two-way binding
        $scope.invalidBody = vm.invalidBody;

      }

      vm.verifyBody = verifyBody;


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

        $scope.dirty = false;
        $scope.originalTitle = $scope.lot.listingData.title;

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

        if( $scope.originalTitle !== vm.lot.listingData.title ) {
          $scope.dirty = true;
        }

        if( vm.lot.listingData.title ) {

          vm.titleEmpty = false;

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
        else if ( $scope.dirty ) {
          vm.titleEmpty = true;
          vm.invalidTitle = true;
        }

        // After updating the controller's invalidTitle property, it's necessary to assign it to the $scope so that it is communicated to the parent $scope via two-way binding
        $scope.invalidTitle = vm.invalidTitle;

      }

      vm.verifyTitle = verifyTitle;

    }],
  };
});
