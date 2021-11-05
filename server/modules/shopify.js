const Promise = require('bluebird');

const path = require('path');
const fs = require('fs');
const readFile = Promise.promisify(fs.readFile);

const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));
const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));
const shopifyApi = require('shopify/lib/api');

class Client {
  constructor( { config, shopifyGql } ) {
    this.shopifyClient = new shopifyApi.Client( config );
    this.shopifyGql = shopifyGql;
  }

  async addImage( productId, imageObj ) {
    try {
      let imgBuffer;
      if(imageObj.s3) {
        imgBuffer = ( await imageServer.get({ s3Location: imageObj.s3 }) ).Body;
      }
      else {
        imgBuffer = await readFile( path.join(__basedir, __config.imgPath, imageObj.filename) );
      }
      const imageReqOptions = {
        productId: productId,
        image: imgBuffer.toString('base64'),
        primary: imageObj.primary,
      };
      return this.shopifyClient.addProductImage(imageReqOptions);
    }
    catch(e) {
      return null; // return null if something goes wromng with image submission, including missing images
    }
  }

  async submitListing( listing, { publish } = { publish: false } ) {

    try {

      // Start the manifest promise if applicable
      const manifestP = listing.lot.unmanifested ? null : manifests.getManifestItemsForLot(listing.lot, { refreshProductData: listing.refreshProductData });
      const manifestItems = await manifestP;

      const product = {
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
        // unit count?
        // collection?
      };

      if( listing.lot.packagingType.includes('pallets') ) {
        product.variants[0].weight = 2000;
        product.variants[0].weight_unit = 'lb';
      }

      console.log('Creating new Shopify product.');
      const addProductResp = await this.shopifyClient.addProduct(product).then(_=>{
        console.log(`New Shopify product created with id ${_.product.id}`);
        return _;
      });
      const newProductId = addProductResp.product.id;
      const newProductVariant = addProductResp.product.variants[0];

      // add images
      const addImageReqs = [];
      if(addProductResp) {
        for(let image of listing.lot.images) {
          addImageReqs.push( this.addImage(newProductId, image) );
        }
      }

      // Set inventory tracking and SKU if requested
      const inventoryItemId = addProductResp.product.variants[0].inventory_item_id;
      const updateInventoryItemP = this.shopifyClient.updateInventoryItem({inventoryItemId: inventoryItemId, tracked: true, sku: listing.lot.handle});

      //Default inventory after product creation is 0. Make adjustment to inventory if needed
      let updateInventoryLevelP = Promise.resolve(null);
      if(listing.shopifyInventory>=1) {
        updateInventoryLevelP = this.shopifyClient.getInventoryLevels({inventoryItemId: inventoryItemId }).then(resp=>{
          return this.shopifyClient.updateInventoryLevel({
            availableAdjustment: parseInt(listing.shopifyInventory),//Note this is an adjustment from the default value
            inventoryItemId: inventoryItemId,
            locationId: resp.inventory_levels[0].location_id
          });
        });
      }

      //The set of promises for this listing
      const listingPromises = [
        Promise.all(addImageReqs),
        updateInventoryItemP,
        updateInventoryLevelP,
      ];

      // Schedule manifest promise if applicable
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

        const addMetafieldP = this.shopifyClient.addProductMetafield({
          productId: newProductId,
          metafield: {
            namespace: 'manifest',
            key: 'json',
            value: manifest,
            value_type: 'string',
          }
        });
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
        const addMetafieldP = this.shopifyClient.addProductMetafield({
          productId: newProductId,
          metafield: {
            namespace: 'lot',
            key: 'estimatedRetailValue',
            value: parseInt(estimatedRetailValue*100),//This changes it to cents so we can use Shopify money filter
            value_type: 'string',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for total units of lot. nOte added directly to product, not the variant
      if(listing.lot.totalUnits) {
        const addMetafieldP = this.shopifyClient.addProductMetafield({
          productId: newProductId,
          metafield: {
            namespace: 'lot',
            key: 'totalUnits',
            value: parseInt(listing.lot.totalUnits),
            value_type: 'integer',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for lot manifest file location. nOte added directly to product, not the variant
      if(listing.lot.manifestFileLocation) {
        const addMetafieldP = this.shopifyClient.addProductMetafield({
          productId: newProductId,
          metafield: {
            namespace: 'manifest',
            key: 'file',
            value: listing.lot.manifestFileLocation,
            value_type: 'string',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for numBoxes. NOTE THIS FIELD IS DEPRECATED BUT EXISTS ON OLD DAT
      if(listing.lot.numBoxes) {
        const addMetafieldP = this.shopifyClient.addProductVariantMetafield({
          productId: newProductId,
          productVariantId: newProductVariant.id,
          metafield: {
            namespace: 'shipping',
            key: 'numBoxes',
            value: listing.lot.numBoxes,
            value_type: 'integer',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      // Adding metafield for shippingItems. PREFERRED OVER THE DEPRECATED `numBoxes` FIELD
      if(listing.lot.shippingItems) {
        const shippingItemsJson = JSON.stringify(listing.lot.shippingItems);
        const addMetafieldP = this.shopifyClient.addProductVariantMetafield({
          productId: newProductId,
          productVariantId: newProductVariant.id,
          metafield: {
            namespace: 'shipping',
            key: 'shippingItems',
            value: shippingItemsJson,
            value_type: 'string',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      // add condition metafield
      if(listing.lot.type) {
        const addMetafieldP = this.shopifyClient.addProductMetafield({
          productId: newProductId,
          metafield: {
            namespace: 'lot',
            key: 'condition',
            value: listing.lot.type,
            value_type: 'string',
          }
        });
        listingPromises.push(addMetafieldP);
      }

      const result = publish ? Promise.all(listingPromises).then( _ => this.shopifyClient.publishProduct(newProductId) ) : listingPromises;

      return result;
    }
    catch( e ) {
      console.error(e);
      throw e;
    }
  }
}

module.exports = Client;