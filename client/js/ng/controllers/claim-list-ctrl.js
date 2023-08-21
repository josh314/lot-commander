import angular from 'angular';

import * as util from '../../utilities';

const __PAGE_SIZE__ = 25;

/******************* Claim List Page Controller *************************/
angular.module('myApp').controller('ClaimListCtrl', [

  'LoggedInUser',
  'navigate',
  'sessionTimeout',
  'ClaimsSvc',

  function(

    LoggedInUser,
    navigate,
    sessionTimeout,
    ClaimsSvc

  ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    init();

    function init() {

      const statusOptions = [
        {
          name: 'awaiting review',
          filter: {
            toBeReviewed: true,
            includeClosed: false
          }
        },
        {
          name: 'open',
          filter: {
            includeClosed: false
          }
        },
        {
          name: 'all',
          filter: {
            includeClosed: true
          }
        }
      ];

      Object.assign(
        vm,
        {

          // vars
          showCreateClaimButton: LoggedInUser.hasPermission( 'CREATE_CLAIM' ),
          showShopifyLinks: LoggedInUser.hasPermission( 'VIEW_SHOPIFY_ORDER' ),
          inputs: {
            orderNumber: '',
            ticket: '',
            status: statusOptions[0],
            statusOptions
          },
          claims: [],
          sortOpts: {
            key: 'createdAt',
            ascending: false
          },
          pagination: {
            current: 1,
            totalItems: 0,
            pageSize: __PAGE_SIZE__,
            pageChange: refreshClaimsList
          },

          // modules
          navigate,
          util,

          // methods
          refreshClaimsList: refreshClaimsList,

        }
      );

      refreshClaimsList();

    }

    function getFilterFromInputs() {

      const filter = {};

      if( vm.inputs.orderNumber ) {
        filter.orderNumber = vm.inputs.orderNumber;
      }

      if( vm.inputs.ticket ) {
        filter.ticket = vm.inputs.ticket;
      }

      Object.assign( filter, vm.inputs.status.filter );

      return filter;

    }

    function refreshClaimsList() {

      const baseQueryOptions = {
        filter: getFilterFromInputs(),
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
          vm.claims = claims;
        });

      });

    }

  }
]);
