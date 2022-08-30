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
angular.module('myApp').controller('StoreShippingRatesCtrl', [ 'focus', 'ListingsSvc', 'ModalSvc', 'sessionTimeout',
  function( focus, ListingsSvc, ModalSvc, sessionTimeout ) {

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

          const isConfirmed = await ModalSvc.confirm({
            header: 'Reset rate?',
            html: '<p>This will set the shipping rate to default values: $180 for pallets and $30/box for boxed lots.</p><p>Continue?</p>',
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