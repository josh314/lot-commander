import angular from 'angular';

const __PAGE_SIZE__ = 25;

/******************* Lot List Page Controller *************************/
angular.module('myApp').controller('ListLotsCtrl', [

  'dbEnums',
  'LotSvc',
  'navigate',
  'sessionTimeout',

  function(

    dbEnums,
    LotSvc,
    navigate,
    sessionTimeout

  ) {

    const vm = this;
    init();


    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {

          pagination: {
            current: 1,
            totalItems: 0,
            pageSize: __PAGE_SIZE__,
            pageChange: refreshLotsList,
            maxSize: 5
          },

          // list options
          filter: {
            status: 'All',
            handle: '',
            lotNumber: '',
          },
          sortOpts: {
            key: 'createdAt',
            ascending: false
          },

          lots: [],
          statusOptions: dbEnums.lotStatus,
          marketplaces: [undefined].concat(dbEnums.marketplaces),

          saveLotMarketplace,
          scanItems,
          refreshLotsList,
          viewLot,

        }
      );


      // loadUserSettings();
      refreshLotsList();
    }

    function refreshLotsList() {

      let p;

      if( vm.filter._id ) {

        p = LotSvc.get( vm.filter._id ).then( lot => {

          vm.pagination.totalItems = 0;

          const lots = [];
          if( lot ) {
            vm.pagination.totalItems += 1;
            lots.push( lot );
          }

          return lots;
        } );

      }
      else {

        const filter = {
          status: vm.filter.status==='All' ? undefined : vm.filter.status,
          handle: vm.filter.handle,
          lotNumber: vm.filter.lotNumber
        };

        p = LotSvc.count( filter ).then( resp => {
          vm.pagination.totalItems = resp.count;

          const pagedQueryOptions = {
            filter,
            sort: vm.sortOpts,
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          };

          return LotSvc.list( pagedQueryOptions );

        });

      }

      p.then( lots => {

        lots.forEach( lot =>{
          lot.readableUpdatedAt = (new Date(lot.updatedAt)).toLocaleString();
          lot.readableCreatedAt = (new Date(lot.createdAt)).toLocaleString();
        });

        vm.lots = lots;
      });

    }

    function scanItems( lotId ) {
      navigate.scanLot( lotId );
    }

    function viewLot( lotId ) {
      navigate.viewLot( lotId );
    }

    function saveLotMarketplace( lot ) {console.log(lot);
      return LotSvc.edit( lot._id, { destinationMarketplace: lot.destinationMarketplace } );
    }

  }
]);
