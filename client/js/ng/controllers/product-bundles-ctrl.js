import angular from 'angular';

import * as util from '../../utilities';

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
  'navigate',
  'ProductBundlesSvc',

  function(

    ListingsSvc,
    ModalSvc,
    navigate,
    ProductBundlesSvc,

  ) {

    const vm = this;
    init();

    function init() {

      vm.openProductBundleEdit = openProductBundleEdit;
      vm.cancelProductBundleEdit = cancelProductBundleEdit;
      vm.addProductBundleEditItem = addProductBundleEditItem;
      vm.removeProductBundleEditItem = removeProductBundleEditItem;
      vm.saveProductBundleEdit = saveProductBundleEdit;
      vm.validateProductBundleEdit = validateProductBundleEdit;

      vm.refreshCache = refreshCache;

      const p = setProductList().then( refreshBundlesList );

      ModalSvc.wait( {
        waitFor: p
      } );
    }

    async function refreshCache() {
      await ModalSvc.wait( {
        waitFor: ProductBundlesSvc.refresh()
      } );
      navigate.reload();
    }

    function refreshBundlesList() {
      return ProductBundlesSvc.list()
        .then( bundles => {

          const displayBundles = bundles.map( _bundle => {
            const res = Object.assign( {}, _bundle );

            const isBundleDefined = _bundle && Array.isArray( _bundle.bundle );

            if( isBundleDefined ) {
              res.bundle = _bundle.bundle.map( _ => {

                const productVariant = vm.productVariants.find( _pv => _pv.gid === _.gid );

                if( !productVariant ) {
                  return null;
                }

                if( !util.isNan( parseInt( productVariant.title ) ) ) {
                  productVariant.units = parseInt( productVariant.title );
                }

                return {
                  variant: productVariant,
                  quantity: _.quantity,
                };
              });
            }
            else {
              res.bundle = [];
            }

            const everyVariantTitleIsNumerical = res.bundle.every( _item => _item && _item.variant && !util.isNan( _item.variant.units ) );
            if( everyVariantTitleIsNumerical ) {
              res.totalUnits = res.bundle.reduce( ( _total, _item ) => _total += _item.variant.units * _item.quantity , 0 );
            }

            return res;
          } );

          displayBundles.forEach( resetProductBundleEdit );
          vm.productBundles = displayBundles;
          console.log( displayBundles );
        });
    }

    function setProductList() {
      return ListingsSvc
        .listActiveProductVariants( { everydayBargainsOnly: true } )
        .then( resp => {

          const productVariantsForBundling = resp.productVariants.filter( _ => !_.tags.includes( 'bundle' ) );

          vm.productVariants = productVariantsForBundling;

          const productsForBundling = productVariantsForBundling.reduce( ( _products, _variant ) => {

            const _existingProduct = _products.find( _p => _p.gid === _variant.productGid );

            if( _existingProduct ) {
              _existingProduct.variants.push( _variant );
            }
            else {

              const _newProduct = {
                gid: _variant.productGid,
                title: _variant.productTitle,
                variants: [ _variant ],
              };

              _products.push( _newProduct );

            }

            return _products;

          }, []);

          vm.products = productsForBundling.sort(cmpByTitle);
          return vm.products;

        });
    }

    function openProductBundleEdit( productBundle ) {

      productBundle.isEditing = true;

    }



    function resetProductBundleEdit( productBundle ) {

      productBundle.editBundle = productBundle.bundle.map( _bundleItem => {

        if( ! _bundleItem ) {
          return {};
        }

        const _product = vm.products.find( _p => _p.gid === _bundleItem.variant.productGid );

        return {
          quantity: _bundleItem.quantity,
          product: _product,
          variantGid: _bundleItem.variant.gid,
        };

      });
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

      const bundleToSave = productBundle.editBundle.map( editBundleItem => {

        const { variantGid, quantity, product } = editBundleItem;

        const selectedVariant = product.variants.find( _ => _.gid === variantGid );

        const res = {
          gid: variantGid,
          variantTitle: selectedVariant.title,
          units: selectedVariant.units,
          quantity,
          productTitle: product.title,
          productId: product.gid
        };

        return res;
      } );

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

        if( originalItem.variantGid !== newItem.variantGid ) {
          return false;
        }

        if( originalItem.quantity !== newItem.quantity ) {
          return false;
        }

      }

      return true;
    }

    function validateProductBundleEdit( productBundle ) {

      if( productBundle.isEditing && productBundle.editBundle ) {

        const anyQuantityNonPositive = productBundle.editBundle.some( _ => !_.quantity || _.quantity <= 0 );
        if( anyQuantityNonPositive ) {
          return false;
        }

        const hasBlankProduct = productBundle.editBundle.some( _ => !_.product );
        if( hasBlankProduct ) {
          return false;
        }

        const variantDoesNotMatchProduct = productBundle.editBundle.some( _ => !_.product.variants.find( _v => _v.gid === _.variantGid ) );

        if( variantDoesNotMatchProduct ) {
          return false;
        }

      }

      return true;
    }

  }

]);