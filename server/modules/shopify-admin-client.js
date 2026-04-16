
/****************************************************
 * Helpers
 * =======
 *
 *****************************************************/

function getProductType( lot ) {

  const { category } = lot;

  if( category === 'personal care' ) {
    return 'Personal Care';
  }
  if( category === 'cosmetics' ) {
    return 'Cosmetics';
  }
  if( category === 'clothing' ) {
    return 'Clothing';
  }
  if( category === 'general merchandise' ) {
    return 'General Merchandise';
  }

  return '';

}

function getUnitCountRange( totalUnits ) {

  if( !totalUnits || isNaN(totalUnits) ) {
    return null;
  }
  else if( totalUnits < 100 ) {
    return 'Under 100';
  }
  else if( totalUnits >= 100 && totalUnits <= 299 ) {
    return '100-299';
  }
  else if( totalUnits >= 300 && totalUnits <= 499 ) {
    return '300-499';
  }
  else if( totalUnits >= 500 && totalUnits <= 999 ) {
    return '500-999';
  }
  else if( totalUnits >= 1000 ) {
    return '1000+';
  }

}


/****************************************************
 * Shopify Admin Client
 * =====================
 *
 *****************************************************/

class Client {
  constructor( { shopifyGql, manifests } ) {

    this.shopifyGql = shopifyGql;
    this.manifests = manifests;

  }

  async createProductFromLotListing( listing ) {

    // kick off the manifest promise for later use
    const manifestP = listing.lot.unmanifested ? null : this.manifests.getManifestItemsForLot(listing.lot, { refreshProductData: listing.refreshProductData });

    // Define and create the product
    const productToCreate = {
      status: 'DRAFT',
      title: listing.lot.listingData.title,
      descriptionHtml: listing.lot.listingData.body + '<br><br>' + listing.bodyBoilerplate,
      publishedAt: null,
      tags: listing.shopifyTags,
      vendor: 'Wholesale Ninjas',
      metafields: [],
      productType: getProductType( listing.lot ),
    };

    if( listing.lot.totalUnits ) {
      productToCreate.productOptions = [
        {
          name: 'Unit Count',
          values: [
            {
              name: `${listing.lot.totalUnits}`
            }
          ]
        }
      ];
    }

    // video metafield
    if( Array.isArray( listing.lot.videos ) && listing.lot.videos.length > 0 ) {

      const metafield = {
        namespace: 'lot',
        key: 'videos',
        value: listing.lot.videos.map( _ => _.s3 ).join(','),
        type: 'single_line_text_field',
      };
      productToCreate.metafields.push( metafield );

    }

    //////////////////////
    // product metafields
    //////////////////////

    const metafieldFeaturesSet = new Set();

    let estimatedRetailValue;
    if( listing.estimatedRetailValue ) {
      estimatedRetailValue = listing.estimatedRetailValue;
    }
    else if (manifestItems && manifestItems.totalRetailValue) {
      estimatedRetailValue = manifestItems.totalRetailValue;
    }

    if( estimatedRetailValue ) {

      const metafield = {
        namespace: 'lot',
        key: 'estimatedRetailValue',
        value: `${ parseInt(estimatedRetailValue*100) }`,//This changes it to cents so we can use Shopify money filter
        type: 'single_line_text_field',
      };
      productToCreate.metafields.push( metafield );

    }

    // Adding metafield for total units of lot.
    if( listing.lot.totalUnits ) {

      const metafield = {
        namespace: 'lot',
        key: 'totalUnits',
        value: `${ parseInt( listing.lot.totalUnits ) }`,
        type: 'number_integer',
      };
      productToCreate.metafields.push( metafield );

    }

    // Adding metafield for lot manifest file location.
    if( listing.lot.manifestFileLocation ) {

      const metafield = {
        namespace: 'manifest',
        key: 'file',
        value: this.manifests.getPublicManifestFileUrl( listing.lot.manifestFileLocation ),
        type: 'url',
      };
      productToCreate.metafields.push( metafield );

      metafieldFeaturesSet.add( "manifested");

    }

    // add condition metafield
    if( listing.lot.type ) {

      const metafield = {
        namespace: 'lot',
        key: 'condition',
        value: listing.lot.type,
        type: 'single_line_text_field',
      };
      productToCreate.metafields.push( metafield );

    }

    // manifest metafield
    const manifestItems = await manifestP; // wait for the manifest promise started earlier to resolve
    if( !listing.lot.unmanifested && manifestItems && manifestItems.length ) {

      manifestItems.sort(function(a, b) {
        if (a.barcode > b.barcode) {
          return 1;
        }
        if (a.barcode < b.barcode) {
          return -1;
        }
        return 0;
      });

      for( let manifestItem of manifestItems ) {

        if( manifestItem.Image && Array.isArray( manifestItem.Image ) && manifestItem.Image.length > 0 ) {

          manifestItem.Image = manifestItem.Image[0];

        }

      }

      const saveManifestJsonResp = await this.manifests.saveLotManifestItems( listing.lot._id, manifestItems );

      if( saveManifestJsonResp.Location ) {

        const metafield = {
          namespace: 'manifest',
          key: 'json-location',
          value: this.manifests.getPublicManifestFileUrl( saveManifestJsonResp.Location ),
          type: 'single_line_text_field',
        };
        productToCreate.metafields.push( metafield );

      }

      metafieldFeaturesSet.add( "manifested" );

    }

    if( metafieldFeaturesSet.size > 0 ) {

      const metafield = {
        namespace: 'wsn',
        key: 'features',
        value: JSON.stringify( [ ...metafieldFeaturesSet ] ),
      };
      productToCreate.metafields.push( metafield );
    }

    // add images
    let media = [];

    if( listing.lot.images && listing.lot.images.length > 0 ) {

      for( let i=0; i<listing.lot.images.length; i++ ) {

        const image = listing.lot.images[i];

        if( image.s3 ) {

          const medium = {
            alt: `${ listing.lot.listingData.title } - Image ${ i+1 }`,
            originalSource: image.s3,
            mediaContentType: 'IMAGE',
          };

          if( image.primary ) {
            media = [ medium ].concat( media );
          }
          else {
            media.push( medium );
          }

        }

      }

    }

    console.log('Creating new Shopify product.');

    const createProductResp = await this.shopifyGql.createProduct( productToCreate, media );

    if( createProductResp.product ) {

      console.log(`New Shopify product created with id ${ createProductResp.product.id }:`);
      console.log( JSON.stringify( createProductResp,null,2) );

      return createProductResp.product;

    }

  }

  async createProductVariantForProductFromLotListing( product, listing ) {

    // Now define the product variant
    const variant = {
      barcode: listing.lot.handle,
      optionValues: [ { "optionName": "Unit Count", "name": listing.lot.totalUnits ? `${listing.lot.totalUnits}` : 'Default Title' } ],
      price: listing.shopifyPrice,
      metafields: [],
      inventoryItem: {
        requiresShipping: true,
        sku: listing.lot.handle,
        tracked: true,
      },
      inventoryPolicy: 'DENY',
      inventoryQuantities: {
        availableQuantity: parseInt( listing.shopifyInventory ),
        locationId: this.shopifyGql.locationId,
      }
    };

    if( listing.lot.packagingType.includes('pallets') ) { // This would match the several packagingTypes: pallets, pallets:bulky, pallets:oversized

      variant.inventoryItem.measurement = {
        weight: {
          value: 2000,
          unit: 'POUNDS'
        }
      };

    }

    // Adding metafield for numBoxes. NOTE THIS FIELD IS DEPRECATED BUT EXISTS ON OLD DATA
    if( listing.lot.numBoxes ) {

      const metafield = {
        namespace: 'shipping',
        key: 'numBoxes',
        value: listing.lot.numBoxes,
        type: 'integer',
      };
      variant.metafields.push( metafield );

    }

    // Adding metafield for shippingItems. PREFERRED OVER THE DEPRECATED `numBoxes` FIELD
    if( listing.lot.shippingItems ) {

      const shippingItemsJson = JSON.stringify(listing.lot.shippingItems);

      const metafield = {
        namespace: 'shipping',
        key: 'shippingItems',
        value: shippingItemsJson,
        type: 'multi_line_text_field',
      };
      variant.metafields.push( metafield );

    }

    if( listing.shopifyShippingRate ) {

      const metafield = {
        namespace: 'wsn_shipping',
        key: 'flat_rate',
        value: `${ listing.shopifyShippingRate }`,
        type: 'number_decimal',
      };
      variant.metafields.push( metafield );

    }

    if( listing.lot.totalUnits ) {

      const metafield = {
        namespace: 'wsn',
        key: 'unitCountRange',
        value: getUnitCountRange( listing.lot.totalUnits ),
        type: 'single_line_text_field',
      };
      variant.metafields.push( metafield );

    }

    // create the product variant
    const createProductVariantsResp = await this.shopifyGql.createProductVariants( product.id, [ variant ], { replace: true } );

    if( createProductVariantsResp.productVariants && createProductVariantsResp.productVariants[0]) {

      console.log( `Created product variant...` );
      console.log( JSON.stringify( createProductVariantsResp, null, 2 ) );

      return createProductVariantsResp.productVariants[0];

    }

  }

  async submitListing( listing ) {

    // TODO: we currently won't know if image uploads fail.

    let newProductId;

    try {

      const newProduct = await this.createProductFromLotListing( listing );
      newProductId = newProduct.id;

      const newProductVariant = await this.createProductVariantForProductFromLotListing( newProduct, listing );

      return {
        shopify: {
          store: this.shopifyGql.storeName,
          productId: this.gid2Id( newProduct.id, 'Product' ),
          productVariantId: this.gid2Id( newProductVariant.id , 'ProductVariant' ),
          handle: newProduct.handle,
        }
      };

    }
    catch( e ) {

      if( newProductId ) {

        console.log(`Error occurred during listing submission. Deleting product with id ${ newProductId }.`);
        await this.shopifyGql.deleteProduct( newProductId );

      }

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