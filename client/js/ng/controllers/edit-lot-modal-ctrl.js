import angular from 'angular';

/****************** Edit Lot Modal Controller ***********************/
angular.module('myApp').controller( 'EditLotModalCtrl', [

  'CounterSvc',
  'dbEnums',
  'ListingsSvc',
  'LoggedInUser',
  'lot',
  'LotSvc',
  'palletProperties',
  'ModalSvc',
  'ShippingItemsSvc',

  function(

    CounterSvc,
    dbEnums,
    ListingsSvc,
    LoggedInUser,
    lot,
    LotSvc,
    palletProperties,
    ModalSvc,
    ShippingItemsSvc

  ){

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          lot: LotSvc.hydrateLot( lot ),
          lotStatusEnum: dbEnums.lotStatus,
          lotCategoryOptions: [''].concat(palletProperties.category),
          lotTypeEnum: dbEnums.lotType,
          packagingTypeEnum: dbEnums.packagingType,
          // selectedListing: 'bstock',
          marketplaces: [undefined].concat( dbEnums.marketplaces ),
          openPackagingTypeInfo: ModalSvc.packagingTypeInfo.bind( ModalSvc ),
          titleTooLong: {},


          tinymceOptions: {
            listingData: {
              title: {
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
                ],
                toolbar_location: 'bottom',
                plugins: [
                  'emoticons'
                ],
                height: 20,
                resize: false,
              },
              body: {
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
          },

          allowEditPricingData: LoggedInUser.hasPermission( 'EDIT_PRICING_DATA' ) && lot.unmanifested,


          verifyTitle,
          invalidLot,
          editShippingItemsCb,
          generateListingBodyHtml,
          generateLotNumber

        }
      );

      console.log('vm.lot', vm.lot);

      ShippingItemsSvc.setPackagingTypeFromShippingItems( vm.lot );

    }

    function verifyTitle() {
      vm.titleTooLong = ListingsSvc.isTitleTooLong( vm.lot.listingData.title );

      if(vm.titleTooLong.bstock && vm.lot.destinationMarketplace==='bstock') {
        return false;
      }

      if(vm.titleTooLong.shopify && vm.lot.destinationMarketplace==='wholesaleninjas') {
        return false;
      }

      vm.titleContainsLineBreaks = vm.lot.listingData.title.includes('\n') | vm.lot.listingData.title.includes('&nbsp;');
      if( vm.titleContainsLineBreaks ) {
        return false;
      }

      return true;

    }

    function invalidLot() {
      return !vm.verifyTitle() || vm.lot.numBoxes < 0;
    }

    function editShippingItemsCb( shippingItems ) {

      if(shippingItems) {
        vm.lot.shippingItems = shippingItems;
        ShippingItemsSvc.setPackagingTypeFromShippingItems( vm.lot );
      }

    }

    function generateListingBodyHtml() {

      const {
        category,
        type,
        totalUnits,
        estimatedRetailValue,
        unmanifested,
        manifestFileLocation
      } = vm.lot;

      const loadManifestP = manifestFileLocation ? LotSvc.loadManifestFile( vm.lot._id ) : Promise.resolve( undefined );

      return ModalSvc.wait({

        waitFor: loadManifestP.then( manifest => {

          const bodyHtml = ListingsSvc.getLotListingBodyTemplate( {
            category,
            condition: type,
            totalUnits,
            estimatedRetailValue: estimatedRetailValue || vm.lot.getEstimatedRetailValue(),
            mostExpensiveItemPrice: manifest && manifest.mostExpensiveItemPrice(),
            isManifested: !unmanifested
          } );

          vm.lot.listingData.body = bodyHtml;

        })

      });

    }

    function generateLotNumber() {
      return CounterSvc.incrementPalletLotCounter().then( counter => {
        vm.lot.lotNumber = counter.count;
      } );
    }


  }
]);