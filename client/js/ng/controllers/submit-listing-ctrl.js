import angular from 'angular';

const __DEFAULT_LOT_PRICE_VALUE_PCT__ = 15;

/******************* Submit Listing Controller *************************/
angular.module('myApp').controller( 'SubmitListingCtrl', [

  'bstockFormConstants',
  'dbEnums',
  'ListingsSvc',
  'LoggedInUser',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',

  function(

    bstockFormConstants,
    dbEnums,
    ListingsSvc,
    LoggedInUser,
    LotSvc,
    ModalSvc,
    navigate,
    sessionTimeout,

  ) {
    sessionTimeout.timeoutExpired();


    const vm = this;
    init();

    function init() {

      vm.waitingForResponse = false;
      vm.allowEditPricingData = true;

      // Form options
      vm.formOptions = {
        marketplaces: (function(){
          const opts = [
            'wholesaleninjas',
            'bstock'
          ];

          return opts.filter( _ => LoggedInUser.hasMarketplacePermission( _ ) );
        })(),
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
          invalidShippingRate: false,
          invalidAdditionalTags: false,
          invalidInventory: false,
          invalidUnitCount: false,
          invalidEstimatedRetailValue: false,
          noPackagingType: false,
        },
      };

      vm.inputs = {
        publish: false,
        shopify: {
          shippingRate: '',
          additionalTags: '',
          packagingType: '',
          guarantee: { value: 'standard' },
        }
      };

      vm.submitListing = submitListing;
      vm.backToLotDetails = backToLotDetails;

      //Form default values
      vm.listing = {
        marketplace: vm.formOptions.marketplaces[0],
        // bstock defaults
        auctionStartPrice: '300',
        shopifyPrice: '',
        condition: '',
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
        estimatedRetailValue: '',
      };

      LotSvc.load().then( lot => {

        vm.lot = lot;

        vm.allowEditPricingData = LoggedInUser.hasPermission( 'EDIT_PRICING_DATA' ) || !vm.lot.estimatedRetailValue;
        vm.priceValuePercentage = vm.lot.priceValuePercentage || __DEFAULT_LOT_PRICE_VALUE_PCT__;

        // Default collection selections
        if( isCasePacked() ) {
          const casePackedCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'cases' );
          casePackedCollectionOption.selected = true;
        }
        else if( isBoxedLot() ) {
          const lotCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'lots' );
          lotCollectionOption.selected = true;
        }
        else if( isPallet() ) {
          const palletCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'pallets' );
          palletCollectionOption.selected = true;
        }

        vm.inputs.totalUnits = vm.lot.totalUnits;

        Object.assign(
          vm.inputs.shopify,
          {
            additionalTags: defaultTags( vm.lot ),
            packagingType: vm.lot.packagingType,
          }
        );

        const estimatedRetailValue = vm.lot.getEstimatedRetailValue();

        Object.assign(
          vm.listing,
          {
            marketplace: LoggedInUser.hasMarketplacePermission( vm.lot.destinationMarketplace ) ? vm.lot.destinationMarketplace : vm.formOptions.marketplaces[0],
            shopifyPrice: estimatedRetailValue ? ( vm.priceValuePercentage*parseFloat(estimatedRetailValue)/100 ).toFixed(2) : '',
            condition: ({'shelf-pull': 'Shelf Pulls','customer returns': 'Customer Returns','salvage': 'Salvage'})[vm.lot.type] || '',
            estimatedRetailValue,
          }
        );

      });

    }

    function defaultTags( lot ) {

      const tags = [ ];
      const handleTags = {
        'PC': 'personal care',
        'GM': 'general merchandise',
        'VT': 'vitamins',
        'NP': 'nail polish',
        'CS': 'cosmetics',
        'AP': 'clothing'
      };

      const match = lot.handle.match(/^([a-zA-Z]{2})/);
      if(match && match[1] && handleTags[match[1]]) {
        tags.push(handleTags[match[1]]);
      }

      if( lot.category && !tags.find( _tag => _tag === lot.category ) ) {
        tags.push( lot.category );
      }

      return tags.join(', ');

    }

    function conditionTag( lotType ) {
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
    }

    function getShopifyTags() {
      const tags = vm.inputs.shopify.additionalTags ? vm.inputs.shopify.additionalTags.split(',').map(_=>_.trim()) : [];
      if(vm.lot.unmanifested) {
        tags.push('unmanifested');
      }
      else {
        tags.push('manifested');
      }
      tags.push( vm.lot.packagingType || vm.inputs.shopify.packagingType );
      tags.push('review');

      tags.push( conditionTag( vm.lot.type ) );

      tags.push( `guarantee:${ vm.inputs.shopify.guarantee.value }` );

      vm.formOptions.shopify.collections.forEach( coll => {
        if( coll.selected ) {
          tags.push(`collection:${ coll.name }`);
        }
      });

      return tags.filter( _ => _ ).join(', ');// remove any empty tags then join as a CSV string before returning
    }

    function isBoxedLot() { return vm.lot.packagingType === 'box lot'; }
    function isPallet() { return !!vm.lot.packagingType.match(/pallet/); }
    function isCasePacked() { return vm.lot.type === 'case-packed'; } // type is condition

    function validateBstockListingOptions() {
      vm.inputErrors.bstock.invalidAuctionPrice = (vm.listing.auctionStartPrice && vm.listing.auctionStartPrice.match(/[0-9]+/)) ? false : true;
      vm.inputErrors.bstock.noChargeType = vm.listing.shipping.chargeType ? false : true;

      vm.inputErrors.bstock.noBstockCondition = vm.listing.condition ? false : true;
      vm.inputErrors.bstock.noBstockCategory = vm.listing.category ? false : true;
      vm.inputErrors.bstock.noBstockPackaging = vm.listing.packaging ? false : true;
      vm.inputErrors.bstock.bstockTitleTooLong = ListingsSvc.isTitleTooLong(vm.lot.listingData.title).bstock;

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
      vm.inputErrors.shopify.invalidUnitCount = vm.inputs.totalUnits <= 0 && !vm.lot.unmanifested;
      vm.inputErrors.shopify.noPackagingType = !vm.inputs.shopify.packagingType;

      vm.inputErrors.shopify.invalidShippingRate = isBoxedLot() ? !vm.inputs.shopify.shippingRate: false;

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
      else {
        return false;
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
      vm.listing.shopifyShippingRate = vm.inputs.shopify.shippingRate;

      if(!validateListingOptions()) {
        return;
      }

      vm.waitingForResponse = true;

      if(vm.inputs.totalUnits!==vm.lot.totalUnits) {
        vm.lot.totalUnits = vm.inputs.totalUnits;
        await LotSvc.edit( vm.lot._id, vm.lot );
      }

      ListingsSvc.submitLotListing( vm.lot._id, vm.listing, vm.inputs.publish ).then(resp=>{
        console.log(resp);
        if(resp.error) {
          ModalSvc.message( { header: 'Error', body: resp.message, type: 'error' } );
        }
        else {
          ModalSvc.message( { header: 'Status', body: 'Listing submitted. Submission may take several minutes. Return to lot page to view results.', type: 'success' } );
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
      navigate.viewLot( vm.lot._id );
    }

  }
]);