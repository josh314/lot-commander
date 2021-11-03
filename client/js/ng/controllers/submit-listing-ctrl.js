import angular from 'angular';

import * as api from '../../api';

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller('SubmitListingCtrl', [ '$q', 'bstockFormConstants', 'dbEnums', 'listingTitleVerifier', 'lotStore', 'LotSvc', 'messageModal', 'navigate', 'sessionTimeout',
  function( $q, bstockFormConstants, dbEnums, listingTitleVerifier, lotStore, LotSvc, messageModal, navigate, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    if(!lotStore._id) {
      navigate.listLots();
    }

    const vm = this;
    vm.waitingForResponse = false;
    vm.lot = lotStore;

    // Form dropdown values
    vm.formOptions = {
      marketplaces: ['wholesaleninjas', 'bstock'],
      bstock: {
        constants: bstockFormConstants,
        categories: Object.keys(bstockFormConstants.category),
        conditions: Object.keys(bstockFormConstants.condition),
        packagings: Object.keys(bstockFormConstants.packaging),
        shippingChargeTypes: Object.keys(bstockFormConstants.shippingChargeType),
        shippingAllowedDestinations: Object.keys(bstockFormConstants.shippingAllowedDestinations),
      },
      shopify: {
        packagingTypes: dbEnums.packagingType,
        collections: [ 'lots', 'pallets', 'truckloads', 'cases' ].map( _ => ({ name: _, selected: false }) ),
        guarantee: [
          {
            value: 'standard',
            label: 'Standard (95%)'
          },
          {
            value: 'as-is',
            label: 'None (sold as-is)'
          },
          {
            value: 'complete',
            label: 'Complete (100%)'
          },
        ]
      }
    };

    vm.inputErrors = {
      noMarketplace: false,
      bstock: {
        invalidAuctionPrice: false,
        noChargeType: false,
        invalidShippingCharge: false,
        noCarrier: false,
        noBstockCondition: false,
        noBstockCategory: false,
        noBstockPackaging: false,
        bstockTitleTooLong: false,
      },
      shopify: {
        invalidPrice: false,
        invalidAdditionalTags: false,
        invalidInventory: false,
        invalidUnitCount: false,
        invalidEstimatedRetailValue: false,
        noPackagingType: false,
      },
    };

    vm.inputs = {
      totalUnits: vm.lot.totalUnits,
      publish: false,
      shopify: {
        additionalTags: (function(){
          const tags = [ ];
          const handleTags = {
            'PC': 'personal care',
            'GM': 'general merchandise',
            'VT': 'vitamins',
            'NP': 'nail polish',
            'CS': 'cosmetics',
            'AP': 'clothing'
          };

          const match = vm.lot.handle.match(/^([a-zA-Z]{2})/);
          if(match && match[1] && handleTags[match[1]]) {
            tags.push(handleTags[match[1]]);
          }
          return tags.join(', ');
        })(),
        packagingType: lotStore.packagingType,
        guarantee: { value: 'standard' },
      }
    };

    vm.submitListing = submitListing;
    vm.backToLotDetails = backToLotDetails;

    const conditionTag = lotType => {
      let cond;
      if( lotType === 'customer returns' ) {
        cond = 'returns';
      }
      else if ( lotType == 'salvage' ) {
        cond = 'salvage';
      }
      else if ( lotType == 'shelf-pull' ) {
        cond = 'shelf-pulls';
      }
      else if ( lotType == 'case-packed' ) {
        cond = 'case-packed';
      }

      return cond ? `condition:${ cond }` : null;
    };

    const getShopifyTags = () => {
      const tags = vm.inputs.shopify.additionalTags ? vm.inputs.shopify.additionalTags.split(',').map(_=>_.trim()) : [];
      if(vm.lot.unmanifested) {
        tags.push('unmanifested');
      }
      else {
        tags.push('manifested');
      }
      tags.push(lotStore.packagingType || vm.inputs.shopify.packagingType);
      tags.push('review');

      tags.push( conditionTag( vm.lot.type ) );

      tags.push( `guarantee:${ vm.inputs.shopify.guarantee.value }` );

      vm.formOptions.shopify.collections.forEach( coll => {
        if( coll.selected ) {
          tags.push(`collection:${ coll.name }`);
        }
      });

      return tags.filter( _ => _ ).join(', ');// remove any empty tags then join as a CSV string before returning
    };

    const estimatedRetailValue = lotStore.getEstimatedRetailValue();
    //Form default values
    vm.listing = {
      marketplace: vm.lot.destinationMarketplace || 'wholesaleninjas',
      // bstock defaults
      auctionStartPrice: '300',
      shopifyPrice: estimatedRetailValue ? (.2*parseFloat(estimatedRetailValue)).toFixed(2) : '',
      condition: ({'shelf-pull': 'Shelf Pulls','customer returns': 'Customer Returns','salvage': 'Salvage'})[vm.lot.type] || '',
      packaging: 'Original',
      shipping: {
        allowedDestinations: bstockFormConstants.shippingAllowedDestinations['Continental US only (Alaska and Hawaii excluded)'],
        chargeType: bstockFormConstants.shippingChargeType['Fixed Cost'],
        charge: '90',
        carrier: 'UPS',
        notes: 'Lot will ship within one business day after confirmed payment.'
      },
      //shopify defaults
      shopifyInventory: 1,
      shopifyTags: [],
      refreshProductData: false,
      estimatedRetailValue: estimatedRetailValue,
    };

    function validateBstockListingOptions() {
      vm.inputErrors.bstock.invalidAuctionPrice = (vm.listing.auctionStartPrice && vm.listing.auctionStartPrice.match(/[0-9]+/)) ? false : true;
      vm.inputErrors.bstock.noChargeType = vm.listing.shipping.chargeType ? false : true;

      vm.inputErrors.bstock.noBstockCondition = vm.listing.condition ? false : true;
      vm.inputErrors.bstock.noBstockCategory = vm.listing.category ? false : true;
      vm.inputErrors.bstock.noBstockPackaging = vm.listing.packaging ? false : true;
      vm.inputErrors.bstock.bstockTitleTooLong = listingTitleVerifier.tooLong(vm.lot.listingData.title).bstock;

      if(vm.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
        vm.inputErrors.bstock.invalidShippingCharge = (vm.listing.shipping.charge && vm.listing.shipping.charge.match(/[0-9]+/)) ? false : true;
        vm.inputErrors.bstock.noCarrier = vm.listing.shipping.carrier ? false : true;
      }
      else {
        vm.inputErrors.bstock.invalidShippingCharge = vm.inputErrors.bstock.noCarrier = false;
      }

      if( Object.values( vm.inputErrors.bstock ).some( _ => _ ) ) {
        return false;
      }

      return true;
    }

    function validateShopifyListingOptions() {
      vm.inputErrors.shopify.invalidPrice = (vm.listing.shopifyPrice && vm.listing.shopifyPrice.match(/^[0-9]+(\.[0-9]{2})?$/)) ? false : true;
      vm.inputErrors.shopify.invalidInventory = (vm.listing.shopifyInventory && (vm.listing.shopifyInventory >= 0)) ? false : true;
      vm.inputErrors.shopify.invalidUnitCount = vm.inputs.totalUnits <= 0 && !lotStore.unmanifested;

      vm.inputErrors.shopify.noPackagingType = !vm.inputs.shopify.packagingType;

      if( Object.values( vm.inputErrors.shopify ).some( _ => _ ) ) {
        return false;
      }

      return true;
    }

    function validateListingOptions() {
      if(vm.listing.marketplace=='bstock') {
        return validateBstockListingOptions();
      }
      else if(vm.listing.marketplace=='wholesaleninjas') {
        return validateShopifyListingOptions();
      }
    }

    async function submitListing() {

      Promise.resolve({}).then(()=>{
        console.log(vm.listing);
      });

      vm.inputErrors.noMarketplace = vm.listing.marketplace ? false : true;
      if( vm.inputErrors.noMarketplace ) {
        return;
      }

      vm.listing.shopifyTags = getShopifyTags();

      if(!validateListingOptions()) {
        return;
      }

      vm.waitingForResponse = true;

      if(vm.inputs.totalUnits!==vm.lot.totalUnits) {
        vm.lot.totalUnits = vm.inputs.totalUnits;
        await LotSvc.edit( vm.lot._id, vm.lot );
      }

      $q.when( api.submitLotListing( lotStore._id, vm.listing, vm.inputs.publish ) ).then(resp=>{
        console.log(resp);
        if(resp.error) {
          messageModal.launch({header: 'Error', body: resp.error, type: 'error'});
        }
        else {
          messageModal.launch({header: 'Status', body: 'Listing submitted. Submission may take several minutes. Return to lot page to view results.', type: 'success'});
          navigate.listLots();
        }
      })
        .catch(e=>{
          console.log(e);
        })
        .then(()=>{
          vm.waitingForResponse = false;
        });
    }

    function backToLotDetails() {
      navigate.viewLot( lotStore._id );
    }

  }
]);