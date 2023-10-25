import angular from 'angular';

/****************** Edit Lot Modal Controller ***********************/
angular.module('myApp').controller( 'EditLotModalCtrl', [

  'dbEnums',
  'ListingsSvc',
  'LoggedInUser',
  'lot',
  'palletProperties',
  'ModalSvc',

  function(

    dbEnums,
    ListingsSvc,
    LoggedInUser,
    lot,
    palletProperties,
    ModalSvc,

  ){

    const vm = this;

    // VM data
    vm.lot = JSON.parse( JSON.stringify( lot ) );// deep clone of lot so edits are ephemeral before save
    vm.lotStatusEnum = dbEnums.lotStatus;
    vm.lotCategoryOptions = [''].concat(palletProperties.category);
    vm.lotTypeEnum = dbEnums.lotType;
    vm.packagingTypeEnum = dbEnums.packagingType;
    // vm.selectedListing = 'bstock';
    vm.marketplaces = [undefined].concat( dbEnums.marketplaces );
    vm.openPackagingTypeInfo = ModalSvc.packagingTypeInfo.bind( ModalSvc );
    vm.titleTooLong = {};


    vm.allowEditPricingData = LoggedInUser.hasPermission( 'EDIT_PRICING_DATA' ) || !vm.lot.estimatedRetailValue;

    vm.tinymceOptions = {
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
          ]
        },
      }
    }



    // VM methods
    vm.verifyTitle = verifyTitle;
    vm.invalidLot = invalidLot;
    vm.editShippingItemsCb = editShippingItemsCb;

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
      }

    }

  }
]);