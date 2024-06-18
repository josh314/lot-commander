import angular from 'angular';

/****************** Edit Lot Modal Controller ***********************/
angular.module('myApp').controller( 'EditLotModalCtrl', [

  'CounterSvc',
  'dbEnums',
  'LoggedInUser',
  'lot',
  'LotSvc',
  'palletProperties',
  'ModalSvc',
  'ShippingItemsSvc',

  function(

    CounterSvc,
    dbEnums,
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
          marketplaces: [undefined].concat( dbEnums.marketplaces ),
          openPackagingTypeInfo: ModalSvc.packagingTypeInfo.bind( ModalSvc ),
          invalidTitle: false,

          allowEditPricingData: LoggedInUser.hasPermission( 'EDIT_PRICING_DATA' ) && lot.unmanifested,

          invalidLot,
          invalidHandle,
          editShippingItemsCb,
          generateLotNumber

        }
      );

      console.log('vm.lot', vm.lot);

      ShippingItemsSvc.setPackagingTypeFromShippingItems( vm.lot );

    }

    function invalidLot() {
      return invalidHandle() || vm.invalidTitle || vm.lot.numBoxes < 0;
    }

    function editShippingItemsCb( shippingItems ) {

      if(shippingItems) {
        vm.lot.shippingItems = shippingItems;
        ShippingItemsSvc.setPackagingTypeFromShippingItems( vm.lot );
      }

    }

    function generateLotNumber() {
      return CounterSvc.incrementPalletLotCounter().then( counter => {
        vm.lot.lotNumber = counter.count;
      } );
    }

    function invalidHandle() {

      const p = new RegExp(`${vm.lot.lotNumber}`);

      return !p.test(vm.lot.handle);

    }


  }
]);