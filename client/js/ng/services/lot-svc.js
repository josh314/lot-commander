import angular from 'angular';

import * as util from '../../utilities';
import * as api from '../../api';

/******************* Service for managing lots ***/
angular.module('myApp').factory( 'LotSvc', [

  '$q',
  '$stateParams',
  'InventoryPallet',
  'Lot',
  'ManifestFileHandlerSvc',

  function(

    $q,
    $stateParams,
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

      clone: lot => new Lot( JSON.parse( JSON.stringify( lot ) ) ),

      cloneImages: ( lotId, images ) => $q.when( api.cloneImagesToLot( lotId, images ) ),

      count: query => $q.when( api.countLots( query ) ),

      create: data => $q.when( api.createLot( data ) ),

      delete: lotId => $q.when( api.deleteLot( lotId ) ),

      edit: ( lotId, data ) => $q.when( api.editLot( lotId, data ) ),

      generateLotNumber: lotId => $q.when( api.generateLotNumberForLot( lotId ) ),

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
  'ImageSvc',
  'ManifestFileHandlerSvc',
  'ProductDataSvc',

  function(
    $q,
    $sce,
    dbEnums,
    ImageSvc,
    ManifestFileHandlerSvc,
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


      /*****************************************
       * Synthetic data fields
       *
       **********/

      isBoxedLot() { return this.packagingType === 'box lot'; }
      isPallet() { return !!this.packagingType.match(/pallet/); }
      isCasePacked() { return this.type === 'case-packed'; } // type is condition

      /*****************************************
       * Setters & mutators
       *
       **********/

      save() {
        return $q.when( api.editLot( this._id, this ) );
      }

      // inventory & manifests
      setInventory( _inventory ) {
        this.inventory = _inventory.map(i=> i.quantity<0 ? Object.assign(i,{quantity:0}) : i );
        return this.inventory;
      }

      updateTotalUnits() {
        this.totalUnits = this.inventory ? this.inventory.reduce((sum,item) => sum + parseInt(item.quantity), 0) : 0 ;
        return this.totalUnits;
      }

      // Inventory mutators
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

      hasListing() {
        return this.submittedListings && this.submittedListings.length>0 && this.submittedListings.find(l => l.success);
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

      saveShippingItems( shippingItems ) {
        return $q.when( api.editLot( this._id, { shippingItems } ) ).then( ( { lot } ) => {

          this.shippingItems = lot.shippingItems;

          return this;
        });
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

          return ManifestFileHandlerSvc.getActiveManifest();

        });

      }

      async getProductImagesFromManifestFile() {

        await this.loadManifestFile();

        const { barcodes } = ManifestFileHandlerSvc.defaultProcessActiveManifest();

        const { products } = await ProductDataSvc.bulkGetProductData( barcodes );

        return products.filter( _ => _.item && _.item.images ).map( _ => {
          return {
            upc: _.item.upc,
            title: _.item.title,
            images: _.item.images
          };
        } );

      }

      uploadImages( images ) {

        return ImageSvc.uploadLotImages( this._id, images ).then( ({ lot }) => {

          // this roundabout way of updating the images is to ensure that the images array is mutated but the reference stays the same
          this.images.splice( 0, this.images.length );
          for( let image of lot.images ) {
            this.images.push( image );
          }

          return this;

        } );

      }

      getImageLink( image ) {
        return image.s3 ? `/api/image/?s3=${encodeURIComponent(image.s3)}` : image.filename;
      }

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