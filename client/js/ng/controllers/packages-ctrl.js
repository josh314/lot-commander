import angular from 'angular';

import * as util from '../../utilities';

const __PAGE_SIZE__ = 100;

const __INSTANTIATE_PACKAGE_BARCODE_INPUT__ = 'instantiatePackageBarcodeInput';
const __USER_SETTINGS_SUBKEY__ = 'packages-page';

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller( 'PackagesCtrl', [

  'AudioAlertSvc',
  'dbEnums',
  'focus',
  'LocalUserSettingsSvc',
  'LoggedInUser',
  'ModalSvc',
  'navigate',
  'PackageSvc',
  'PrintSvc',
  'sessionTimeout',

  function(

    AudioAlertSvc,
    dbEnums,
    focus,
    LocalUserSettingsSvc,
    LoggedInUser,
    ModalSvc,
    navigate,
    PackageSvc,
    PrintSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    function clearInstantiatePackageInput() {
      vm.packageBarcodeToInstantiate = '';
      focus( __INSTANTIATE_PACKAGE_BARCODE_INPUT__ );
    }

    function init() {

      Object.assign(
        vm,
        {

          allowShipmentNavigation: LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT'),

          pagination: {
            current: 1,
            totalItems: 0,
            pageSize: __PAGE_SIZE__,
            pageChange: refreshPackagesList,
            maxSize: 8
          },

          categoryOptions: [
            '',
            'general merchandise',
            'cosmetics',
            'personal care',
            'personal care w/ cosmetics',
            'clothing'
          ],
          conditionOptions: dbEnums.lotType,

          filter: {
            populateShipment: true,
            isInstantiated: null,
            isFulfilled: false,
            productUnits: null
          },

          sortOpts: {
            key: 'instantiatedDate',
            ascending: false
          },

          columns: PackageSvc.getListColumns(),
          showColumnOptions: false,
          toggleShowColumnOptions: () => vm.showColumnOptions = !vm.showColumnOptions,
          toggleColumnActive: toggleColumnActive,
          sortListBy: sortListBy,

          printLabels,
          refreshPackagesList,
          prettifyDateTime: util.prettifyDateTime,
          instantiatePackage,
          packageBarcodeSearch,
        }
      );


      const p = PackageSvc.getProductUnitsPackageOptions().then( packageOptions => {

        vm.productUnitsPackageOptions = packageOptions;
        vm.productUnits = packageOptions[0];

      });

      ModalSvc.wait( {
        waitFor: p,
      } );


      loadUserSettings();
      clearInstantiatePackageInput();
      refreshPackagesList();
    }


    function toggleColumnActive( columnKey ) {

      vm.columns[ columnKey ].active = !vm.columns[ columnKey ].active;

      saveUserSettings();

    }

    function saveUserSettings() {

      const activeColumns = [];
      for( let column in vm.columns ) {

        if( vm.columns[ column ].active ) {
          activeColumns.push( column );
        }

      }

      const userSettings = LocalUserSettingsSvc.get( __USER_SETTINGS_SUBKEY__ );

      LocalUserSettingsSvc.save(
        __USER_SETTINGS_SUBKEY__,
        userSettings ? Object.assign( userSettings, { activeColumns: activeColumns } ) : { activeColumns: activeColumns }
      );

    }

    function loadUserSettings() {
      const userSettings = LocalUserSettingsSvc.get( __USER_SETTINGS_SUBKEY__ );

      if( userSettings ) {

        if( userSettings.activeColumns ) {

          for ( let [ columnName, columnData ] of Object.entries(vm.columns) ) {

            columnData.active = userSettings.activeColumns.includes( columnName );

          }

        }

      }

    }

    function sortListBy( sortKey ) {

      if( vm.columns[sortKey].noSort ) {
        return;
      }

      if( sortKey === vm.sortOpts.key ) {
        vm.sortOpts.ascending = !vm.sortOpts.ascending;
      }
      else {
        vm.sortOpts = {
          key: sortKey,
          ascending: !!vm.columns[ sortKey ].defaultSortAscending
        };
      }

      vm.pagination.current = 1;

      refreshPackagesList();
    }

    function packageBarcodeSearch() {

      if( vm.packageBarcodeToSearch ) {

        PackageSvc.get( vm.packageBarcodeToSearch, { populate: [ 'shipment' ] } ).then( pkg => {

          if( pkg ) {

            vm.packages = [ pkg ];

          }
          else {
            ModalSvc.message( { header: 'Invalid', type: 'error', body: `This is an invalid label. Please try another.` } );
            vm.packageBarcodeToSearch = '';
          }

        });

      }
      else {
        refreshPackagesList();
      }

    }


    function refreshPackagesList() {

      if( vm.filter.productUnits ) {
        vm.filter.category = null;
        vm.filter.condition = null;
        vm.filter.units = vm.filter.productUnits.units;
      }

      return PackageSvc.count( vm.filter ).then( count  => {
        vm.pagination.totalItems = count;

        const query = {
          filter: vm.filter,
          sort: vm.sortOpts,
          num: __PAGE_SIZE__,
          page: vm.pagination.current,
        };

        return PackageSvc.list( query ).then( packages => {
          vm.packages = packages;
        });

      });

    }

    async function instantiatePackage() {

      if( vm.packageBarcodeToInstantiate ) {

        const existingPackage = await PackageSvc.get( vm.packageBarcodeToInstantiate );

        if( !existingPackage ) {

          AudioAlertSvc.fail();
          await ModalSvc.message( { header: 'Invalid', type: 'error', body: `This is an invalid label. Please try another.` } );

          return clearInstantiatePackageInput();

        }

        if( existingPackage.isInstantiated ) {

          AudioAlertSvc.warning();
          await ModalSvc.message( { header: 'Already exists', type: 'error', body: `A package with ID ${vm.packageBarcodeToInstantiate} already exists.` } );

          return clearInstantiatePackageInput();

        }

        await PackageSvc.instantiate( vm.packageBarcodeToInstantiate );

        AudioAlertSvc.success();
        navigate.reload();

      }

    }


    function printLabels() {

      ModalSvc.packageLabelData(  ).then(
        ( {
          productId,
          productTitle,
          category,
          condition,
          units,
          numPackage,
          instantiate
        } ) => {

          const packageData = {
            productId,
            productTitle,
            category,
            condition,
            units,
          };

          PackageSvc.createDuplicatePackages( packageData, numPackage, instantiate ).then( resp => {

            const packageIds = resp.packages.map( pkg => pkg._id );

            PrintSvc.printPackageLabels( packageIds );

          }).then( refreshPackagesList );

        }
      );

    }

    init();

  }
]);