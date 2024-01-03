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
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.quickLots = listingBuilder.quickLotsBoilerplate;

    vm.lotTypes = dbEnums.lotType;
    vm.packagingTypes = dbEnums.packagingType;
    vm.categories = [ { displayName: 'None' } ].concat( lotCategories ),
    vm.newLotCategory = vm.categories[0];
    vm.marketplaces = ['wholesaleninjas', 'bstock'];
    vm.newLot = {
      unmanifested: false,
      destinationMarketplace: 'wholesaleninjas',
    };
    vm.willUploadManifest = false;
    vm.openPackagingTypeInfo = ModalSvc.packagingTypeInfo.bind( ModalSvc );

    vm.setHandleForCategory = setHandleForCategory;
    vm.startQuickLot = startQuickLot;
    vm.startCustomLot = startCustomLot;
    vm.startLot = startLot;

    function buildHandleForPrefix(prefix) {
      const today = new Date();//fix time zone to EST

      const categoryDatePrefix = `${prefix}-${today.getMonth()+1}-${today.getDate()}-${today.getFullYear()-2000}`;

      const filter = {
        handle: categoryDatePrefix
      };

      // TODO: this really just compares against the most recent lots. Might be better off
      // creating a new API endpoint that validates a proposed handle against the existing DB,
      // perhaps using an mongo aggregate function
      return LotSvc.list( { filter } ).then( lots => {
        const handlePattern = new RegExp(`${categoryDatePrefix}-([0-9]+)`);
        const existingLotNumbers = lots.reduce((numbers, lot) => {
          const lotNumberMatch = lot.handle.match(handlePattern);
          if(lotNumberMatch) {
            numbers.add(parseInt(lotNumberMatch[1]));
          }
          return numbers;
        }, new Set());
        let newLotNumber = 1;

        while(existingLotNumbers.has(newLotNumber))
          newLotNumber++;
        return `${categoryDatePrefix}-${newLotNumber}`;
      });
    }

    function setHandleForCategory() {
      if( vm.newLotCategory.value ) {
        buildHandleForPrefix( vm.newLotCategory.prefix ).then(handle => vm.newLot.handle = handle);
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
      vm.noHandleSubmitted = !vm.newLot.handle;
      vm.noLotTypeSubmitted = !vm.newLot.type;
      vm.noPackagingTypeSubmitted = !vm.newLot.packagingType;

      if (vm.noHandleSubmitted || vm.noLotTypeSubmitted || vm.noPackagingTypeSubmitted ) {
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