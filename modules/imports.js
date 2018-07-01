const path = require('path');
const fs = require('fs');

const productData = require(path.join(__basedir, __config.modulesPath, 'product-data'));

function importBarcode(barcodes) {

}

function importManifestApi(req,res,next) {
  const form = new formidable.IncomingForm();
  form.parse(req, function (err, fields, files) {
    manParse.parse(files.file.path, JSON.parse(fields.parseOpts))
    .catch(e=>{
      e.clientMessage = 'Error parsing uploaded file. Check if all settings are correct.';
      throw e;
    }).
    then(blocks=>{
      const manifest = {};
      if(fields.liquidationSource) {
        manifest.liquidationSource = fields.liquidationSource;
      }
      if(fields.purchasingSource) {
        manifest.purchasingSource = fields.purchasingSource;
      }
      if(fields.type) {
        manifest.type = fields.type;
      }
      if(fields.priceType) {
        manifest.priceType = fields.priceType;
      }
      manifest.blocks = Object.entries(blocks).map( item => {
        return { blockId: item[0], contents: item[1] }
      });
    })
    .catch(e=>{
      // Customize server error messages
      next(e);
    })
  })
}

function importBarcodesApi(req, res, next) {

}

module.exports = {
  importManifestApi: importManifestApi,
  importBarcodesApi: importBarcodesApi,
};
