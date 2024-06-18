import angular from 'angular';

/******************* New Lot Controller *************************/
angular.module('myApp').controller( 'NewLotCtrl', [

  'dbEnums',
  'listingBuilder',
  'lotCategories',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',

  function(

    dbEnums,
    listingBuilder,
    lotCategories,
    LotSvc,
    ModalSvc,
    navigate,
    sessionTimeout,

  ) {
    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      const categories =  [ { displayName: 'None' } ].concat( lotCategories );

      Object.assign(
        vm,
        {

          lotTypes: dbEnums.lotType,
          packagingTypes: dbEnums.packagingType,
          categories,
          newLotCategory: categories[0],
          marketplaces: [
            'wholesaleninjas',
            // 'bstock'
          ],
          newLot: {
            unmanifested: false,
            destinationMarketplace: 'wholesaleninjas',
          },
          errors: {},
          willUploadManifest: false,
          openPackagingTypeInfo: ModalSvc.packagingTypeInfo.bind( ModalSvc ),

          setHandleForCategory,
          startQuickLot,
          startCustomLot,
          startLot,
        }
      );

      LotSvc.generateLotNumber().then(({ lotNumber }) => {
        vm.newLot.lotNumber = lotNumber;
        vm.newLot.handle = `lot-${lotNumber}`;
      });

    }


    function buildHandleForPrefix( prefix ) {
      const today = new Date();//fix time zone to EST

      const categoryDatePrefix = `${prefix}-${today.getMonth()+1}-${today.getDate()}-${today.getFullYear()-2000}`;

      return `${categoryDatePrefix}-${ vm.newLot.lotNumber }`;

    }

    function setHandleForCategory() {
      if( vm.newLotCategory.value ) {
        vm.newLot.handle = buildHandleForPrefix( vm.newLotCategory.prefix );
      }
    }

    function startQuickLot(quickLot) {
      buildHandleForPrefix(quickLot.handlePrefix).then(handle=>{
        Object.assign(vm.newLot, {
          handle: handle,
          unmanifested: true,
        });
        Object.assign(vm.newLot, quickLot.template);
        vm.startLot();
      });
    }

    function startCustomLot() {
      vm.errors.noHandleSubmitted = !vm.newLot.handle;
      vm.errors.noLotTypeSubmitted = !vm.newLot.type;
      vm.errors.noPackagingTypeSubmitted = !vm.newLot.packagingType;

      const p = new RegExp(`${vm.newLot.lotNumber}`);

      vm.errors.invalidHandle = !p.test(vm.newLot.handle);

      if ( vm.errors.invalidHandle || vm.errors.noLotTypeSubmitted || vm.errors.noPackagingTypeSubmitted ) {
        return;
      }

      vm.startLot();
    }

    function startLot() {

      const lotToSubmit = Object.assign(
        {
          category: vm.newLotCategory.value
        },
        vm.newLot
      );

      if( !lotToSubmit.listingData ) {
        listingBuilder.buildFromCategory( lotToSubmit );
      }

      // if( !lotToSubmit.listingData ) {
      //   listingBuilder.buildFromCategory( lotToSubmit );
      // }

      LotSvc.create( lotToSubmit ).then( resp => {
        if( resp.error ) {
          console.error( resp );
          ModalSvc.message({ header: 'Error', body: resp.message, type: 'error' });
        }
        else {
          const lot = resp.lot;

          if( lot.unmanifested ) {
            navigate.viewLot( lot._id );
          }
          else {
            if( vm.willUploadManifest ) {
              navigate.uploadLotManifest( lot._id );
            }
            else {
              navigate.scanLot( lot._id );
            }
          }
        }
      });
    }

  }
]);