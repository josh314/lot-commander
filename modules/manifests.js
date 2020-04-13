const path = require('path');

const Promise = require('bluebird');

const lotDb = require('./lot-db');
const manifestSvc = require('./manifest-svc');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));
const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

const __STANDARD_COLUMN_NAMES__ = {
  barcode: 'UPC/EAN/GTIN',
  description: 'Description',
  quantity: 'Quantity',
  price: 'Unit Price',
  image: 'Image'
};
const __STANDARD_COLUMNS__ = Object.values(__STANDARD_COLUMN_NAMES__);

function getProductData(inventory) {
  console.log(`Retreiving API product data for ${inventory.length} products`);
  const productDataReqs = [];
  for(let manifestItem of inventory) {
    productDataReqs.push(
      productData.getProductDataByBarcode(manifestItem.barcode).then(retrievedProductData => {
        const res = {
          barcode: retrievedProductData.normalizedBarcode ? retrievedProductData.normalizedBarcode : manifestItem.barcode,
          title: retrievedProductData.title || retrievedProductData.description || manifestItem.title || manifestItem.description,
          quantity: manifestItem.quantity,
          price: retrievedProductData.price || manifestItem.price,
          images: retrievedProductData.images || [],
        };
        return res;
      })
    );
  }
  return Promise.all(productDataReqs);
}

function formatManifestFromInventoryProductData(opts={}) {
  return inventoryProductData => {
    let totalRetailValue = 0;
    const manifestItems = inventoryProductData.sort((a,b) => a.barcode.localeCompare(b.barcode)).map(inventoryItem=>{
      let productTitle;

      if(inventoryItem.title) {
        productTitle = inventoryItem.title;
      }
      else if(inventoryItem.description) {
        productTitle = inventoryItem.description;
      }
      else if (opts.defaultProductTitle) {
        productTitle = opts.defaultProductTitle;
      }
      else {
        productTitle = 'UNKNOWN';
      }

      if(inventoryItem.price && parseFloat(inventoryItem.price)) {
        const price = parseFloat(inventoryItem.price);
        totalRetailValue += price*inventoryItem.quantity;
        inventoryItem.price = price.toFixed(2);
      }



      let item;
      if(opts.bstock) {
        item = {
          Category: opts.bstock.Category,
          'Item Description': productTitle,
          Qty: inventoryItem.quantity,
          'Retail Per Unit': inventoryItem.price,
          Condition: opts.bstock.Condition,
          Packaging: opts.bstock.Packaging,
          UPC: inventoryItem.barcode,
          Manufacturer: '',
          Model: '',
          'Expiration Date': '',
        };
      }
      else {
        item = {
          [ __STANDARD_COLUMN_NAMES__.barcode ]: inventoryItem.barcode,
          [ __STANDARD_COLUMN_NAMES__.description ]: productTitle,
          [ __STANDARD_COLUMN_NAMES__.price ]: inventoryItem.price,
          [ __STANDARD_COLUMN_NAMES__.quantity ]: inventoryItem.quantity,
          [ __STANDARD_COLUMN_NAMES__.image ]: inventoryItem.images || []
        };
      }

      return item;
    });

    manifestItems.totalRetailValue = totalRetailValue;

    return manifestItems;
  };
}

function buildManifestItems(inventory, opts={}) {
  return (opts.refreshProductData ? getProductData(inventory) : Promise.resolve(inventory) ).then(formatManifestFromInventoryProductData(opts));
}

function defaultProductTitleForLot(lotHandle){
  let title;
  if(lotHandle.match(/PC/)) {
    title = 'Personal Care Product';
  }
  else if(lotHandle.match(/GM/)) {
    title = 'General Merchandise';
  }
  else if(lotHandle.match(/VT/)) {
    title = 'Vitamins & Supplements';
  }
  else if(lotHandle.match(/CS/)) {
    title = 'Cosmetics';
  }
  else if(lotHandle.match(/NP/)) {
    title = 'Nail Polish';
  }
  else if(lotHandle.match(/AP/)) {
    title = 'Apparel';
  }
  return title;
}

function getManifestItemsForLot(lot, opts={}) {
  if(!opts.defaultProductTitle) {
    opts.defaultProductTitle = defaultProductTitleForLot(lot.handle);
  }

  const scannedManifestP = lot.manifestId ? mandb.getManifestById(lot.manifestId).then(m => m.toObject().inventory) : Promise.resolve([]);
  const thirdPartyManifestP = Promise.resolve([]); // placeholder
  return Promise.join(scannedManifestP, thirdPartyManifestP).spread(async (scannedInventory, thirdPartyInventory)=>{
    const inventory = scannedInventory.concat(thirdPartyInventory);
    return buildManifestItems(inventory, opts);
  });
}

/*****************************************************
 * opts = {
 *   save: Boolean ( save to S3 and update lot with S3 location if true, otherwise return generated manifest )
 *   bstock: Boolean ( use bstock manifest columns, otherwise use the canonical Wholesale Ninjas format )
 *   columns: styles for columns
 * }
 * 
 * Return type depends on `opts.save`:
 *   - false: returns a readStream with the contents of the created manifest 
 *   - true: a simple JSON object with details about the lot and the link to the S3 Object where the manifest file is stored
 **********************/
async function generateLotManifest( lotId, opts = {} ) {
  const lot = await lotDb.getLotById( lotId );

  const manifestItems = await getManifestItemsForLot( lot, { bstock: opts.bstock } );

  const sheets = [
    {
      name: 'Manifest',
      protected: true,
      columnStyles: opts.bstock ? undefined : { [ __STANDARD_COLUMN_NAMES__.price ]: 'currency' },
      rows: manifestItems
    }
  ];

  if(opts.save) {
    const saveAs = `${lotId}/${ lot.handle }.xlsx`;
    const isPublic = true;

    const buildManifestResponse = await manifestSvc.build( sheets, saveAs, isPublic );

    if( buildManifestResponse.data.submitted ) {

      lotDb.updateLot({ _id: lotId, manifestFileLocation: buildManifestResponse.data.link });

      return {
        lotId: lotId,
        handle: lot.handle,
        manifest: buildManifestResponse.data.link
      };

    }
    else {

      throw new Error(`Failure during generation or saving of manifest for lot ${lot.handle} (lotId: ${lotId})`);

    }
  }
  else {

    const resp = manifestSvc.build( sheets );

    const readStream = resp.data;

    return readStream;

  }
}

module.exports = {
  getManifestItemsForLot: getManifestItemsForLot,
  generateLotManifest: generateLotManifest,
  // CONSTANTS
  __STANDARD_BARCODE_COLUMN__: __STANDARD_COLUMN_NAMES__.barcode,
  __STANDARD_COLUMNS__: __STANDARD_COLUMNS__
};