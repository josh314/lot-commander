const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const formidable = require('formidable');

const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));
const manParse = require(path.join(__config.libDir.manifestParse, 'lib'));

let importsFilePath = '/';
for( let s of __config.importsFilePath.split('/').filter(x=>x)) {
  importsFilePath = path.join(importsFilePath, s);
  if(!fs.existsSync(importsFilePath)) {
    fs.mkdirSync(importsFilePath);
  }
}

async function importBarcodes(barcodes) {
  //TODO: check if in skulabs
  const mwsReqs = [];
  for(let barcode of barcodes) {
    mwsReqs.push(Promise.join(barcode,productData.getAsinsFromMwsApiForBarcode(barcode)).then());
  }

  const barcodeAsins = await Promise.all(mwsReqs);
  const barcodeAsinPairs = [];
  const barcodesWithoutAsins = [];
  for( let [barcode, asins] of barcodeAsins) {
    if(asins.length) {
      asins.forEach(asin=>barcodeAsinPairs.push([barcode,asin]));
    }
    else {
      barcodesWithoutAsins.push(barcode);
    }
  }

  //TODO: pick a proper filename and use config file to set path. Change this is appending to a text file
  fs.appendFile(path.join( importsFilePath, 'imported-barcode-asins.txt'), barcodeAsinPairs.reduce((out, pair) => `${out}${pair.join(',')}\n`, ""), function(){__logger.info('Imported ASINs file written to file.')})
  fs.appendFile(path.join( importsFilePath, 'barcodes-without-asins.txt'), barcodesWithoutAsins.reduce((out, barcode) => `${out}${barcode}\n`, ""), function(){__logger.info('Barcodes missing from MWS written to file.')})
}

function importManifestApi(req,res,next) {
  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    manParse.parse(files.file.path, JSON.parse(fields.parseOpts))
    .catch(e=>{
      e.clientMessage = 'Error parsing uploaded file. Check if all settings are correct.';
      next(e);
    }).
    then(blocks=>{
      const barcodes = new Set();
      for (let block of Object.values(blocks)) {
        block.forEach(elem => barcodes.add(elem.barcode) ); 
      }
      const barcodeList = [...barcodes];
      res.json({ numBarcodesSubmitted: barcodeList.length});
      importBarcodes(barcodeList);
    });
  })
}

function importBarcodesApi(req, res, next) {
  const barcodeList = req.body.split('\n');
  res.json({ numBarcodesSubmitted: barcodeList.length});
  importBarcodes(barcodeList);
}

module.exports = {
  importManifestApi: importManifestApi,
  importBarcodesApi: importBarcodesApi,
};
