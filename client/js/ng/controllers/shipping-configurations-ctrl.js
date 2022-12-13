import angular from 'angular';

import * as util from '../../utilities';

//******************** Shipping Configurations page controller */
angular.module('myApp').controller( 'ShippingConfigurationsCtrl', [

  'ModalSvc',
  'ShippingConfigurationsSvc',
  'sessionTimeout',

  function(

    ModalSvc,
    ShippingConfigurationsSvc,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      vm.constants = ShippingConfigurationsSvc.constants;

      vm.openVariantEdit = openVariantEdit;
      vm.cancelVariantEdit = cancelVariantEdit;
      vm.addVariantEditShippingItem = addVariantEditShippingItem;
      vm.addVariantEditPresetShippingItem = addVariantEditPresetShippingItem;
      vm.removeVariantEditShippingItem = removeVariantEditShippingItem;
      vm.saveShippingConfigurationEdit = saveShippingConfigurationEdit;

      vm.showProductGroupStandardBoxControls = showProductGroupStandardBoxControls;
      vm.setProductGroupStandardBoxToPreset = setProductGroupStandardBoxToPreset;
      vm.updateProductGroupShippingItems = updateProductGroupShippingItems;


      const p = refreshShippingConfigurationsList();

      ModalSvc.wait( {
        waitFor: p
      } );
    }

    function refreshShippingConfigurationsList() {
      return ShippingConfigurationsSvc.list( { everydayBargainsOnly: true, includePallets: true, refreshCache: true } )
        .then( configurations => {

          const productGroups = [];
          const bundles = [];

          for( let i=0; i<configurations.length; i++ ) {
            const _config = configurations[i];

            if( !_config.shippingConfiguration ) {
              _config.shippingConfiguration = [];
            }

            const isBundle = !!_config.tags.includes( 'bundle' );

            if( isBundle ) {
              bundles.push( _config );
            }
            else {

              if( util.isNan( _config.variantTitle ) ) {
                _config.variantDisplayHeader = `Variant: ${_config.variantTitle}`;
              }
              else {
                _config.variantDisplayHeader = `Variant: ${_config.variantTitle} units`;
                _config.units = parseInt(_config.variantTitle);
              }

              const existingProductGroup = productGroups.find( _pg => _pg.title === _config.productTitle );

              let pg;
              if( existingProductGroup ) {
                pg = existingProductGroup;
              }
              else {

                pg = {
                  title: _config.productTitle,
                  standardBox: {
                    dimensions: {},
                  },
                  variants: []
                };

                productGroups.push( pg );

              }

              pg.variants.push( _config );

            }

            resetVariantEdit( _config );
          }

          vm.productGroups = productGroups;

        });
    }

    function openVariantEdit( variant ) {

      variant.isEditing = true;

    }

    function resetVariantEdit( variant ) {

      variant.editConfig = variant.shippingConfiguration.map( _ => JSON.parse(JSON.stringify(_)) );
      variant.isEditing = false;

    }

    function cancelVariantEdit( variant ) {

      resetVariantEdit( variant );

    }

    function addVariantEditShippingItem( variant ) {
      variant.editConfig.push( {  } );
    }


    function addVariantEditPresetShippingItem( variant, index ) {

      const newItem = JSON.parse( JSON.stringify( vm.constants.presets[index] ) );
      variant.editConfig.push( newItem );
    }

    function removeVariantEditShippingItem( variant, ShippingItemIdx ) {
      return variant.editConfig.splice( ShippingItemIdx, 1 );
    }

    function editVariantShippingConfigurationNoChange( variant ) {

      if( variant.shippingConfiguration.length !== variant.editConfig.length ) {
        return false;
      }

      for( let i=0; i< variant.editConfig.length; i++ ) {

        const originalItem = variant.shippingConfiguration[i];
        const newItem = variant.editConfig[i];

        const editFields = [
          'weight',
          'weightUnits',
          'height',
          'heightUnits',
          'length',
          'lengthUnits',
          'width',
          'widthUnits'
        ];

        for( let f of editFields ) {

          if( originalItem[ f ] !== newItem[ f ] ) {
            return false;
          }

        }

      }

      return true;
    }

    function validateVariantShippingConfigurationEdit( configuration ) {

      for( let item of configuration ) {

        for( let dimension of [ 'weight', 'height', 'length', 'width' ] ) {

          if( util.isNan( item[ dimension ] ) || item[ dimension ] <= 0 ) {
            return false;
          }

        }

        for( let dimensionUnits of [ 'weightUnits', 'heightUnits', 'lengthUnits', 'widthUnits' ] ) {

          if( typeof item[ dimensionUnits ] === 'undefined' ) {
            return false;
          }

        }

      }

      return true;
    }

    function saveShippingConfigurationEdit( variant ) {

      if( !validateVariantShippingConfigurationEdit( variant.editConfig ) ) {
        ModalSvc.message({ header: 'Error', body: 'Invalid values', type: 'error' });
        return;
      }

      if( editVariantShippingConfigurationNoChange( variant ) ) {
        resetVariantEdit( variant );
        return;
      }

      const configToSave = variant.editConfig;

      const p = ShippingConfigurationsSvc.set( variant.gid, configToSave )
        .then( _ => resetVariantEdit( variant ) )
        .then( refreshShippingConfigurationsList );

      ModalSvc.wait( { waitFor: p } );

    }

    function showProductGroupStandardBoxControls( productGroup ) {

      // Check if all variants are unit-based
      return productGroup.variants.every( variant => typeof variant.units !== 'undefined' );

    }

    function setProductGroupStandardBoxToPreset( productGroup, presetIndex ) {

      const presetValue = JSON.parse( JSON.stringify( vm.constants.presets[ presetIndex ] ) );

      productGroup.standardBox.dimensions = presetValue;

    }

    function updateProductGroupShippingItems( productGroup ) {

      // Check if proposed units-per-box is positive and that each variant can be evenly divided by it
      const isValidUnitsPerBox = productGroup.standardBox.units > 0 && productGroup.variants.every( variant => variant.units % productGroup.standardBox.units === 0 );

      if( !isValidUnitsPerBox ) {
        return ModalSvc.message( { header: 'Error', body: 'Invalid units per box. Does not evenly divide every variant.', type: 'error' } );
      }

      if( !validateVariantShippingConfigurationEdit( [ productGroup.standardBox.dimensions ] ) ) {
        return ModalSvc.message({ header: 'Error', body: 'Invalid values for shipping configuration.', type: 'error' });
      }

      const p = [];
      for( let i=0; i<productGroup.variants.length; i++ ) {
        const variant = productGroup.variants[i];

        const numBoxes = variant.units / productGroup.standardBox.units;


        const copyFields = [
          'weight',
          'weightUnits',
          'height',
          'heightUnits',
          'length',
          'lengthUnits',
          'width',
          'widthUnits'
        ];

        const standardBox = util.createSubobject( productGroup.standardBox.dimensions, copyFields);

        const shippingItems = Array( numBoxes ).fill( JSON.parse( JSON.stringify( standardBox ) ) );

        const refreshCache = false;

        p.push(
          ShippingConfigurationsSvc.set( variant.gid, shippingItems, refreshCache )
        );
      }

      ModalSvc.wait( {
        waitFor: Promise.all( p ).then( refreshShippingConfigurationsList ),
      } );


      // reset input data field
      productGroup.standardBox = {
        dimensions: {}
      };

    }

  }

]);