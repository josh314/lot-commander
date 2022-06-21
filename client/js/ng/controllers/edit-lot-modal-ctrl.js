import angular from 'angular';

/****************** Edit Lot Modal Controller ***********************/
angular.module('myApp').controller( 'EditLotModalCtrl', [

  'dbEnums',
  'ListingsSvc',
  'lot',
  'palletProperties',
  'ModalSvc',

  function(

    dbEnums,
    ListingsSvc,
    lot,
    palletProperties,
    ModalSvc,

  ){

    const vm = this;

    // VM data
    vm.lot = JSON.parse( JSON.stringify( lot ) );// deep clone of lot so edits are emphemeral before save
    vm.lotStatusEnum = dbEnums.lotStatus;
    vm.lotCategoryOptions = [''].concat(palletProperties.category);
    vm.lotTypeEnum = dbEnums.lotType;
    vm.packagingTypeEnum = dbEnums.packagingType;
    // vm.selectedListing = 'bstock';
    vm.marketplaces = [undefined].concat( dbEnums.marketplaces );
    vm.openPackagingTypeInfo = ModalSvc.packagingTypeInfo.bind( ModalSvc );
    vm.titleTooLong = {};

    // VM methods
    vm.verifyTitle = verifyTitle;
    vm.invalidLot = invalidLot;
    vm.editShippingItems = editShippingItems;

    function verifyTitle() {
      vm.titleTooLong = ListingsSvc.isTitleTooLong( vm.lot.listingData.title );

      if(vm.titleTooLong.bstock && vm.lot.destinationMarketplace==='bstock') {
        return false;
      }

      if(vm.titleTooLong.shopify && vm.lot.destinationMarketplace==='wholesaleninjas') {
        return false;
      }

      return true;

    }

    function invalidLot() {
      return !vm.verifyTitle() || vm.lot.numBoxes < 0;
    }

    function editShippingItems() {

      ModalSvc.shippingItems()
        .then(shippingItems => {
          if(shippingItems) {
            vm.lot.shippingItems = shippingItems;
          }
        });
        
    }

  }
]);