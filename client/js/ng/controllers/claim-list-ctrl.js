import angular from 'angular';

import * as util from '../../utilities';

const __PAGE_SIZE__ = 25;
const __USER_SETTINGS_SUBKEY__ = 'claim-list-page';

/******************* Claim List Page Controller *************************/
angular.module('myApp').controller('ClaimListCtrl', [

  'LoggedInUser',
  'navigate',
  'sessionTimeout',
  'SettingsSvc',
  'ClaimsSvc',

  function(

    LoggedInUser,
    navigate,
    sessionTimeout,
    SettingsSvc,
    ClaimsSvc

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    init();

    function init() {

      vm.filter = {
        orderNumber: '',
        includeClosed: false,
      };
      vm.claims = [];
      vm.sortOpts = {
        key: 'createdAt',
        ascending: false
      };

      vm.pagination = {
        current: 1,
        totalItems: 0,
        pageSize: __PAGE_SIZE__,
        pageChange: refreshClaimsList
      };

      vm.navigate = navigate;
      vm.util = util;

      vm.refreshClaimsList = refreshClaimsList;

      refreshClaimsList();

    }

    function refreshClaimsList() {

      const baseQueryOptions = {
        filter: vm.filter,
        sort: vm.sortOpts,
      };

      return ClaimsSvc.count( baseQueryOptions ).then( resp => {
        vm.pagination.totalItems = resp.count;

        const pagedQueryOptions = Object.assign(
          baseQueryOptions,
          {
            num: __PAGE_SIZE__,
            page: vm.pagination.current,
          },
        );

        return ClaimsSvc.list( pagedQueryOptions ).then( claims => {
          console.log(claims)
          vm.claims = claims;
        });

      });

    }

  }
]);
