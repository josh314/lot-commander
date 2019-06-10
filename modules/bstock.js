const path = require('path');

const bstockWeb = require(path.join(__config.libDir.bstock, 'bstock-web'));
const manifests = require(path.join(__basedir, __config.modulesPath, 'manifests'));
const lotDb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));

function getManifestItems(lot) {
  // return [];
}

async function submitListing(data) {
  const lot = data.lot;
  const client = new bstockWeb.Client({auth:__config.bstock.auth, logger: __logger});

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
    images: lot.images.map(x=>{
      return {
        primary: x.primary ? true : false,
        filename: path.join(__basedir, __config.imgPath, x.filename),
      };
    }),
    startPrice: data.auctionStartPrice,
  };

  return client.submitListing(submissionData, {debug:true})
}


module.exports = {
  // data
  constants: bstockWeb.codeMaps,
  // functions
  submitListing: submitListing,
}