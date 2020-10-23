const path = require('path');

const Promise = require('bluebird');

const lotDb = require(path.join(__basedir, __config.modulesPath, 'lot-db'));
const bstock = require(path.join(__basedir, __config.modulesPath, 'bstock'));
const shopify = require(path.join(__basedir, __config.modulesPath, 'shopify'));
const manifests = require('./manifests');

const conditionBoilerplateListItems = [
  'Have retail stickers such as price tags or discount/store labels.', 
  'Items may be out of box or in open boxes.',
  'Items expired or short-dated.',
];

function getBodyBoilerplate(format) {

  const bp = ((f)=>{
    if(f=='text') {
      return {
        newline: "\n",
        prefix: "•  ",
        terminator: "\n",
      };
    }
    else if(f=='html') {
      return {
        newline: "<br>",
        prefix: "<li>",
        terminator: "</li>",
      };
    }
    else {
      return null;
    }
  })(format);

  if(!bp)
    return {};

  const boilerplateList = 'Our items are in good condition, but may have some or all of the following properties:' + bp.newline + (format=='html'? '<ul>' : '') +
              conditionBoilerplateListItems.reduce((list, line) => list + bp.prefix + line + bp.terminator, '') + (format=='html'? '</ul>' : '') +
              'Lot is not inspected and there is no guarantee on the variety of items or expiration dates. The total number of units is guaranteed.';

  const boilerplateByLotType = {
    'shelf-pull': 'What are shelf-pulls? This is an industry term similar to overstock, clearance or close-outs. ' + 
        'These items have been on retail store shelves and liquidated at the end of the season, or when the store needed to make room for new stock to be displayed. ' + 
        'The reason for being removed from shelves may be as trivial as a new package design from the manufacturer (many stores are under contract to only sell items with the latest packaging). ' + 
        'Shelf pulls are unused; they are NOT customer returns. This lot is composed of Shelf-pull items.' + 
        bp.newline + boilerplateList,
    'customer returns': 'This lot is composed of customer returned items.' + bp.newline + boilerplateList,
    'salvage': 'The lot contains units that have passed the best by date.',
  };

  return boilerplateByLotType;
}

const submitFn = {
  bstock: bstock.submitListing,
  wholesaleninjas: shopify.submitListing,
};

const submit = Promise.method(async function(req, res, next) {
  const listing = req.body.listing;

  if(!submitFn[listing.marketplace]) {
    next(new Error('Invalid marketplace.'));
  }

  let lot;
  if(!req.body.lotId || !(lot = await lotDb.getLotById(req.body.lotId))) {
    const e = new Error('No listing submitted: invalid or missing lotId.');
    e.clientMessage = 'Invalid lot ID submitted.';
    next(e);
  }
  listing.lot = lot;

  if(!listing.lot.images || !listing.lot.images.length) {
    const e = new Error(`No listing created for lot ${listing.lot.handle} (id: ${listing.lot._id}): no images.`);
    e.clientMessage ='Please add images to this lot before submission.';
    next(e);
  }

  const boilerplateFormat = ((mp)=>{
    if(mp=='bstock') return 'text';
    else if(mp=='wholesaleninjas') return null;
    else return '';
  })(listing.marketplace);

  const boilerplate = getBodyBoilerplate(boilerplateFormat);

  listing.bodyBoilerplate = boilerplate[listing.lot.type] ? boilerplate[listing.lot.type] : '';

  res.json({ message: 'Listing submitted. Submission may take several minutes.'});

  const newSubmittedListing = {
    marketplace: listing.marketplace,
    dateSubmitted: new Date()
  };
  try {

    if(!listing.lot.manifestFileLocation && !listing.lot.unmanifested ) {
      const generatedManifestResponse = await manifests.generateLotManifest( req.body.lotId , { save: true } );
      listing.lot.manifestFileLocation = generatedManifestResponse.manifest;
    }

    await submitFn[listing.marketplace](listing);
    Object.assign(newSubmittedListing, {
      success: true,
      message: 'Submission successful.'
    });
    listing.lot.status = 'Listed';
  }
  catch (e) {
    Object.assign(newSubmittedListing, {
      success: false,
      message: e.name + ': ' + e.message,
    });
    listing.lot.status = 'Error';
    __logger.error(e);
  }
  if(listing.lot.submittedListings && listing.lot.submittedListings.length>0) {
    const submittedListings = [].concat(listing.lot.submittedListings);
    const idx = submittedListings.findIndex(x => x.marketplace === listing.marketplace);
    if(idx===-1){
      submittedListings.push(newSubmittedListing);
    } 
    else {
      submittedListings.splice(idx, 1, newSubmittedListing);
    }
    listing.lot.submittedListings = submittedListings;
  }
  else {
    listing.lot.submittedListings = [newSubmittedListing];
  }
  lotDb.updateLot(listing.lot);
});

module.exports = {
  //functions
  submit: submit, // data
  boilerplate: getBodyBoilerplate('text'),
};