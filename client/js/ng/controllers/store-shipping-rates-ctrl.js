import angular from 'angular';

class DisplayRate {
  constructor( { gid, name, rate } ) {
    this.gid = gid;
    this.name = name;
    this.rate = rate;
    this.displayValue = typeof rate === 'number' ? this.rate : '';
  }

  isDirty() {
    return (this.displayValue !== this.rate) && (this.displayValue !== '');
  }

  clear() {
    this.displayValue = this.rate || '';
  }

  titleMatches( s ) {

    if( s && this.name ) {
      return this.name.match( new RegExp( s, 'i') );
    }
    else {
      return true;
    }

  }
}

/******************* Store Shippinbg Rates Controller *************************/
angular.module('myApp').controller('StoreShippingRatesCtrl', [ '$scope', 'focus', 'ListingsSvc', 'ModalSvc', 'sessionTimeout',
  function( $scope, focus, ListingsSvc, ModalSvc, sessionTimeout ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    function refreshDefaultRates() {

      vm.waiting.defaultRates = true;

      return Promise.all( [
        refreshDefaultBoxRate(),
        refreshPalletBreakdownServiceRate(),
      ] ).then( rates => {

        vm.defaultDisplayRates = rates;
        vm.waiting.defaultRates = false;

        $scope.$apply();
      });

    }

    function refreshRates() {
      refreshListingRates();
      if( vm.filter.packageType === 'pallets' ) {
        refreshPalletBreakdownServiceRate();
      }
    }

    function refreshListingRates() {

      const qp = {
        includePallets: vm.filter.packageType === 'pallets',
      };

      vm.waiting.listingRates = true;
      return ListingsSvc.listShippingRates( qp ).then( rates => {

        vm.allDisplayRates = rates.map( _r => new DisplayRate( _r ) );
        refreshVisibleDisplayRates( );
        vm.waiting.listingRates = false;

      });

    }

    function refreshDefaultBoxRate() {

      return ListingsSvc.getDefaultBoxRate().then( _rate => {

        vm.defaultBoxRateDisplayRate = new DisplayRate( {name: 'Individual box rate', rate: _rate.rate } );

        return vm.defaultBoxRateDisplayRate;
      });
    }

    function refreshPalletBreakdownServiceRate() {

      return ListingsSvc.getPalletBreakdownServiceRate().then( _rate => {

        vm.palletBreakdownServiceDisplayRate = new DisplayRate( { name: 'Pallet breakdown service', rate: _rate.rate } );

        return vm.palletBreakdownServiceDisplayRate;
      });
    }

    function refreshVisibleDisplayRates() {
      vm.visibleDisplayRates = vm.allDisplayRates.filter( _dr => _dr.titleMatches( vm.filter.productName ) );
    }

    function saveRate( gid, index ) {
      // This extra redirection step forces the AngularJS digest cycle even though __saveRate__ is an async function
      return __saveRate__( gid, index );
    }

    async function __saveRate__( gid, index ) {

      const idx = vm.allDisplayRates.findIndex( _r => _r.gid === gid );

      if( idx >= 0 ) {

        const oldRate = vm.allDisplayRates[idx];

        let p;
        if( angular.isDefined(oldRate.displayValue) && oldRate.displayValue !== null && oldRate.displayValue >= 0 ) {

          p = ListingsSvc.editShippingRate( gid, oldRate.displayValue );

        }
        else {

          const defaultValueStr = vm.filter.packageType === 'pallets' ?
            `$${ vm.palletBreakdownServiceDisplayRate.displayValue } for Pallet Breakdown Service` :
            `$${ vm.defaultBoxRateDisplayRate.displayValue }/box for boxed lots`;

          const isConfirmed = await ModalSvc.confirm({
            header: 'Reset rate?',
            html: `<p>This will set the shipping rate to default values: ${ defaultValueStr }.</p><p>Continue?</p>`,
          });

          if( !isConfirmed ) {
            return;
          }

          p = ListingsSvc.removeShippingRate( gid ).then( _ => ({ rate: null }) );

        }

        return p.then( _rate => {

          const newRate = new DisplayRate( { gid: oldRate.gid, name: oldRate.name, rate: _rate.rate } );

          vm.allDisplayRates.splice( idx, 1, newRate );
          refreshVisibleDisplayRates();

          if( index ) {
            focusOnRate( index + 1 );
          }

        } );

      }

    }

    function saveDefaultBoxRate( ) {
      if( !vm.palletBreakdownServiceDisplayRate.displayValue ) {
        return ModalSvc.message( {
          header: 'Invalid rate',
          html: '<p>Please enter a valid rate before saving.</p>'
        } );
      }
      ListingsSvc.setDefaultBoxRate( vm.defaultBoxRateDisplayRate.displayValue ).then( _rate => {
        vm.defaultBoxRateDisplayRate = new DisplayRate( { name: 'Individual box rate', rate: _rate.rate } );
      } );
    }

    function savePalletBreakdownServiceRate( ) {
      if( !vm.palletBreakdownServiceDisplayRate.displayValue ) {
        return ModalSvc.message( {
          header: 'Invalid rate',
          html: '<p>Please enter a valid rate before saving.</p>'
        } );
      }
      ListingsSvc.setPalletBreakdownServiceRate( vm.palletBreakdownServiceDisplayRate.displayValue ).then( _rate => {
        vm.palletBreakdownServiceDisplayRate = new DisplayRate( { name: 'Pallet breakdown service', rate: _rate.rate } );
      } );
    }

    function clearRate( displayRate ) {
      displayRate.clear();
    }

    function focusOnRate( index ) {
      focus(`rate-input-${index}`);
    }

    function init() {

      Object.assign(
        vm,
        {
          waiting: {
            defaultRates: false,
            listingRates: false,
            palletRate: false,
          },
          defaultDisplayRates: [],
          allDisplayRates: [],
          visibleDisplayRates: [],
          filter: {
            // includePallets: false,
            packageType: null,
            productName: ''
          },
          refreshRates: refreshRates,
          refreshVisibleDisplayRates: refreshVisibleDisplayRates,
          saveRate: saveRate,
          clearRate: clearRate,
          focusOnRate: focusOnRate,

          saveDefaultBoxRate: saveDefaultBoxRate,
          savePalletBreakdownServiceRate: savePalletBreakdownServiceRate,

        }
      );


      refreshDefaultRates();


    }
    init();

  }
]);