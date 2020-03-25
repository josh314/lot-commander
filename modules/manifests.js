const path = require('path');

const Promise = require('bluebird');

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));
const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

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
          barcode: inventoryItem.barcode,
          title: productTitle,
          unitPrice: inventoryItem.price,
          quantity: inventoryItem.quantity,
          images: inventoryItem.images || []
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

function defaultProductTitleForLot(lot){
  let title;
  if(lot.handle.match(/PC/)) {
    title = 'Personal Care Product';
  }
  else if(lot.handle.match(/GM/)) {
    title = 'General Merchandise';
  }
  else if(lot.handle.match(/VT/)) {
    title = 'Vitamins & Supplements';
  }
  else if(lot.handle.match(/CS/)) {
    title = 'Cosmetics';
  }
  else if(lot.handle.match(/NP/)) {
    title = 'Nail Polish';
  }
  else if(lot.handle.match(/AP/)) {
    title = 'Apparel';
  }
  return title;
}

function getManifestItemsForLot(lot, opts={}) {
  if(!opts.defaultProductTitle) {
    opts.defaultProductTitle = defaultProductTitleForLot(lot);
  }

  const scannedManifestP = lot.manifestId ? mandb.getManifestById(lot.manifestId).then(m => m.toObject().inventory) : Promise.resolve([]);
  const thirdPartyManifestP = Promise.resolve([]); // placeholder
  return Promise.join(scannedManifestP, thirdPartyManifestP).spread(async (scannedInventory, thirdPartyInventory)=>{
    const inventory = scannedInventory.concat(thirdPartyInventory);
    return buildManifestItems(inventory, opts);
  });
}

module.exports = {
  getManifestItemsForLot: getManifestItemsForLot,
};