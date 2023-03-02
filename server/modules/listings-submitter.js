const { ClientError } = require('../errors');

const conditionBoilerplateListItems = [
  'Have retail stickers such as price tags or discount/store labels.',
  'Items may be out of box or in open boxes.',
  'Items expired or short-dated.',
];


class Client {
  constructor( { bstock, shopifyAdminClient, manifests } ) {

    this.submitFn = {
      bstock: bstock.submitListing,
      wholesaleninjas: shopifyAdminClient.submitListing.bind( shopifyAdminClient ),
    };

    this.manifests = manifests;

    this.shopify = shopifyAdminClient;
  }

  getBodyBoilerplate(format) {

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

  async submit( { lotId, listing, publish = false } ) {


    if( !listing.lot.images || !listing.lot.images.length ) {
      console.error(`No listing created for lot ${listing.lot.handle} (id: ${listing.lot._id}): no images.`);
      const e = new ClientError('Please add images to this lot before submission.');
      throw e;
    }

    const boilerplateFormat = ((mp)=>{
      if(mp=='bstock') return 'text';
      else if(mp=='wholesaleninjas') return null;
      else return '';
    })(listing.marketplace);

    const boilerplate = this.getBodyBoilerplate(boilerplateFormat);

    listing.bodyBoilerplate = boilerplate[listing.lot.type] ? boilerplate[listing.lot.type] : '';

    const newSubmittedListing = {
      marketplace: listing.marketplace,
      dateSubmitted: new Date()
    };
    try {

      if(!listing.lot.manifestFileLocation && !listing.lot.unmanifested ) {
        const generatedManifestResponse = await this.manifests.generateLotManifest( lotId , { save: true } );
        listing.lot.manifestFileLocation = generatedManifestResponse.manifest;
      }

      await this.submitFn[listing.marketplace]( listing, { publish: publish } );
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
      console.error(e);
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

    const resp = {
      marketplace: newSubmittedListing.marketplace,
      error: !!( listing.lot.status === 'Error' ),
      lot: listing.lot
    };

    return resp;
  }

}

module.exports = Client;