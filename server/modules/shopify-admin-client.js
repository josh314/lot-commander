const path = require('path');
const fs = require('fs').promises;

const { streamToBuffer } = require('../helpers');
const mediaServer = require('./media-server');
const ShopifyRest = require('./shopify-rest');

class Client {
  constructor( { storeName, storeUrl, apiVersion, apiKey, accessToken, shopifyGql, manifests } ) {

    this.shopifyRest = new ShopifyRest( {
      storeUrl,
      apiKey,
      accessToken,
      apiVersion
    } );

    this.storeName = storeName;
    this.shopifyGql = shopifyGql;
    this.manifests = manifests;

  }



  async addImage( productId, imageObj ) {
    try {

      if( imageObj.s3 ) {
        // TODO: it would be better to just have Shopify stream the image directly from S3 (using this.shopifyRest.addProductImageByUrl() ), but requires the S3 object to have the right content-type
        // TODO: can explicitly check for the content-type and if correct just use this.shopifyRest.addProductImageByUrl(). Or maybe just try this.shopifyRest.addProductImageByUrl(), catch the error and fallback to streaming into a buffer
        const stream = ( await mediaServer.get( imageObj.s3 ) ).Body;
        const imgBuffer = await streamToBuffer( stream );
        return this.shopifyRest.addProductImage( productId, imgBuffer, imageObj.primary );
      }
      else {
        const imgBuffer = await fs.readFile( path.join(__basedir, __config.imgPath, imageObj.filename) );
        return this.shopifyRest.addProductImage( productId, imgBuffer, imageObj.primary );
      }

    }
    catch(e) {
      console.error( e );
      return null; // return null if something goes wrong with image submission, including missing images
    }
  }


  async submitListing( listing, { publish } = { publish: false } ) {

    try {

      // Start the manifest promise if applicable
      const manifestP = listing.lot.unmanifested ? null : this.manifests.getManifestItemsForLot(listing.lot, { refreshProductData: listing.refreshProductData });
      const manifestItems = await manifestP;

      const productToCreate = {
        status: 'draft',
        title: listing.lot.listingData.title,
        body_html: listing.lot.listingData.body + '<br><br>' + listing.bodyBoilerplate,
        template_suffix: 'lot',
        published_at: null,
        tags: listing.shopifyTags,
        variants: [
          {
            barcode: listing.lot.handle,
            sku: listing.lot.handle,
            price: listing.shopifyPrice,
            option1: listing.lot.totalUnits || 'Default Title',
          }
        ],
        vendor: 'Wholesale Ninjas',
        // unit count?
        // collection?
      };

      if( listing.lot.packagingType.includes('pallets') ) { // This would match the several packagingTypes: pallets, pallets:bulky, pallets:oversized
        productToCreate.variants[0].weight = 2000;
        productToCreate.variants[0].weight_unit = 'lb';
      }

      console.log('Creating new Shopify product.');
      const addProductResp = await this.shopifyRest.createProduct( productToCreate );

      const newProductId = addProductResp.product.id;
      const newProductVariant = addProductResp.product.variants[0];
      const newProductHandle = addProductResp.product.handle;

      console.log(`New Shopify product created with id ${ newProductId }:`);
      console.log( JSON.stringify(addProductResp,null,2) );

      // add images
      const addImageReqs = [];
      for(let image of listing.lot.images) {
        addImageReqs.push( this.addImage(newProductId, image) );
      }

      // Set inventory tracking and SKU if requested
      const inventoryItemId = newProductVariant.inventory_item_id;

      const trackSkuInventoryItemP = this.shopifyRest.trackSkuInventoryItem( listing.lot.handle, inventoryItemId );

      //Default inventory after product creation is 0. Make adjustment to inventory if needed
      let updateInventoryLevelP = Promise.resolve(null);
      if( listing.shopifyInventory >= 1 ) {

        updateInventoryLevelP = this.shopifyRest.updateInventoryLevel( inventoryItemId, parseInt( listing.shopifyInventory ) /* Note this is an adjustment from the default value */ );

      }

      //The set of promises for this listing
      const listingPromises = [
        Promise.all( addImageReqs ),
        trackSkuInventoryItemP,
        updateInventoryLevelP,
      ];

      if( Array.isArray( listing.lot.videos ) && listing.lot.videos.length > 0 ) {

        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'lot',
            key: 'videos',
            value: listing.lot.videos.map( _ => _.s3 ).join(','),
            type: 'single_line_text_field',
          }
        );
        listingPromises.push(addMetafieldP);

      }

      // // Schedule manifest promise if applicable
      if(!listing.lot.unmanifested && manifestItems && manifestItems.length) {
        manifestItems.sort(function(a, b) {
          if (a.barcode > b.barcode) {
            return 1;
          }
          if (a.barcode < b.barcode) {
            return -1;
          }
          return 0;
        });
        const manifest = JSON.stringify(manifestItems);

        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'manifest',
            key: 'json',
            value: manifest,
            type: 'string',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      let estimatedRetailValue;
      if(listing.estimatedRetailValue) {
        estimatedRetailValue = listing.estimatedRetailValue;
      }
      else if (manifestItems && manifestItems.totalRetailValue) {
        estimatedRetailValue = manifestItems.totalRetailValue;
      }

      if(estimatedRetailValue) {
        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'lot',
            key: 'estimatedRetailValue',
            value: parseInt(estimatedRetailValue*100),//This changes it to cents so we can use Shopify money filter
            type: 'string',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      // // Adding metafield for total units of lot. nOte added directly to product, not the variant
      if(listing.lot.totalUnits) {
        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'lot',
            key: 'totalUnits',
            value: parseInt(listing.lot.totalUnits),
            type: 'integer',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      // // Adding metafield for lot manifest file location. nOte added directly to product, not the variant
      if(listing.lot.manifestFileLocation) {
        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'manifest',
            key: 'file',
            value: listing.lot.manifestFileLocation,
            type: 'string',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for numBoxes. NOTE THIS FIELD IS DEPRECATED BUT EXISTS ON OLD DAT
      if(listing.lot.numBoxes) {
        const addMetafieldP = this.shopifyRest.addProductVariantMetafield(
          newProductId,
          newProductVariant.id,
          {
            namespace: 'shipping',
            key: 'numBoxes',
            value: listing.lot.numBoxes,
            type: 'integer',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for shippingItems. PREFERRED OVER THE DEPRECATED `numBoxes` FIELD
      if(listing.lot.shippingItems) {
        const shippingItemsJson = JSON.stringify(listing.lot.shippingItems);
        const addMetafieldP = this.shopifyRest.addProductVariantMetafield(
          newProductId,
          newProductVariant.id,
          {
            namespace: 'shipping',
            key: 'shippingItems',
            value: shippingItemsJson,
            type: 'string',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      // add condition metafield
      if(listing.lot.type) {
        const addMetafieldP = this.shopifyRest.addProductMetafield(
          newProductId,
          {
            namespace: 'lot',
            key: 'condition',
            value: listing.lot.type,
            type: 'string',
          }
        );
        listingPromises.push(addMetafieldP);
      }

      if( listing.shopifyShippingRate ) {
        const addMetafieldP = this.shopifyGql.setProductVariantShippingRate( newProductVariant.id, listing.shopifyShippingRate );
        listingPromises.push(addMetafieldP);
      }

      await Promise.all(listingPromises);

      if( publish ) {
        await this.shopifyRest.publishProduct(newProductId);
      }


      return {
        shopify: {
          store: this.storeName,
          productId: newProductId,
          productVariantId: newProductVariant.id,
          handle: newProductHandle,
        }
      };

    }
    catch( e ) {
      throw e;
    }
  }

  /***********************************
   * Shopify GraphQL method wrappers
   * ===============================
   *
   ***********/

  id2Gid( id, type ) {
    return this.shopifyGql.id2Gid( id, type );
  }

  gid2Id( gid, type ) {
    return this.shopifyGql.gid2Id( gid, type );
  }

  listActiveProducts( { debug, cursor, everydayBargainsOnly } = {} ) {
    return this.shopifyGql.listActiveProductslistActiveProducts( { debug, cursor, everydayBargainsOnly } );
  }

  listActiveProductVariants( { debug, cursor, everydayBargainsOnly } = {} ) {
    return this.shopifyGql.listActiveProductVariants( { debug, cursor, everydayBargainsOnly } );
  }

  getProductVariant( pvid ) {
    return this.shopifyGql.getProductVariant( pvid );
  }

  getPalletBreakdownServiceRate() {
    return this.shopifyGql.getPalletBreakdownServiceRate();
  }

  setPalletBreakdownServiceRate( newRate ) {
    return this.shopifyGql.setPalletBreakdownServiceRate( newRate );
  }

  listProductVariantShippingRates( { debug, cursor, includePallets } = {} ) {
    return this.shopifyGql.listProductVariantShippingRates( { debug, cursor, includePallets } );
  }

  getProductVariantShippingRate( pvid ) {
    return this.shopifyGql.getProductVariantShippingRate( pvid );
  }

  setProductVariantShippingRate( pvid, rate ) {
    return this.shopifyGql.setProductVariantShippingRate( pvid, rate );
  }

  removeProductVariantShippingRate( pvGid ) {
    return this.shopifyGql.removeProductVariantShippingRate( pvGid );
  }

  listProductVariantShippingConfigurations( { debug, cursor, includePallets, everydayBargainsOnly } = {} ) {
    return this.shopifyGql.listProductVariantShippingConfigurations( { debug, cursor, includePallets, everydayBargainsOnly } );
  }

  getProductVariantShippingConfiguration( pvid ) {
    return this.shopifyGql.getProductVariantShippingConfiguration( pvid );
  }

  setProductVariantShippingConfiguration( pvid, shippingConfiguration ) {
    return this.shopifyGql.setProductVariantShippingConfiguration( pvid, shippingConfiguration );
  }

  removeProductVariantShippingConfiguration( pvid ) {
    return this.shopifyGql.removeProductVariantShippingConfiguration( pvid );
  }

  listProductVariantBundles( { debug, cursor } = {} ) {
    return this.shopifyGql.listProductVariantBundles( { debug, cursor } );
  }

  getProductVariantBundle( pvid ) {
    return this.shopifyGql.getProductVariantBundle( pvid );
  }

  setProductVariantBundle( pvid, bundle, { debug = false } = {} ) {
    return this.shopifyGql.setProductVariantBundle( pvid, bundle, { debug } );
  }

}

module.exports = Client;