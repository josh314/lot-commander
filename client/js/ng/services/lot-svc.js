import angular from 'angular';

import * as path from 'path';
import * as util from '../../utilities';
import * as api from '../../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [

  '$q',
  '$stateParams',
  'CounterSvc',
  'InventoryPallet',
  'Lot',
  'ManifestFileHandlerSvc',

  function(

    $q,
    $stateParams,
    CounterSvc,
    InventoryPallet,
    Lot,
    ManifestFileHandlerSvc,

  ) {

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

      load: ( { populate, hydratePallet, hydratePalletNoDocuments } = {} ) => $q.when( _get( $stateParams.lotId, { populate, hydratePallet, hydratePalletNoDocuments } ).then( async _lot => {

        const lot = new Lot( _lot );

        if( lot.manifestId ) {

          await $q.when( api.getManifest( lot.manifestId ) ).then( manifest => {
            lot.setInventory( manifest.inventory );
          });

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
  'PrintSvc',
  'ProductDataSvc',

  function(
    $q,
    $sce,
    dbEnums,
    ManifestFileHandlerSvc,
    MediaSvc,
    PrintSvc,
    ProductDataSvc
  ) {

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
        this.inventory = [];
        this.manifestId = undefined;
        this.thirdPartyManifests = [];
        this.manifestFileLocation = undefined;

        // images
        this.images = [];

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

        for( let item of this.inventory ) {
          item.errors = {};
        }

      }

      clone() {

        // the loaded manifest is not serializable due to circular references, so we need to remove it before stringifying
        let originalManifest = this.manifest;
        if( originalManifest ) {
          delete this.manifest;
        }

        const clone = new Lot( JSON.parse( JSON.stringify( this ) ) );
        this.manifest = originalManifest;

        return clone;

      }

      /*****************************************
       * Synthetic data fields
       *
       **********/

      isBoxedLot() { return this.packagingType === 'box lot'; }
      isPallet() { return !!this.packagingType.match(/pallet/); }
      isCasePacked() { return this.type === 'case-packed'; } // type is condition

      hasListing() {
        return this.submittedListings && this.submittedListings.length>0 && this.submittedListings.find(l => l.success);
      }

      hasScannedManifest() {
        return !this.unmanifested && this.inventory && this.inventory.length > 0;
      }

      inventoryHasBrandInfo() {
        return !!( this.inventory && this.inventory.find( item => item.brand ) );
      }

      isManifestFileLoaded() {
        return !!this.manifest;
      }

      manifestFilename() {
        return this.manifestFileLocation ? path.basename(this.manifestFileLocation) : '';
      }

      /****************************************
       * Getters
       *
       ***********/

      getInventorySortedByBarcode() {
        // Going through these gymnastics since Array.sort() is an inplace action

        // get a new array composed just of the sorting values and their original array indices
        const mapped = this.inventory.map( (item,i) => { return { index: i, value: item.barcode }; });

        // inplace sort new array
        mapped.sort(function(a, b) {
          if (a.value > b.value) {
            return 1;
          }
          if (a.value < b.value) {
            return -1;
          }
          return 0;
        });

        // Use the new sorted array of indices to traverse the original array
        return mapped.map(e => this.inventory[e.index]);
      }

      getInventoryItemByBarcode(barcode) {
        return this.inventory.find( item => item.barcode == barcode );
      }

      getInventoryTotal() {
        return this.inventory.reduce( (acc,val) => { return acc + val.quantity; }, 0);
      }

      getNumSku() {
        return this.inventory.length;
      }

      getEstimatedRetailValue() {
        let value;
        if(this.estimatedRetailValue) {
          value = this.estimatedRetailValue;
        }
        else if(this.inventory) {
          value = this.inventory.reduce( (total, item)=>{
            return item.price && item.quantity ? total + parseInt(item.quantity)*parseFloat(item.price) : total;
          }, 0);
        }
        return value ? value.toFixed(2) : '';
      }

      getBodyHtml() {
        return this.listingData && this.listingData.body ? $sce.trustAsHtml( this.listingData.body ) : '';
      }


      /****************************************
       * Brands
       *
       ***********/

      async refreshInventoryProductData() {

        if( !this.hasScannedManifest() ) {
          return;
        }

        const barcodes = this.inventory.map( item => item.barcode );

        const { products } = await ProductDataSvc.bulkGetProductData( barcodes );

        for( let product of products ) {

          if( product && product.item && product.item.brand ) {

            const found = this.inventory.find( item => item.barcode === product.upc );

            if( found ) {
              found.brand = product.item.brand;
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
          manifestItems = this.inventory;
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

        // This is a bit of a hack to ensure that the manifest is not included in the lot data. Besides being unnecessary, it can't be serialized since it contains circular references
        let manifest;
        if( this.manifest ) {
          manifest = this.manifest;
          delete this.manifest;
        }

        const _lot = Object.assign( {}, this );

        this.manifest = manifest;

        return $q.when( api.editLot( this._id, _lot ) );
      }

      /*****************************************
       * Inventory
       *
       **********/

      // inventory & manifests
      setInventory( _inventory ) {
        this.inventory = _inventory.map(i=> i.quantity<0 ? Object.assign(i,{quantity:0}) : i );
        return this.inventory;
      }

      saveManifest() {
        // This filters out completely empty lines
        this.inventory = this.inventory.filter( item => {

          if( !item.quantity ) {
            return false;
          }

          if( item.barcode || item.description || item.quantity || item.price ) {
            return true;
          }

          return false;

        });

        this.updateTotalUnits();

        const inventory = [];
        for( let item of this.inventory ) {
          if( item.quantity ) {

            const _ = Object.assign( {}, item );
            delete _.errors;

            inventory.push( _ );

          }
        }

        return $q.when( api.saveLotManifest( this._id, inventory ) );

      }

      updateTotalUnits() {
        this.totalUnits = this.inventory ? this.inventory.reduce((sum,item) => sum + parseInt(item.quantity), 0) : 0 ;
        return this.totalUnits;
      }

      addInventory(newBarcode) {
        let item;
        if(!newBarcode) {
          item = { quantity: 0, errors: {} };
        }
        else if(/[0-9]{8,15}/.test(newBarcode)) {
          const idx = this.inventory.findIndex(i => i.barcode == newBarcode);
          if(idx>=0) {
            item = this.inventory[idx];
            item.quantity += 1;
            this.inventory.splice(idx, 1);
          }
          else {
            item = {
              barcode: newBarcode,
              quantity: 1
            };
          }
          this.totalUnits += 1;
        }
        this.inventory = [item].concat(this.inventory);
        return item;
      }

      decrementInventory(barcode) {
        var idx = this.inventory.findIndex(item => item.barcode == barcode);
        if(idx >= 0) {
          if(this.inventory[idx].quantity > 1) {
            this.inventory[idx].quantity -= 1;
            if(this.inventory[idx].validated == this.inventory[idx].quantity + 1) {
              this.inventory[idx].validated -= 1;
            }
          }
          else {
            this.inventory.splice(idx,1);
          }
          this.totalUnits -= 1;
        }
      }

      deleteInventoryItemByIndex( idx ) {
        if(idx >= 0) {
          this.totalUnits -= this.inventory[idx].quantity;
          this.inventory.splice(idx,1);
        }
      }

      deleteInventoryItem( item ) {
        const idx = this.inventory.findIndex( _item => _item === item );
        return this.deleteInventoryItemByIndex( idx );
      }

      inventoryItemHasErrors( item ) {
        return Object.values( item.errors ).reduce( ( acc, val ) => acc || val, false);
      }

      validateInventory() {

        const barcodes = new Set();

        for( let i=0; i<this.inventory.length; i++ ) {

          const item = this.inventory[i];
          item.errors = {};

          if( barcodes.has( item.barcode ) ) {

            item.errors.duplicateBarcode = true;

            for( let j=0; j<i; j++ ) {
              if( this.inventory[j].barcode === item.barcode ) {
                this.inventory[j].errors.duplicateBarcode = true;
              }
            }

          }
          else {
            barcodes.add( item.barcode );
          }

          item.errors.price = item.price && !util.priceRegex.test( item.price );

        }

        return !this.inventory.find( this.inventoryItemHasErrors.bind( this ) );

      }

      composeInventoryErrorsHtmlMessage() {

        const invalidPriceBarcodes = [];
        const duplicateBarcodes = new Set();

        for( let item of this.inventory ) {

          if( item.errors.price ) {
            invalidPriceBarcodes.push( item.barcode );
          }

          if( item.errors.duplicateBarcode ) {
            duplicateBarcodes.add( item.barcode );
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

        PrintSvc.printLotShippingItemsLabels( this._id );

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

      uploadMedia( media, mediaType ) {

        return MediaSvc.uploadLotMedia( this._id, media, mediaType ).then( ({ lot }) => {

          if( lot ) {

            const arr = this.getMediaArray( mediaType );

            // this roundabout way of updating the images is to ensure that the images array is mutated but the reference stays the same
            arr.splice( 0, arr.length );
            for( let _media of lot[ mediaType ] ) {
              arr.push( _media );
            }

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