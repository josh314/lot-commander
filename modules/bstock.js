const path = require('path');
const fs = require('fs');
const Promise = require('bluebird');

const bstockWeb = require('bstock/bstock-web');

const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));
const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));

async function submitListing(data) {
  const lot = data.lot;
  const client = new bstockWeb.Client({auth:__config.bstock.auth, logger: __logger});

  const images = await Promise.map(lot.images, async (_)=>{
    let imgContents;
    try {
      if(_.s3) {
        imgContents = ( await imageServer.get({ s3Location: _.s3 }) ).Body;
      }
      else {
        imgContents = await Promise.promisify(fs.readFile)( path.join(__basedir, __config.imgPath, _.filename) );
      }
    }
    catch(e) {
      imgContents = null;
    }

    if(imgContents) {
      return {
        primary: _.primary ? true : false,
        filename: _.s3 ? imageServer.imageName(_.s3) : _.filename,
        buffer: new Buffer(imgContents, 'binary'),
      };
    }
    else {
      return null;
    }
  }).filter( _ => _ ); // filter out the nulls that come from missing images

  const manifestOptions = {
    bstock: {
      Category: data.category,
      Condition: data.condition,
      Packaging: data.packaging,
    },
  };

  const submissionData = {
    shipping: data.shipping,
    // manifestItems: lot.unmanifested ? manifests.boilerplateManifestItems(lot, manifestOptions) : await manifests.getManifestItemsForLot(lot, manifestOptions),
    manifestItems: manifests.boilerplateManifestItems(lot, manifestOptions),
    totalUnits: lot.totalUnits,
    title: lot.listingData.title,
    description: data.bodyBoilerplate ? (lot.listingData.body + '\n\n' + data.bodyBoilerplate) : lot.listingData.body,
    category: data.category,
    condition: data.condition,
    palletIds: lot.handle,
    images: images,
    startPrice: data.auctionStartPrice,
  };

  return client.submitListing(submissionData, {debug:true});
}


module.exports = {
  // data
  constants: bstockWeb.codeMaps,
  // functions
  submitListing: submitListing,
};