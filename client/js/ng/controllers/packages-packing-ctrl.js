import angular from 'angular';

import * as util from '../../utilities';

const __PAGE_SIZE__ = 100;

const __SCAN_ELEMENT_ID__ = 'scanPackageLabelInput';

/******************* Shipment List Page Controller *************************/
angular.module('myApp').controller( 'PackagesPackingCtrl', [

  'AudioAlertSvc',
  'focus',
  'LoggedInUser',
  'ModalSvc',
  'navigate',
  'PackageSvc',
  'sessionTimeout',

  function(

    AudioAlertSvc,
    focus,
    LoggedInUser,
    ModalSvc,
    navigate,
    PackageSvc,
    sessionTimeout,

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    function clearScanInput() {
      vm.scannedLabel = '';
      focus( __SCAN_ELEMENT_ID__ );
    }

    function init() {

      clearScanInput();

      vm.allowShipmentNavigation = LoggedInUser.hasPermission('VIEW_INCOMING_SHIPMENT');

      vm.pagination = {
        current: 1,
        totalItems: 0,
        pageSize: __PAGE_SIZE__,
        pageChange: refreshRecentPackagesList,
        maxSize: 8
      };

      vm.filter = {
        populateShipment: true,
      };

      vm.sortOpts = {
        key: 'instantiatedDate',
        ascending: false
      };

      vm.scanLabel = scanLabel;

      vm.prettifyDateTime = util.prettifyDateTime;

      refreshRecentPackagesList();
    }

    function refreshRecentPackagesList() {

      const baseQueryOptions = {
        filter: vm.filter,
        sort: vm.sortOpts,
      };

      return PackageSvc.count( baseQueryOptions ).then( count  => {
        vm.pagination.totalItems = count;

        const pagedQueryOptions = Object.assign(
          baseQueryOptions,
          {
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          },
        );

        return PackageSvc.list( pagedQueryOptions ).then( packages => {
          vm.packages = packages;
        });

      });

    }

    async function scanLabel() {

      if( vm.scannedLabel ) {

        const existingPackage = await PackageSvc.get( vm.scannedLabel );

        if( !existingPackage ) {

          AudioAlertSvc.fail();
          await ModalSvc.message( { header: 'Invalid', type: 'error', body: `This is an invalid label. Please try another.` } );

          return clearScanInput();

        }

        if( existingPackage.isInstantiated ) {

          AudioAlertSvc.warning();
          await ModalSvc.message( { header: 'Already exists', type: 'error', body: `A package with ID ${vm.scannedLabel} already exists.` } );

          return clearScanInput();

        }

        await PackageSvc.instantiate( vm.scannedLabel );

        AudioAlertSvc.success();
        navigate.reload();

      }

    }

    init();

  }
]);