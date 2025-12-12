import angular from 'angular';

import * as path from 'path';
import * as api from '../../api';
import * as print from '../../print';

/********************* Helpers ***/
function cmpLotInventoryData( a, b ) {

  if( a.barcode && b.barcode && a.barcode !== b.barcode ) {
    return a.barcode < b.barcode ? -1 : +1;
  }
  else if ( a.description && b.description && a.description !== b.description ) {
    return a.description < b.description ? -1: +1;
  }
  else if ( a.brand && b.brand && a.brand !== b.brand ) {
    return a.brand < b.brand ? -1: +1;
  }
  else if ( a.price && b.price && a.price !== b.price ) {
    return a.price < b.price ? -1: +1;
  }
  else if ( a.quantity && b.quantity && a.quantity !== b.quantity ) {
    return a.quantity < b.quantity ? -1 : +1;
  }
  else {
    return 0;
  }

}

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [

  '$interval',
  '$q',
  '$stateParams',
  'CounterSvc',
  'InventoryPallet',
  'Lot',
  'ManifestFileHandlerSvc',

  function(

    $interval,
    $q,
    $stateParams,
    CounterSvc,
    InventoryPallet,
    Lot,
    ManifestFileHandlerSvc,

  ) {

    /*************************************************
     * Media Polling
     *
     ********************/

    const __MEDIA_POLL_INTERVAL_MS__ = 30*1000;

    const mediaPollers = {};

    const mediaPollerKey = ( lotId, mediaId, mediaType ) => `${ lotId }-${ mediaType }-${ mediaId }`;

    function getMediaPoller( lotId, mediaId, mediaType ) {
      const key = mediaPollerKey( lotId, mediaId, mediaType );
      return mediaPollers[ key ];
    }

    function cancelMediaPoller( lotId, mediaId, mediaType ) {
      const key = mediaPollerKey( lotId, mediaId, mediaType );
      const poller = mediaPollers[ key ];
      if( poller ) {
        $interval.cancel( poller.fn );
        delete mediaPollers[ key ];
        console.log('canceled poller for', key);
      }
    }

    // This method create a repeated callback invocation that will check if the media is done processing.
    // If this is called multiple times for the same media on the same lotId, it will not create a new poller
    // but will transfer the existing poller to the current lot object. This is useful when a poller is created for one lot object but
    // then the user navigates away to a different page with loads a new lot object of the same lotId.
    function createMediaPoller( lot, mediaId, mediaType ) {

      const key = mediaPollerKey( lot._id, mediaId, mediaType );

      if( mediaPollers[ key ] ) {
        console.log('poller already exists for', key);

        // update the lot reference. i.e. hand the poller over to the current version of this lot
        mediaPollers[ key ].lot = lot;
        return mediaPollers[ key ];
      }

      console.log('creating media poller for', key );
      const fn = $interval( function() {

        const lotId = lot._id;

        return $q.when( api.getLotMedia( lotId, mediaId, mediaType ) ).then( ({ media }) => {

          console.log( 'polling for media:', key );
          if( !media ) {
            console.log(`No media found for ${ key }`);
            return cancelMediaPoller( lotId, mediaId, mediaType );
          }

          if( !media.isProcessing ) {

            const poller = getMediaPoller( lotId, mediaId, mediaType );
            if( poller ) {

              const arr = poller.lot.getMediaArray( mediaType );
              const idx = arr.findIndex( _ => _._id === mediaId );
              if( idx > -1 ) {
                arr[ idx ] = media;
              }

              // poller.lot.refreshMediaArray( [ ...arr ], mediaType );

            }

            // we're now done with the interval and can cancel it
            console.log(`Media ${ mediaId } is done processing`);
            return cancelMediaPoller( lotId, mediaId, mediaType );

          }
          console.log( `active media pollers:`, mediaPollers );
        });

      }, __MEDIA_POLL_INTERVAL_MS__ );


      mediaPollers[ key ] = {
        lot,
        fn
      };
      return mediaPollers[ key ];

    }


    async function _get( lotId, { populate, hydratePallet, hydratePalletNoDocuments } = {} ) {

      const lot = await $q.when( api.getLot( lotId, { populate } ) );

      if( lot && lot.pallet ) {
        if( hydratePallet ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: true } );
        }
        else if( hydratePalletNoDocuments ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: false } );
        }
      }

      return lot;
    }


    async function getLotByHandle( handle, { populate, hydratePallet, hydratePalletNoDocuments } = {} ) {

      const lot = await $q.when( api.getLotByHandle( handle, { populate } ) );

      if( lot && lot.pallet ) {
        if( hydratePallet ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: true } );
        }
        else if( hydratePalletNoDocuments ) {
          lot.pallet = new InventoryPallet( lot.pallet, { loadDocuments: false } );
        }
      }

      return lot;
    }

    return {

      Lot,

      createMediaPoller,

      clone: lot => (lot instanceof Lot) ? lot.clone() : new Lot( lot ),

      cloneImages: ( lotId, images ) => $q.when( api.cloneImagesToLot( lotId, images ) ),

      count: query => $q.when( api.countLots( query ) ),

      create: data => $q.when( api.createLot( data ) ),

      delete: lotId => $q.when( api.deleteLot( lotId ) ),

      edit: ( lotId, data ) => $q.when( api.editLot( lotId, data ) ),

      // this increments the lot number counter, and returns the lot number
      generateLotNumber: () => CounterSvc.incrementPalletLotCounter().then( counter => ({ lotNumber: counter.count }) ),

      // this increments the lot number counter, attaches to appropriate lot, and returns the lot
      generateLotNumberForLot: lotId => $q.when( api.generateLotNumberForLot( lotId ) ),

      generateManifest: ( lotId, save, bstock ) => $q.when( api.generateLotManifest( lotId, save, bstock) ),

      get: ( lotId, { populate, hydratePallet, hydratePalletNoDocuments } = {} ) => $q.when( _get( lotId, { populate, hydratePallet, hydratePalletNoDocuments } ) ),

      getLotByHandle,

      getManifest: manifestId => $q.when( api.getManifest( manifestId ) ),

      getManifestFile: ( lotId, isPrivate ) => $q.when( api.getManifestFile( lotId, isPrivate ) ),

      hydrateLot: data => new Lot( data ),

      import3rdPartyManifestBlock: ( lot, blockId ) => $q.when( api.import3rdPartyManifestBlock({ lot, blockId }) ),

      addImages: ( lotId, images ) => $q.when( api.addLotImages( lotId, images ) ),

      list: ( { filter, sort, num, page } ) => {

        const query = {
          num,
          page
        };

        Object.assign( query, filter );

        if( sort && sort.key ) {
          query.sort = sort.key;
          query.sort_dir = sort.ascending ? 1 : -1;
        }

        return $q.when( api.listLots( query ) ).then( lots => {
          if( !lots ) {
            return [];
          }

          return lots;

        });
      },

      load: ( { populate, hydratePallet, hydratePalletNoDocuments, pollProcessingMedia } = {} ) => $q.when( _get( $stateParams.lotId, { populate, hydratePallet, hydratePalletNoDocuments } ).then( async _lot => {

        const lot = new Lot( _lot );

        if( lot.manifestId ) {

          await $q.when( api.getManifest( lot.manifestId ) ).then( manifest => {
            lot.setInventory( manifest.inventory );
          });

        }

        if( pollProcessingMedia ) {
          lot.startPollingForMediaFinishedProcessing( 'images' );
          lot.startPollingForMediaFinishedProcessing( 'videos' );
        }

        return lot;
      }) ),

      loadManifestFile: ( lotId, manifestFilename ) => {

        return $q.when( api.getLotManifestFile( lotId ) ).then( data => {

          ManifestFileHandlerSvc.parse(
            data,
            manifestFilename || 'temp.xlsx',
            { skipLastRows: 1 }, //note we are assuming the last row is a totals row
          );

          return ManifestFileHandlerSvc.getActiveManifest();

        });

      },

    };

  }
]);


/******************* Lot class ***/
angular.module('myApp').factory( 'Lot', [

  '$q',
  '$sce',
  'dbEnums',
  'ManifestFileHandlerSvc',
  'MediaSvc',
  'ProductDataSvc',
  'ServiceLocator',

  function(

    $q,
    $sce,
    dbEnums,
    ManifestFileHandlerSvc,
    MediaSvc,
    ProductDataSvc,
    ServiceLocator,

  ) {

    let LotSvc;

    class LotInventoryItem {

      constructor( data, lot ) {

        this.lot = lot;
        this.data = JSON.parse( JSON.stringify(data) ); // deep clone
        this.isDirty = false;
        this.errors = {};

        // validation and normalization
        this.data.quantity = parseInt(this.data.quantity);
        if( this.data.quantity<0 || isNaN( this.data.quantity )  ) {
          this.data.quantity = 0;
        }
        this.data.title = this.data.title || this.data.description;

        if( this.data.barcode && ProductDataSvc.isAsin( this.data.barcode ) ) {
          this.barcodeIsAsin = true;
          this.data.asin = this.data.asin || this.data.barcode;
        }

        if( !Array.isArray( this.data.images ) ) {
          this.data.images = [];
        }
      }

      setAsDirty() {
        this.isDirty = true;
      }

      validate( { allowMissingTitle, allowMissingPrice, allowMissingImages } = {} ) {
        this.resetErrors();
        const titleValid = this.validateTitle( allowMissingTitle );
        const quantityValid = this.validateQuantity();
        const priceValid = this.validatePrice( allowMissingPrice );
        const imagesValid = this.validateImages( allowMissingImages );
        return quantityValid && priceValid && titleValid && imagesValid;
      }

      validateTitle( allowMissingTitle ) {

        const titleError = allowMissingTitle ? false : !this.data.title || this.data.title.length === 0;

        this.errors.title = titleError;

        return !titleError;
      }

      validateQuantity() {
        const quantityError = this.data.quantity === undefined || this.data.quantity === null || isNaN(this.data.quantity) || parseInt(this.data.quantity) < 0;

        this.errors.quantity = quantityError;

        return !quantityError;
      }

      validatePrice( allowMissingPrice ) {

        const priceError = ( allowMissingPrice && !this.data.price ) ? false : !ProductDataSvc.isPrice( this.data.price );

        this.errors.price = priceError;

        return !priceError;
      }

      validateImages( allowMissingImages ) {

        const imagesError = allowMissingImages ? false : !Array.isArray( this.data.images ) || this.data.images <= 0;

        this.errors.images = imagesError;

        return !imagesError;

      }

      resetErrors() {
        this.errors = {};
      }

      hasError() {
        return Object.values( this.errors ).reduce( ( acc, val ) => acc || val, false);
      }

      addFallbackData() {

        if( this.hasError() ) {

          if( this.errors.title ) {
            this.data.title = ProductDataSvc.productTitleForCategory( this.lot.category );
          }

          if( this.errors.quantity ) {
            this.data.quantity = 0;
          }

          if( this.errors.price ) {
            this.data.price = ProductDataSvc.fillerPrice();
          }

          this.validate();

        }

      }

      update( _data ) {
        Object.assign( this.data, _data );
        this.setAsDirty();
        this.validate();
      }

    }

    class Lot {

      constructor( data ) {

        // identifiers
        this.handle = undefined;
        this.lotNumber = undefined;
        this._id = undefined;

        // top-level metadata
        this.description = undefined;
        this.type = undefined;
        this.category = undefined;
        this.status = dbEnums.lotStatus[0];

        // manifest & inventory
        this.totalUnits = 0;
        this.estimatedRetailValue = undefined;
        this.priceValuePercentage = undefined;
        this.unmanifested = false;
        this._inventory = [];
        this.manifestId = undefined;
        this.thirdPartyManifests = [];
        this.manifestFileLocation = undefined;

        // media
        this.images = [];
        this.videos = [];

        // listing and order information
        this.listingData = {};
        this.submittedListings = [];
        this.destinationMarketplace = undefined;
        this.listedDate = undefined;
        this.soldDate = undefined;
        this.shippedDate = undefined;

        // shipping properties
        this.numBoxes = undefined;
        this.packagingType = undefined;
        this.shippingItems = [];

        // link to pallet
        this.pallet = undefined;

        this.isDeleted = false;

        if( data ) {
          Object.assign( this, data );
        }

        for( let item of this._inventory ) {
          item.errors = {};
        }

        LotSvc = ServiceLocator.get( 'LotSvc' );

      }

      clone() {

        // the loaded manifest is not serializable due to circular references, so we need to remove it before stringifying
        const originalManifest = this.manifest;
        if( originalManifest ) {
          delete this.manifest;
        }

        // LotInventoryItems are not serializable due to circular references, so we need to remove before stringifying
        const rawInventory = this.getInventoryDataItems();
        if( this._inventory ) {
          delete this._inventory;
        }

        const clone = new Lot( JSON.parse( JSON.stringify( this ) ) );
        this.manifest = originalManifest;
        this.setInventory( rawInventory );

        return clone;

      }

      /*****************************************
       * Synthetic data fields
       *
       **********/

      isBoxedLot() { return this.packagingType === 'box lot'; }
      isPallet() { return !!this.packagingType.match(/pallet/); }
      isCasePacked() { return this.type === 'case-packed'; } // type is condition

      hasInventory() {
        return this._inventory && this._inventory.length > 0;
      }

      hasListing() {
        return this.submittedListings && this.submittedListings.length>0 && this.submittedListings.find(l => l.success);
      }

      hasScannedManifest() {
        return !this.unmanifested && this._inventory && this._inventory.length > 0;
      }

      inventoryHasBrandInfo() {
        return !!( this._inventory && this._inventory.find( item => item.data.brand ) );
      }

      isManifestFileLoaded() {
        return !!this.manifest;
      }

      manifestFilename() {
        return this.manifestFileLocation ? path.basename(this.manifestFileLocation) : '';
      }

      hasAsins() {
        return this._inventory && this._inventory.some( item => item.data.asin );
      }

      serializedInventory() {

        const sortedInventoryData = [ ...this._inventory ].map( item => {

          const _data = { ...item.data };

          if( _data.price ) {
            _data.price = parseFloat( _data.price );
          }
          return _data;

        } ).sort( cmpLotInventoryData );

        return JSON.stringify( sortedInventoryData );
      }

      numInventoryItemsInvalid() {
        return this._inventory.filter( item => item.hasError() ).length;
      }

      /****************************************
       * Getters
       *
       ***********/

      getInventory() {
        return this._inventory;
      }

      getInventoryDataItems() {
        return this._inventory.map( item => item.data );
      }

      getInventorySortedByBarcode() {

        const copy = [ ...this._inventory ];

        // inplace sort new array
        copy.sort(function(a, b) {
          if (a.data.barcode > b.data.barcode) {
            return 1;
          }
          if (a.data.barcode < b.data.barcode) {
            return -1;
          }
          return 0;
        });

        return copy;
      }

      getInventoryDataSortedByBarcode() {
        return this.getInventorySortedByBarcode().map( item => item.data );
      }

      getInventoryItemByBarcode(barcode) {
        return this._inventory.find( item => item.data.barcode == barcode );
      }

      getInventoryTotal() {
        return this._inventory.reduce( (acc,val) => { return acc + val.data.quantity; }, 0);
      }

      getNumSku() {
        return this._inventory.length;
      }

      getEstimatedRetailValue() {
        let value;
        if(this.estimatedRetailValue) {
          value = this.estimatedRetailValue;
        }
        else if(this._inventory) {
          value = this._inventory.reduce( (total, item)=>{
            return item.data.price && item.data.quantity ? total + parseInt(item.data.quantity)*parseFloat(item.data.price) : total;
          }, 0);
        }
        return value ? value.toFixed(2) : '';
      }

      getBodyHtml() {
        return this.listingData && this.listingData.body ? $sce.trustAsHtml( this.listingData.body ) : '';
      }

      /****************************************
       * Status
       *
       ***********/

      setStatus( status ) {
        const idx = dbEnums.lotStatus.find( _status => status == _status );
        if( idx < 0 ) {
          throw new Error(`Invalid lot status: ${ status }`);
        }

        this.status = status;
      }

      statusIsAtLeast( status ) {
        const idx = dbEnums.lotStatus.find( _status => status == _status );
        if( idx < 0 ) {
          throw new Error(`Invalid lot status: ${ status }`);
        }

        return this.getStatusIndex() >= idx;
      }

      getStatusIndex() {
        return dbEnums.lotStatus.find( _status => this.status == _status );
      }

      markAsReviewed() {

        if( !this.statusIsAtLeast( 'Reviewed' ) ) {
          this.setStatus( 'Reviewed' );
        }

      }

      /****************************************
       * Brands
       *
       ***********/

      async refreshInventoryProductData() {

        if( !this.hasScannedManifest() ) {
          return;
        }

        const barcodes = this._inventory.map( item => item.data.barcode );

        const { products } = await ProductDataSvc.bulkGetProductData( barcodes );

        for( let product of products ) {

          if( product && product.item && product.item.brand ) {

            const found = this._inventory.find( item => item.data.barcode === product.upc );

            if( found ) {
              found.data.brand = product.item.brand;
            }

          }

        }

        return this.saveManifest();

      }

      async refreshManifestFileProductData() {

        const products = await this.getProductDataFromManifestFile();

        if( !this.manifest ) {
          return;
        }

        const sheet = this.manifest.getActiveSheet();

        for( let product of products.filter( _ => _ && _.upc ) ) {

          if( product.brand ) {
            sheet.setBrandForBarcode( product.upc, product.brand );
          }
          if( product.title ) {
            sheet.setDescriptionForBarcode( product.upc, product.title );
          }

        }

        const isPretty = true;
        return this.saveCurrentManifestAsFile( this.manifestFilename(), isPretty );

      }

      async guaranteeBrandInfo() {

        if( this.hasScannedManifest() ) {

          if( !this.inventoryHasBrandInfo() ) {

            await this.refreshInventoryProductData();

          }

        }
        else if( this.manifestFileLocation ) {

          if( !this.isManifestFileLoaded() ) {
            await this.loadManifestFile();
          }

          if( this.manifest ) {

            if( !this.manifest.hasBrandInfo() ) {
              await this.refreshManifestFileProductData();
            }

          }

        }

      }

      manifestItem2BrandItem( manifestItem ) {

        if( this.hasScannedManifest() ) {
          return {
            brand: manifestItem.brand,
            barcode: manifestItem.barcode,
            description: manifestItem.description,
            quantity: manifestItem.quantity,
            price: manifestItem.price
          };
        }
        else if ( this.manifestFileLocation ) {
          const sheet = this.manifest.getActiveSheet();
          const brandColumnName = sheet.getBrandColumnName();
          const barcodeColumnName = sheet.getBarcodeColumnName();
          const descriptionColumnName = sheet.getDescriptionColumnName();
          const quantityColumnName = sheet.getQuantityColumnName();

          return {
            brand: brandColumnName ? manifestItem[ brandColumnName ] : '',
            barcode: barcodeColumnName ? manifestItem[ barcodeColumnName ] : '',
            description: descriptionColumnName ? manifestItem[ descriptionColumnName ] : '',
            quantity: quantityColumnName ? manifestItem[ quantityColumnName ] : '',
            price: sheet.getUnitPrice( manifestItem ),
          };
        }

      }

      async getBrandItems() {

        await this.guaranteeBrandInfo();

        let manifestItems;

        if( this.hasScannedManifest() ) {
          manifestItems = this.getInventoryDataItems();
        }
        else if ( this.manifestFileLocation ) {
          manifestItems = this.manifest.getActiveSheet().rows;
        }
        else {
          return [];
        }

        const _brandsItems = manifestItems.map( this.manifestItem2BrandItem.bind( this ) );

        const brandItemsListsMap = _brandsItems.reduce( ( acc, brandItem ) => {

          if( brandItem.barcode && brandItem.brand && brandItem.quantity ) {

            const existingBrandItemList = acc.get( brandItem.brand );

            if( existingBrandItemList ) {
              existingBrandItemList.push( brandItem );
            }
            else {
              acc.set( brandItem.brand, [ brandItem ] );
            }

          }

          return acc;
        }, new Map() );

        const brandItems = [ ...brandItemsListsMap.entries() ].map( ([ brand, _brandItems ]) => Object.assign( {}, { brand, items: _brandItems } ) );
        return brandItems;

      }

      async getBrandsAggregation() {

        let brandItems = await this.getBrandItems();

        let agg;

        if( Array.isArray( brandItems ) ) {

          agg = brandItems.map( _ => {
            return {
              brand: _.brand,
              quantity: _.items.reduce( ( acc, item ) => acc + parseInt( item.quantity ), 0 ),
              value: _.items.reduce( ( acc, item ) => acc + parseInt( item.quantity ) * parseFloat( item.price ), 0 )
            };
          });

        }

        return agg;

      }

      async getBrandsByMostUnits() {

        const brandCounts = await this.getBrandsAggregation();
        return brandCounts ? brandCounts.sort( ( a, b ) => b.quantity - a.quantity ).map( _ => _.brand ) : [];

      }

      async getBrandsByMostValue() {

        const brandCounts = await this.getBrandsAggregation();
        return brandCounts ? brandCounts.sort( ( a, b ) => b.value - a.value ).map( _ => _.brand ) : [];

      }

      /*****************************************
       * Setters & mutators
       *
       **********/

      save() {

        // the manifest and inventory have circular references, so we need to remove
        // them before serializing for the editLot request. These elements are saved elsewhere, anyway

        const _lot = Object.assign( {}, this );

        if( _lot._inventory ) {
          delete _lot._inventory;
        }
        if( _lot.manifest ) {
          delete _lot.manifest;
        }

        return $q.when( api.editLot( this._id, _lot ) );
      }

      /*****************************************
       * Inventory
       *
       **********/

      // inventory & manifests
      setInventory( _inventory ) {
        this._inventory = _inventory.map( i => new LotInventoryItem( i, this ) );
        return this._inventory;
      }

      saveManifest() {
        // This filters out completely empty lines
        this._inventory = this._inventory.filter( item => {

          if( !item.data.quantity ) {
            return false;
          }

          if( item.data.barcode || item.data.description || item.data.quantity || item.data.price ) {
            return true;
          }

          return false;

        });

        this.updateSyntheticFieldsFromInventory();

        const inventoryData = [];
        for( let item of this._inventory ) {
          if( item.data.quantity ) {

            inventoryData.push( { ...item.data } );

          }
        }

        return this.saveManuallyInputProductData().then( _ => {

          return $q.when( api.saveLotManifest( this._id, inventoryData ) );

        });

      }

      saveManuallyInputProductData() {

        if( !this._inventory ) {
          return Promise.resolve();
        }

        const dirtyProductData = this._inventory.filter( item => item.isDirty ).map( item => {
          const data = { ...item.data };
          if( data.quantity ) {
            delete data.quantity;
          }
          return data;
        });

        if( dirtyProductData.length === 0 ) {
          return Promise.resolve();
        }

        return ProductDataSvc.saveInternalProductData( dirtyProductData );

      }

      updateSyntheticFieldsFromInventory() {
        this.updateTotalUnits();
        this.updateEstimatedRetailValue();
      }


      updateTotalUnits() {
        this.totalUnits = this._inventory ? this._inventory.reduce((sum,item) => sum + parseInt(item.data.quantity), 0) : 0 ;
        return this.totalUnits;
      }

      updateEstimatedRetailValue() {
        this.estimatedRetailValue = this._inventory ? this._inventory.reduce((sum,item) => {
          return sum + ( item.data.price && item.data.quantity ? parseInt(item.data.quantity)*parseFloat(item.data.price) : 0 );
        }, 0) : 0;
        return this.estimatedRetailValue;
      }

      addInventory(newBarcode) {
        let item;
        if(!newBarcode) {
          item = new LotInventoryItem( { quantity: 0 } );
        }
        else {
          const idx = this._inventory.findIndex(i => i.data.barcode == newBarcode);
          if(idx>=0) {
            item = this._inventory[idx];
            item.data.quantity += 1;
            // remove the item because we will add it back later at the top of the inventory
            this._inventory.splice(idx, 1);
          }
          else {
            item = new LotInventoryItem({
              barcode: newBarcode,
              quantity: 1
            });
          }
          this.totalUnits += 1;
        }
        this._inventory = [item].concat(this._inventory);
        return item;
      }

      decrementInventory(barcode) {
        var idx = this._inventory.findIndex(item => item.barcode == barcode);
        if(idx >= 0) {
          const item = this._inventory[idx];
          if(item.data.quantity > 1) {
            item.data.quantity -= 1;
          }
          else {
            this._inventory.splice(idx,1);
          }
          this.totalUnits -= 1;
        }
      }

      deleteInventoryItemByIndex( idx ) {
        if(idx >= 0) {
          this.totalUnits -= this._inventory[idx].data.quantity;
          this._inventory.splice(idx,1);
        }
      }

      deleteInventoryItem( item ) {
        const idx = this._inventory.findIndex( _item => _item === item );
        return this.deleteInventoryItemByIndex( idx );
      }

      validateInventory( options = {} ) {

        const barcodes = new Set();

        for( let i=0; i<this._inventory.length; i++ ) {
          const item = this._inventory[i];
          item.resetErrors();

          const barcode = item.data.barcode;

          if( barcodes.has( barcode ) ) {

            item.errors.duplicateBarcode = true;

            for( let j=0; j<i; j++ ) {
              if( this._inventory[j].data.barcode === barcode ) {
                this._inventory[j].errors.duplicateBarcode = true;
              }
            }

          }
          else {
            barcodes.add( barcode );
          }

          item.validate( options );

        }

        return !this._inventory.find( item => item.hasError() );

      }

      validateInventoryQuantity() {
        return this._inventory.every( item => item.validateQuantity() );
      }

      composeInventoryErrorsHtmlMessage() {

        const invalidQuantityBarcodes = [];
        const missingImageBarcodes = [];
        const invalidPriceBarcodes = [];
        const duplicateBarcodes = new Set();

        for( let item of this._inventory ) {

          if( item.errors.price ) {
            invalidPriceBarcodes.push( item.data.barcode );
          }

          if( item.errors.duplicateBarcode ) {
            duplicateBarcodes.add( item.data.barcode );
          }

          if( item.errors.images ) {
            missingImageBarcodes.push( item.data.barcode );
          }

          if( item.errors.quantity ) {
            invalidQuantityBarcodes.push( item.data.barcode );
          }

        }

        let msg = '';

        if( invalidPriceBarcodes.length ) {
          msg += `
              <h4>Invalid prices</h4>
              <ul>
                ${ invalidPriceBarcodes.map( barcode => `<li>${ barcode }</li>` ).join('') }
              </ul>
            `;
        }

        if( duplicateBarcodes.size ) {
          msg += `
              <h4>Duplicate barcodes</h4>
              <ul>
                ${ [ ...duplicateBarcodes ].map( barcode => `<li>${ barcode }</li>` ).join('') }
              </ul>
            `;
        }

        if( missingImageBarcodes.length ) {
          msg += `
              <h4>Missing images</h4>
              <ul>
                ${ missingImageBarcodes.map( barcode => `<li>${ barcode }</li>` ).join('') }
              </ul>
            `;
        }

        if( invalidQuantityBarcodes.length ) {
          msg += `
              <h4>Invalid quantity</h4>
              <ul>
                ${ invalidQuantityBarcodes.map( barcode => `<li>${ barcode }</li>` ).join('') }
              </ul>
            `;
        }

        return msg;

      }


      /*****************************************
       * Shipping items and labels
       *
       **********/

      saveShippingItems( shippingItems ) {
        return $q.when( api.editLot( this._id, { shippingItems } ) ).then( ( { lot } ) => {

          this.shippingItems = lot.shippingItems;
          this.packagingType = lot.packagingType;

          return this;
        });
      }

      printShippingItemsLabels() {

        print.printLotShippingItemsLabels( this._id );

      }

      /*****************************************
       * Manifest files
       *
       **********/

      loadManifestFile( ) {

        if( !this.manifestFileLocation ) {
          return $q.when( null );
        }

        return $q.when( api.getLotManifestFile( this._id ) ).then( data => {

          ManifestFileHandlerSvc.parse(
            data,
            this.manifestFileLocation,
            { skipLastRows: 1 }, //note we are assuming the last row is a totals row
          );

          const manifest = ManifestFileHandlerSvc.getActiveManifest();

          this.manifest = manifest;

          return manifest;

        });

      }

      saveCurrentManifestAsFile( filename, isPretty = false ) {

        if( !this.manifest ) {
          return $q.when( null );
        }

        return this.saveManifestAsFile( this.manifest, filename, isPretty );
      }

      saveManifestAsFile( manifest, filename, isPretty = false ) {

        const file = ManifestFileHandlerSvc.createFile( filename, manifest, isPretty );
        return $q.when( api.uploadLotManifestFile( this._id, file, filename ) );

      }

      async getProductDataFromManifestFile() {

        if( !this.isManifestFileLoaded() ) {
          await this.loadManifestFile();
        }

        return ProductDataSvc.getProductDataFromLoadedManifest( this.manifest );

      }

      /*****************************************
       * Media
       *
       **********/

      getMediaArray( mediaType ) {

        let arr;
        if( mediaType === 'images' ) {
          arr = this.images;
        }
        else if( mediaType === 'videos' ) {
          arr = this.videos;
        }
        else {
          throw new Error('Invalid media type.');
        }

        return arr;
      }

      uploadImages( images ) {

        return MediaSvc.uploadLotImages( this._id, images ).then( ({ lot }) => {

          // this roundabout way of updating the images is to ensure that the images array is mutated but the reference stays the same
          this.images.splice( 0, this.images.length );
          for( let image of lot.images ) {
            this.images.push( image );
          }

          return this;

        } );

      }

      startPollingForMediaFinishedProcessing( mediaType ) {

        const arr = this.getMediaArray( mediaType );

        for( let media of arr ) {

          if( media.isProcessing ) {

            LotSvc.createMediaPoller( this, media._id, mediaType );

          }

        }

      }

      refreshMediaArray( newMediaArray, mediaType ) {

        const arr = this.getMediaArray( mediaType );

        // this roundabout way of updating the media is to ensure that the media array contents are mutated but the reference to the array stays the same
        // we first clear the array with splice(), then push the new media objects
        arr.splice( 0, arr.length );
        for( let _media of newMediaArray ) {

          arr.push( _media );

        }

      }

      uploadMedia( media, mediaType ) {

        return MediaSvc.uploadLotMedia( this._id, media, mediaType ).then( ({ lot }) => {

          if( lot ) {

            this.refreshMediaArray( lot[ mediaType ], mediaType );

            this.startPollingForMediaFinishedProcessing( mediaType );

          }

          return this;

        });

      }

      removeImage( image ) {

        return this.removeMedia( image, 'images' );

      }

      removeMedia( media, mediaType ) {

        return MediaSvc.removeLotMedia( this._id, media, mediaType ).then( _ => {

          const arr = this.getMediaArray( mediaType );

          const removedMediaIdx = arr.findIndex( _media => _media._id === media._id );

          if( removedMediaIdx !== -1 ) {

            arr.splice( removedMediaIdx, 1 );

          }

          return this;

        });

      }

      // TODO: implement this properly. requires some juice on the server to keep track of processing tasks so they can be found and cancelled. Although this does is remove the metadata from lot
      cancelMediaProcessing( media, mediaType ) {

        return this.removeMedia( media, mediaType );

      }

      getMediaLink( media ) {
        return media.s3 ? `/api/media/?s3=${encodeURIComponent(media.s3)}` : media.filename;
      }

      /*****************************************
       * Listings
       *
       **********/

      getSubmittedListingLink( listing ) {

        let link;

        if( listing.shopify && listing.shopify.store && listing.shopify.productId ) {

          link = `https://admin.shopify.com/store/${ listing.shopify.store }/products/${ listing.shopify.productId }`;

        }

        return link;

      }

    }

    return Lot;
  }

]);