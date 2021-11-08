import angular from 'angular';

class DisplayRate {
  constructor( { gid, name, rate } ) {
    this.gid = gid;
    this.name = name;
    this.rate = rate;
    this.displayValue = rate || '';
  }

  isDirty() {
    return this.displayValue !== (this.rate || '');
  }

  revert() {
    this.displayValue = this.rate || '';
  }

  titleMatches( s ) {

    if( s ) {
      return this.name.match( new RegExp( s, 'i') );
    }
    else {
      return true;
    }

  }
}

/******************* Store Shippinbg Rates Controller *************************/
angular.module('myApp').controller('StoreShippingRatesCtrl', [ 'focus', 'ListingsSvc', 'sessionTimeout',
  function( focus, ListingsSvc, sessionTimeout ) {

    sessionTimeout.timeoutExpired();

    const vm = this;

    function refreshRates() {

      const qp = {
        includePallets: vm.filter.includePallets,
      };

      vm.waitingForResponse = true;
      return ListingsSvc.listShippingRates( qp ).then( rates => {

        vm.allDisplayRates = rates.map( _r => new DisplayRate( _r ) );
        refreshVisibleDisplayRates( );
        vm.waitingForResponse = false;

      });

    }

    function refreshVisibleDisplayRates() {
      vm.visibleDisplayRates = vm.allDisplayRates.filter( _dr => _dr.titleMatches( vm.filter.productName ) );
    }

    function saveRate( gid ) {

      const idx = vm.allDisplayRates.findIndex( _r => _r.gid === gid );

      if( idx >= 0 ) {

        const oldRate = vm.allDisplayRates[idx];

        ListingsSvc.editShippingRate( gid, oldRate.displayValue ).then( _rate => {

          vm.allDisplayRates.splice( idx, 1, new DisplayRate( { gid: oldRate.gid, name: oldRate.name, rate: _rate.rate } ) );
          refreshVisibleDisplayRates();

        } );

        return true;
      }

    }

    function revertRate( displayRate ) {
      displayRate.revert();
    }

    function focusOnRate( index ) {
      focus(`rate-input-${index}`);
    }

    function init() {

      vm.waitingForResponse = false;
      vm.allDisplayRates =[];
      vm.visibleDisplayRates = [];
      vm.filter = {
        includePallets: false,
        productName: ''
      };
      vm.refreshRates = refreshRates;
      vm.refreshVisibleDisplayRates = refreshVisibleDisplayRates;
      vm.saveRate = saveRate;
      vm.revertRate = revertRate;
      vm.focusOnRate = focusOnRate;

      refreshRates().then( _ => focusOnRate('0') );

    }
    init();

  }
]);