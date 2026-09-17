import angular from 'angular';

const __NUM_INITIAL_COLLAGES__ = 3;

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

/******************* Submit Listing Controller *************************/
angular.module('myApp').controller( 'SubmitListingCtrl', [

  '$scope',
  'AppSettingsSvc',
  // 'bstockFormConstants',
  'dbEnums',
  'ListingsSvc',
  'LoggedInUser',
  'LotSvc',
  'ModalSvc',
  'navigate',
  'ShippingItemsSvc',

  function(

    $scope,
    AppSettingsSvc,
    // bstockFormConstants,
    dbEnums,
    ListingsSvc,
    LoggedInUser,
    LotSvc,
    ModalSvc,
    navigate,
    ShippingItemsSvc,

  ) {
    const vm = this;

    init();

    function init() {

      const formOptions = {
        marketplaces: (function(){
          const opts = [
            'wholesaleninjas',
            // 'bstock'
          ];

          return opts.filter( _ => LoggedInUser.hasMarketplacePermission( _ ) );
        })(),
        // bstock: {
        //   constants: bstockFormConstants,
        //   categories: Object.keys(bstockFormConstants.category),
        //   conditions: Object.keys(bstockFormConstants.condition),
        //   packagings: Object.keys(bstockFormConstants.packaging),
        //   shippingChargeTypes: Object.keys(bstockFormConstants.shippingChargeType),
        //   shippingAllowedDestinations: Object.keys(bstockFormConstants.shippingAllowedDestinations),
        // },
        shopify: {
          packagingTypes: dbEnums.packagingType,
          collections: createShopifyCollections(),
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

      Object.assign(

        vm,

        {

          allowEditPricingData : true,
          invalidListingTitle : false,
          invalidListingBody: false,

          // Form options
          formOptions,

          inputErrors : {
            noMarketplace: false,
            // bstock: {
            //   invalidAuctionPrice: false,
            //   noChargeType: false,
            //   invalidShippingCharge: false,
            //   noCarrier: false,
            //   noBstockCondition: false,
            //   noBstockCategory: false,
            //   noBstockPackaging: false,
            //   bstockTitleTooLong: false,
            // },
            shopify: {
              invalidPrice: false,
              invalidShippingRate: false,
              invalidAdditionalTags: false,
              invalidInventory: false,
              invalidUnitCount: false,
              invalidEstimatedRetailValue: false,
              noPackagingType: false,
            },
          },

          inputs : {
            publish: false,
            shopify: {
              shippingRate: '',
              additionalTags: '',
              packagingType: '',
              guarantee: { value: 'standard' },
            }
          },

          //Form default values
          listing : {
            marketplace: formOptions.marketplaces[0],
            // bstock defaults
            // auctionStartPrice: '300',
            // shopifyPrice: '',
            // condition: '',
            // packaging: 'Original',
            // shipping: {
            //   allowedDestinations: bstockFormConstants.shippingAllowedDestinations['Continental US only (Alaska and Hawaii excluded)'],
            //   chargeType: bstockFormConstants.shippingChargeType['Fixed Cost'],
            //   charge: '90',
            //   carrier: 'UPS',
            //   notes: 'Lot will ship within one business day after confirmed payment.'
            // },
            //shopify defaults
            shopifyInventory: 1,
            shopifyTags: [],
            refreshProductData: false,
            estimatedRetailValue: '',
          },

          submitListing,
          backToLotDetails,

          // shipping items and labels
          editShippingItemsCb,

          // media
          uploadMediaCb,
          removeMediaCb,
          cancelMediaProcessingCb,
          collages: [],
          showCollages: false,
          renderAndShowCollages,
          addCollage,
          selectAllCollages,

        }

      );

      LotSvc.load( { pollProcessingMedia: true } )
        .then( lot => {

          vm.originalLot = lot;
          vm.lot = lot.clone();

          // make sure that packaging type is correctly set based on shipping items. this will only matter for some legacy data
          ShippingItemsSvc.setPackagingTypeFromShippingItems( vm.lot );

        })
        .then( () => AppSettingsSvc.getDefaultPriceValuePercentage().then( _defaultPriceValuePercentage => vm.defaultPriceValuePercentage = _defaultPriceValuePercentage ) )
        .then( setListingDefaultsFromLot )
        .then( initializeCollageControls )
        .then( () => {
          resetPrimaryMediaWatchers( 'images' );
          resetPrimaryMediaWatchers( 'videos' );
        });

    }

    function createShopifyCollections() {
      return [ 'lots', 'pallets', 'truckloads', 'cases' ].map( _ => ({ name: _, selected: false }) );
    }

    function initializeCollageControls() {

      vm.showCollageControls = false;

      if( vm.lot.unmanifested ) {
        return;
      }

      vm.showCollageControls = true;

      if( vm.lot.images.length === 0 ) {
        return ModalSvc.wait({
          waitFor: initializeCollages(),
        });
      }

    }

    function renderAndShowCollages() {
      return ModalSvc.wait({
        waitFor: initializeCollages(),
      });
    }

    function setShopifyCollectionsFromLot() {

      vm.formOptions.shopify.collections = createShopifyCollections();

      // Default collection selections
      if( vm.lot.isCasePacked() ) {
        const casePackedCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'cases' );
        casePackedCollectionOption.selected = true;
      }
      else if( vm.lot.isBoxedLot() ) {
        const lotCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'lots' );
        lotCollectionOption.selected = true;
      }
      else if( vm.lot.isPallet() ) {
        const palletCollectionOption = vm.formOptions.shopify.collections.find( _ => _.name === 'pallets' );
        palletCollectionOption.selected = true;
      }
    }

    async function setListingDefaultsFromLot() {

      vm.allowEditPricingData = LoggedInUser.hasPermission( 'EDIT_PRICING_DATA' ) || !vm.lot.estimatedRetailValue;
      vm.priceValuePercentage = vm.lot.priceValuePercentage || vm.defaultPriceValuePercentage;

      setShopifyCollectionsFromLot();

      Object.assign(
        vm.inputs.shopify,
        {
          additionalTags: defaultTags( vm.lot ),
          packagingType: vm.lot.packagingType,
          shippingRate: await ListingsSvc.computeShippingRate( vm.lot ),
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

    }

    async function editShippingItemsCb( shippingItems ) {
      if(shippingItems) {

        await vm.lot.saveShippingItems( shippingItems );

        setShopifyCollectionsFromLot();
        vm.inputs.shopify.shippingRate = ListingsSvc.computeShippingRate( vm.lot );
        return ModalSvc.message({ header: 'Shipping Items Updated', html: '<p>Shipping items have been updated.</p><p>Shipping rate and Shopify collections adjusted accordingly.</p><p>Please review.</p>' });

      }
      else {
        return false;
      }
    }

    async function initializeCollages() {

      for( let i=0; i<__NUM_INITIAL_COLLAGES__; i++ ) {
        addCollage();
      }

      resetPrimaryMediaWatchers( 'images' );

      vm.showCollages = true;

    }

    function resetPrimaryMediaWatchers( mediaType ) {

      const deregisterPrimaryMediaWatchers = {};

      if( deregisterPrimaryMediaWatchers[ mediaType] ) {
        deregisterPrimaryMediaWatchers[ mediaType ]();
      }

      const watchList = [].concat(
        vm.lot.getMediaArray( mediaType ) ? vm.lot.getMediaArray( mediaType ).map( ( _, idx ) => () => vm.lot.getMediaArray( mediaType )[ idx ] && vm.lot.getMediaArray( mediaType )[ idx ].primary ): [],
        vm.collages ? vm.collages.map( ( _, idx ) => () => vm.collages[ idx ].primary ) : [],
      );

      deregisterPrimaryMediaWatchers[ mediaType ] = $scope.$watchGroup( watchList, function( newVals, oldVals ) {

        if( newVals.filter( _ => _ ).length > 1 ) {

          console.log( 'Only one primary image allowed. Setting others to false.' );

          const changedIdx = newVals.findIndex( ( _new, idx ) => _new && _new !== oldVals[ idx ] );

          if( changedIdx >= 0 ) {

            let media = [].concat( vm.lot.getMediaArray( mediaType ) || [] );
            if( mediaType === 'images' ) {

              media = [].concat(
                media,
                vm.collages || [],
              );

            }

            for( let i=0; i<media.length; i++ ) {

              if( i !== changedIdx ) {
                media[ i ].primary = false;
              }

            }

          }

        }

      });

    }

    function addCollage() {

      const collage = {
        // we create this id so that we can 'track by' it in ng-repeat
        id: crypto.randomUUID(),
        doSave: false,
        doRender: true,

        selected: true,
        primary: false,
      };

      collage.changeSelected = () => collage.primary = false;

      let promiseResolved;
      collage.isSavedPromise = new Promise( resolve => {
        promiseResolved = resolve;
      });

      collage.saveCb = function() {
        return promiseResolved();
      };

      vm.collages.push( collage );

      resetPrimaryMediaWatchers( 'images' );

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


    function lotPrimaryImageChanged() {

      const originalPrimaryImage = vm.originalLot.images.find( _ => _.primary );
      const currentPrimaryImage = vm.lot.images.find( _ => _.primary );

      if( currentPrimaryImage && originalPrimaryImage ) {

        if ( originalPrimaryImage._id !== currentPrimaryImage._id ) {
          return true;
        }

      }
      else if ( currentPrimaryImage || originalPrimaryImage ) {
        return true;
      }

      return false;

    }

    function uploadMediaCb( media, mediaType ) {
      return vm.lot.uploadMedia( media, mediaType ).then( () => resetPrimaryMediaWatchers( mediaType ) );
    }

    function removeMediaCb( mediaType ) {
      return resetPrimaryMediaWatchers( mediaType );
    }

    function cancelMediaProcessingCb( mediaType ) {
      return resetPrimaryMediaWatchers( mediaType );
    }

    function saveCollages() {

      for( let collage of vm.collages ) {
        if( collage.selected ) {
          collage.doSave = true;
        }
      }

      return Promise.all( vm.collages.filter( _ => _.selected ).map( _ =>  _.isSavedPromise ) );

    }

    function selectAllCollages() {

      for( let collage of vm.collages ) {
        collage.selected = true;
      }

    }


    function validateImages() {

      const lotImages = [].concat(
        vm.lot.images || [],
        vm.collages.filter( _ => _.selected ) || [],
      );

      return !!lotImages.length;

    }

    function validateListing() {

      let result = true;

      if( !vm.lot.listingData.title || vm.invalidListingTitle ) {
        result = false;
        ModalSvc.message( { header: 'Invalid title', body: 'Cannot submit listing: invalid listing title.' } );
      }
      else if( !vm.lot.listingData.body || vm.invalidListingBody ) {
        result = false;
        ModalSvc.message( { header: 'Invalid body', body: 'Cannot submit listing: invalid listing body.' } );
      }
      else if( !validateImages() ) {
        result = false;
        ModalSvc.message( { header: 'No images', body: 'The lot must have at least one image to submit a listing.' } );
      }
      else if( !vm.lot.shippingItems || !vm.lot.shippingItems.length ) {
        result = false;
        ModalSvc.message( { header: 'No shipping items', body: 'The lot must have shipping items configured before submission.' } );
      }
      else if( !validateListingOptions() ) {
        result = false;
        ModalSvc.message( {
          header: 'Error',
          body: 'Cannot submit listing: please review listing details.'
        } );
      }

      return result;
    }

    function validateShopifyListingOptions() {
      vm.inputErrors.shopify.invalidPrice = (vm.listing.shopifyPrice && vm.listing.shopifyPrice.match(/^[0-9]+(\.[0-9]{2})?$/)) ? false : true;
      vm.inputErrors.shopify.invalidInventory = (vm.listing.shopifyInventory && (vm.listing.shopifyInventory >= 0)) ? false : true;
      vm.inputErrors.shopify.invalidUnitCount = !vm.lot.unmanifested && (!vm.lot.totalUnits || vm.lot.totalUnits <= 0 );
      vm.inputErrors.shopify.noPackagingType = !vm.inputs.shopify.packagingType;

      vm.inputErrors.shopify.invalidShippingRate = vm.lot.isBoxedLot() ? !vm.inputs.shopify.shippingRate: false;

      if( Object.values( vm.inputErrors.shopify ).some( _ => _ ) ) {
        return false;
      }

      return true;
    }

    function validateListingOptions() {

      // if(vm.listing.marketplace=='bstock') {
      //   return validateBstockListingOptions();
      // }

      if(vm.listing.marketplace=='wholesaleninjas') {
        return validateShopifyListingOptions();
      }

      return false;

    }


    function lotChanged() {

      const totalUnitsChanged =  vm.lot.totalUnits !== vm.originalLot.totalUnits;
      const listingTitleChanged = vm.lot.listingData.title !== vm.originalLot.listingData.title;
      const listingBodyChanged = vm.lot.listingData.body !== vm.originalLot.listingData.body;

      return totalUnitsChanged || listingTitleChanged || listingBodyChanged || lotPrimaryImageChanged();
    }

    function saveLot() {
      return vm.lot.save();
    }

    async function submitListing() {

      if( !validateListing() ) {
        return;
      }

      vm.inputErrors.noMarketplace = vm.listing.marketplace ? false : true;
      if( vm.inputErrors.noMarketplace ) {
        return;
      }

      vm.listing.shopifyTags = getShopifyTags();
      vm.listing.shopifyShippingRate = vm.inputs.shopify.shippingRate;


      if( lotChanged() ) {

        await ModalSvc.wait({
          waitFor: saveLot(),
          message: 'Saving lot...',
        });

      }

      if( vm.collages && vm.collages.filter( _ => _.selected ).length ) {

        await ModalSvc.wait({
          message: 'Saving selected collages...',
          waitFor: saveCollages(),
          delay: 5000,
        });

      }

      console.log('Now submitting listing to Shopify');

      const submissionResponse = await ModalSvc.wait({
        waitFor: ListingsSvc.submitLotListing( vm.lot._id, vm.listing, vm.inputs.publish ),
        message: 'Submitting listing...',
      });

      console.log('submissionResponse', submissionResponse );
      if( submissionResponse.error ) {
        ModalSvc.message( { header: 'Error', body: 'Please try again later.', type: 'error' } );
      }
      else {
        ModalSvc.message( { header: 'Status', body: 'Listing submitted. Submission may take several minutes. Return to lot page to view results.', type: 'success' } );
        navigate.listLots();
      }

    }

    async function backToLotDetails() {

      if( lotChanged() ) {

        const isConfirmed = await ModalSvc.confirm({
          header: 'Unsaved Changes',
          body: 'You have unsaved changes to the listing title or body. Would you like to save them?',
        });

        if( isConfirmed ) {
          await ModalSvc.wait({
            waitFor: saveLot(),
            message: 'Saving lot...',
          });
        }

      }

      if( vm.collages && vm.collages.filter( _ => _.selected ).length ) {

        const isConfirmed = await ModalSvc.confirm({
          header: 'Unsaved Collages',
          body: 'You have unsaved selected collages. Would you like to save them?',
        });

        if( isConfirmed ) {

          await ModalSvc.wait({
            message: 'Saving selected collages...',
            waitFor: saveCollages(),
          });

        }

      }

      navigate.viewLot( vm.lot._id );
    }

  }
]);


// function validateBstockListingOptions() {
//   vm.inputErrors.bstock.invalidAuctionPrice = (vm.listing.auctionStartPrice && vm.listing.auctionStartPrice.match(/[0-9]+/)) ? false : true;
//   vm.inputErrors.bstock.noChargeType = vm.listing.shipping.chargeType ? false : true;

//   vm.inputErrors.bstock.noBstockCondition = vm.listing.condition ? false : true;
//   vm.inputErrors.bstock.noBstockCategory = vm.listing.category ? false : true;
//   vm.inputErrors.bstock.noBstockPackaging = vm.listing.packaging ? false : true;
//   vm.inputErrors.bstock.bstockTitleTooLong = ListingsSvc.isTitleTooLong(vm.lot.listingData.title).bstock;

//   if(vm.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
//     vm.inputErrors.bstock.invalidShippingCharge = (vm.listing.shipping.charge && vm.listing.shipping.charge.match(/[0-9]+/)) ? false : true;
//     vm.inputErrors.bstock.noCarrier = vm.listing.shipping.carrier ? false : true;
//   }
//   else {
//     vm.inputErrors.bstock.invalidShippingCharge = vm.inputErrors.bstock.noCarrier = false;
//   }

//   if( Object.values( vm.inputErrors.bstock ).some( _ => _ ) ) {
//     return false;
//   }

//   return true;
// }
