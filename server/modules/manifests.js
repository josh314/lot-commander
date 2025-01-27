const documentSvc = require('./document-svc');
const manifestSvc = require('./manifest-svc');

const xlsx = require( 'xlsx-js-style' );

const __STANDARD_COLUMN_NAMES__ = {
  barcode: 'UPC/EAN/GTIN',
  asin: 'ASIN',
  description: 'Description',
  brand: 'Brand',
  quantity: 'Quantity',
  price: 'Unit Price',
  image: 'Image'
};
const __STANDARD_COLUMNS__ = Object.values(__STANDARD_COLUMN_NAMES__);

module.exports = function( { lotdb, manifestDb, productData } ) {

  function getManifestById( manifestId ) {
    return manifestDb.getManifestById( manifestId );
  }

  function saveManifest( manifest ) {
    return manifestDb.saveManifest( manifest );
  }

  function getProductData(inventory) {
    console.log(`Retreiving API product data for ${inventory.length} products`);
    const productDataReqs = [];
    for(let manifestItem of inventory) {
      productDataReqs.push(
        productData.getProductDataByBarcode(manifestItem.barcode).then(retrievedProductData => {
          const res = {
            barcode: retrievedProductData.barcode ? retrievedProductData.barcode : manifestItem.barcode,
            title: retrievedProductData.title || retrievedProductData.description || manifestItem.title || manifestItem.description,
            brand: retrievedProductData.brand || manifestItem.brand,
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
            [ __STANDARD_COLUMN_NAMES__.asin ]: inventoryItem.asin,
            [ __STANDARD_COLUMN_NAMES__.description ]: productTitle,
            [ __STANDARD_COLUMN_NAMES__.brand ]: inventoryItem.brand,
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

    if( lot.pallet ) {
      return getManifestItemsForPallet( lot.pallet, true );
    }

    if(!opts.defaultProductTitle) {
      opts.defaultProductTitle = defaultProductTitleForLot(lot.handle);
    }

    const scannedManifestP = lot.manifestId ? manifestDb.getManifestById( lot.manifestId ).then(m => m.toObject().inventory) : Promise.resolve([]);
    return scannedManifestP.then( (scannedInventory) => {
      return buildManifestItems( scannedInventory , opts );
    });
  }

  // Converts the saved excel file manifest into a json array of row objects
  async function getManifestItemsForPallet( pallet, getProductData = false ) {

    let manifestItems = [];

    const palletId = typeof pallet === 'string' ? pallet : pallet._id;

    const docListReq = { folder: documentSvc.folder( 'inventory-pallet' )( palletId ) };

    const docListResp = await documentSvc.list( docListReq );

    if( docListResp && docListResp.documents && docListResp.documents[0] ) {

      const docStream = await documentSvc.get( {
        folder: documentSvc.folder( 'inventory-pallet' )( palletId ),
        name: docListResp.documents[0].name
      } );

      const chunks = [];
      for await ( let chunk of docStream ) {
        chunks.push(chunk);
      }

      const buf = Buffer.concat(chunks);

      const wb = xlsx.read( buf );

      const [ _name, data ] = Object.entries(wb.Sheets)[0];


      const sheetParseOpts = {
        blankRows: true,
        defVal: '',
        range: 0,
      };

      const rows = xlsx.utils.sheet_to_json( data, sheetParseOpts );

      let productImagesMap;
      if( getProductData ) {

        const barcodes = rows.filter( _row => _row[ __STANDARD_COLUMN_NAMES__.barcode ] ).map( _row => _row[ __STANDARD_COLUMN_NAMES__.barcode ].replace( "'", "" ) );

        const productDataArray = await productData.bulkGetProductData( barcodes );

        productImagesMap = productDataArray.reduce( ( acc, _productData ) => {
          if( _productData.item ) {
            acc.set( _productData.upc, _productData.item.images );
          }
          return acc;
        }, new Map() );

      }

      manifestItems = rows.map( _row => {

        for( let [ key, value ] of Object.entries( _row ) ) {

          if( key === __STANDARD_COLUMN_NAMES__.barcode ) {
            _row[ key ] = value.replace( "'", "" );
          }
          else if( key === 'Retail Price' || key === 'Sale Price' ) {
            _row[ key ] = value.toFixed(2);
          }

        }

        if( productImagesMap && productImagesMap.has( _row[ __STANDARD_COLUMN_NAMES__.barcode ] ) ) {
          _row[ __STANDARD_COLUMN_NAMES__.image ] = productImagesMap.get( _row[ __STANDARD_COLUMN_NAMES__.barcode ] );
        }

        return _row;
      } );

    }

    return manifestItems;
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
    const lot = await lotdb.getLotById( lotId );

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

      if( buildManifestResponse.Location ) {

        console.log(`Manifest for lot ${lot.handle} (lotId: ${lotId}) saved to ${buildManifestResponse.Location}`);
        lotdb.editLot( lotId, { manifestFileLocation: buildManifestResponse.Location });

        return {
          lotId: lotId,
          handle: lot.handle,
          manifest: buildManifestResponse.Location
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

  return {

    // pass through from manifestDb
    getManifestById,
    saveManifest,

    // manifest processing/parsing
    getManifestItemsForLot,
    generateLotManifest,
    // CONSTANTS
    __STANDARD_BARCODE_COLUMN__: __STANDARD_COLUMN_NAMES__.barcode,
    __STANDARD_COLUMNS__: __STANDARD_COLUMNS__
  };

};