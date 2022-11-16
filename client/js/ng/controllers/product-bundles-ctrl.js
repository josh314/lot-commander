import angular from 'angular';

// Helpers

const cmpByTitle = (a,b) => {
  if( !a || !a.title ) {
    return -1;
  }
  else if ( !b || !b.title ) {
    return +1;
  }
  else if ( a.title <= b.title ) {
    return -1;
  }
  else if ( b.title < b.title ) {
    return +1;
  }
};

//******************** Product Bundles page controller */
angular.module('myApp').controller( 'ProductBundlesCtrl', [

  'ListingsSvc',
  'ModalSvc',
  'ProductBundlesSvc',
  'sessionTimeout',

  function(

    ListingsSvc,
    ModalSvc,
    ProductBundlesSvc,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      vm.showProductInChooserForProductBundleEditItem = showProductInChooserForProductBundleEditItem;

      vm.openProductBundleEdit = openProductBundleEdit;
      vm.cancelProductBundleEdit = cancelProductBundleEdit;
      vm.addProductBundleEditItem = addProductBundleEditItem;
      vm.removeProductBundleEditItem = removeProductBundleEditItem;
      vm.saveProductBundleEdit = saveProductBundleEdit;
      vm.validateProductBundleEdit = validateProductBundleEdit;

      const p = setProductList().then( refreshBundlesList );

      ModalSvc.wait( {
        waitFor: p
      } );
    }

    function refreshBundlesList() {
      return ProductBundlesSvc.list()
        .then( bundles => {

          const displayBundles = bundles.map( _bundle => {
            const res = Object.assign( {}, _bundle );

            res.bundle = _bundle.bundle.map( _ => {
              return {
                units: _.units,
                product: vm.products.find( _product => _product.gid === _.gid )
              };
            });

            res.totalUnits = res.bundle.reduce( ( _total, _bundle ) => _total += _bundle && angular.isNumber( _bundle.units ) ? _bundle.units : 0, 0 );

            return res;
          } );

          displayBundles.forEach( resetProductBundleEdit );
          vm.productBundles = displayBundles;
          console.log( displayBundles );
        });
    }

    function setProductList() {
      return ListingsSvc
        .listActiveProducts( { everydayBargainsOnly: true} )
        .then( resp => { 

          const productsForBundling = resp.products.filter( _ => !_.tags.includes( 'bundle' ) );

          vm.products = productsForBundling.sort( cmpByTitle );
          return productsForBundling;
        });
    }

    function openProductBundleEdit( productBundle ) {

      productBundle.isEditing = true;

    }

    function resetProductBundleEdit( productBundle ) {

      productBundle.editBundle = productBundle.bundle.map( _ => Object.assign( {}, { units: _.units, product: _.product } ));
      productBundle.isEditing = false;

    }

    function cancelProductBundleEdit( productBundle ) {

      resetProductBundleEdit( productBundle );

    }

    function saveProductBundleEdit( productBundle ) {

      if( !validateProductBundleEdit( productBundle ) ) {
        ModalSvc.message({ header: 'Error', body: 'Invalid values', type: 'error' });
        return;
      }

      if( editProductBundleNoChange( productBundle ) ) {
        resetProductBundleEdit( productBundle );
        return;
      }

      const bundleToSave = productBundle.editBundle.map( _ => ({ gid: _.product.gid, title: _.product.title, units: _.units }) );

      const p = ProductBundlesSvc.set( productBundle.gid, bundleToSave )
        .then( _ => resetProductBundleEdit( productBundle ) )
        .then( refreshBundlesList );

      ModalSvc.wait( { waitFor: p } );

    }

    function addProductBundleEditItem( productBundle ) {
      productBundle.editBundle.push( {  } );
    }

    function removeProductBundleEditItem( productBundle, bundleItemIdx ) {
      return productBundle.editBundle.splice( bundleItemIdx, 1 );
    }

    function editProductBundleNoChange( productBundle ) {
      if( productBundle.bundle.length !== productBundle.editBundle.length ) {
        return false;
      }

      for( let i=0; i< productBundle.editBundle.length; i++ ) {

        const originalItem = productBundle.bundle[i];
        const newItem = productBundle.editBundle[i];

        if( originalItem.product !== newItem.product ) {
          return false;
        }

        if( originalItem.units !== newItem.units ) {
          return false;
        }

      }

      return true;
    }

    function validateProductBundleEdit( productBundle ) {

      if( productBundle.isEditing && productBundle.editBundle ) {

        const anyUnitsNonPositive = productBundle.editBundle.some( _ => !_.units || _.units <= 0 );
        if( anyUnitsNonPositive ) {
          return false;
        }

        const hasBlankProduct = productBundle.editBundle.some( _ => !_.product );
        if( hasBlankProduct ) {
          return false;
        }

      }

      return true;
    }

    function showProductInChooserForProductBundleEditItem( product, productBundle, editItem ) {

      if( editItem.product === product ) {
        return true;
      }

      if( product.tags.includes( 'bundle' ) ) {
        return false;
      }

      if( productBundle.editBundle.find( _ => _.product && _.product.gid === product.gid ) ) {
        return false;
      }

      return true;
    }

  }

]);