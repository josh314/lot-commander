import angular from 'angular';

/******************* Scanning Page Controller *************************/
angular.module('myApp').controller('SubmitListingCtrl', ['$scope', '$http', 'bstockFormConstants', 'dbEnums', 'listingTitleVerifier', 'lotStore', 'messageModal', 'navigate', 'saveLot', 'sessionTimeout',
  function($scope, $http, bstockFormConstants, dbEnums, listingTitleVerifier, lotStore, messageModal, navigate, saveLot, sessionTimeout) {
    sessionTimeout.timeoutExpired();

    if(!lotStore._id) {
      navigate.listLots();
    }

    $scope.lot = lotStore;
    $scope.totalUnits = $scope.lot.totalUnits;

    $scope.waitingForResponse = false;

    $scope.bstockFormConstants = bstockFormConstants;

    // Form dropdown values
    $scope.marketplaces = ['wholesaleninjas', 'bstock'];
    $scope.bstockCategories = Object.keys(bstockFormConstants.category);
    $scope.bstockConditions = Object.keys(bstockFormConstants.condition);
    $scope.bstockPackagings = Object.keys(bstockFormConstants.packaging);
    $scope.bstockShippingChargeTypes = Object.keys(bstockFormConstants.shippingChargeType);
    $scope.bstockShippingAllowedDestinations = Object.keys(bstockFormConstants.shippingAllowedDestinations);

    $scope.packagingTypes = dbEnums.packagingType;
    $scope.lotPackagingType = lotStore.packagingType;

    $scope.additionalShopifyTags = (function(){
      const tags = [ ];
      const handleTags = {
        'PC': 'personal care',
        'GM': 'general merchandise',
        'VT': 'vitamins',
        'NP': 'nail polish',
        'CS': 'cosmetics',
        'AP': 'clothing'
      };

      const match = $scope.lot.handle.match(/^([a-zA-Z]{2})/);
      if(match && match[1] && handleTags[match[1]]) {
        tags.push(handleTags[match[1]]);
      }
      return tags.join(', ');
    })();

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
      const tags = $scope.additionalShopifyTags ? $scope.additionalShopifyTags.split(',').map(_=>_.trim()) : [];
      if($scope.lot.unmanifested) {
        tags.push('unmanifested');
      }
      else {
        tags.push('manifested');
      }
      tags.push(lotStore.packagingType || $scope.lotPackagingType);
      tags.push('review');

      tags.push( conditionTag( $scope.lot.type ) );

      if( $scope.asIs ) {
        tags.push('as-is');
      }

      return tags.filter( _ => _ ).join(', ');// remove any empty tags then join as a CSV string before returning
    };

    const estimatedRetailValue = lotStore.getEstimatedRetailValue();
    //Form default values
    $scope.listing = {
      marketplace: $scope.lot.destinationMarketplace || 'wholesaleninjas',
      // bstock defaults
      auctionStartPrice: '300',
      shopifyPrice: estimatedRetailValue ? (.2*parseFloat(estimatedRetailValue)).toFixed(2) : '',
      condition: ({'shelf-pull': 'Shelf Pulls','customer returns': 'Customer Returns','salvage': 'Salvage'})[$scope.lot.type] || '',
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
      $scope.invalidAuctionPrice = ($scope.listing.auctionStartPrice && $scope.listing.auctionStartPrice.match(/[0-9]+/)) ? false : true;
      $scope.noChargeType = $scope.listing.shipping.chargeType ? false : true;

      $scope.noBstockCondition = $scope.listing.condition ? false : true;
      $scope.noBstockCategory = $scope.listing.category ? false : true;
      $scope.noBstockPackaging = $scope.listing.packaging ? false : true;
      $scope.bstockTitleTooLong = listingTitleVerifier.tooLong($scope.lot.listingData.title).bstock;

      if($scope.listing.shipping.chargeType===bstockFormConstants.shippingChargeType['Fixed Cost']) {
        $scope.invalidShippingCharge = ($scope.listing.shipping.charge && $scope.listing.shipping.charge.match(/[0-9]+/)) ? false : true;
        $scope.noCarrier = $scope.listing.shipping.carrier ? false : true;
      }
      else {
        $scope.invalidShippingCharge = $scope.noCarrier = false;
      }

      if($scope.invalidAuctionPrice || $scope.noChargeType || $scope.invalidShippingCharge || $scope.noCarrier || $scope.noBstockPackaging || $scope.noBstockCategory || $scope.noBstockCondition || $scope.bstockTitleTooLong) {
        return false;
      }
      return true;
    }

    function validateShopifyListingOptions() {
      $scope.invalidShopifyPrice = ($scope.listing.shopifyPrice && $scope.listing.shopifyPrice.match(/^[0-9]+(\.[0-9]{2})?$/)) ? false : true;
      $scope.invalidShopifyInventory = ($scope.listing.shopifyInventory && ($scope.listing.shopifyInventory >= 0)) ? false : true;
      $scope.invalidUnitCount = $scope.totalUnits <= 0 && !lotStore.unmanifested;

      $scope.noPackagingType = !$scope.lotPackagingType;

      if($scope.invalidShopifyPrice || $scope.invalidAdditionalShopifyTags || $scope.invalidShopifyInventory) {
        return false;
      }
      if($scope.invalidUnitCount) {
        return false;
      }
      if($scope.noPackagingType) {
        return false;
      }      

      return true;
    }

    function validateListingOptions() {
      if($scope.listing.marketplace=='bstock') {
        return validateBstockListingOptions();
      }
      else if($scope.listing.marketplace=='wholesaleninjas') {
        return validateShopifyListingOptions();
      }
    }

    $scope.submitListing = async function() {

      Promise.resolve({}).then(()=>{
        console.log($scope.listing);
      });

      $scope.noMarketplace = $scope.listing.marketplace ? false : true;
      if($scope.noMarketplace) {
        return;
      }

      $scope.listing.shopifyTags = getShopifyTags();

      if(!validateListingOptions()) {
        return;
      }

      $scope.waitingForResponse = true;

      if($scope.totalUnits!==$scope.lot.totalUnits) {
        $scope.lot.totalUnits = $scope.totalUnits;
        await saveLot($scope.lot);
      }

      $http.post('/api/listings/submit', { lotId: lotStore._id, listing: $scope.listing, publish: $scope.publish }).then(resp=>{
        console.log(resp);
        if(resp.data.error) {
          messageModal.launch({header: 'Error', body: resp.data.error, type: 'error'});
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
          $scope.waitingForResponse = false;
        });
    };

    $scope.backToLotDetails = function() {
      navigate.viewLot( lotStore._id );
    };

  }
]);