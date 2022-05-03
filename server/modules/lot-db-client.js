const mongoose = require('mongoose');
const Promise = require('bluebird');

/*********************************************************
**********************************************************
************** Constructor function **********************
**********************************************************
**********************************************************/

exports.Client = function(opts={}) {

  let mongooseConn;

  if(!opts.connection && !(opts.host && opts.port)){
    throw new Error('Initialize with an options object with either `connection` or `host` and `port` fields');
  }

  if(opts.connection) {
    console.log(`Using existing connection for lot-db.`);
    mongooseConn = opts.connection;
  }
  else {
    const mongoUserStr = opts.auth && opts.auth.user && opts.auth.pwd ? `${opts.auth.user}:${opts.auth.pwd}@` : '';
    const optionsStr = opts.options ? `?${require('querystring').stringify(opts.options)}` : '';

    let connectionStr;
    if(opts.atlas) {
      connectionStr = `mongodb+srv://${mongoUserStr}${opts.host}/${opts.db}${optionsStr}`;
    }
    else {
      connectionStr = `mongodb://${mongoUserStr}${opts.host}:${opts.port}/${opts.db}${optionsStr}`;
    }

    console.log(`Connecting to lot-db: ${connectionStr}`);
    const mongooseConnOpts = {
      // useMongoClient: true,
      keepAlive: 300000,
      connectTimeoutMS: 30000,
      socketTimeoutMS: 300000,
      autoIndex: false,
      useNewUrlParser: true,
    };
    mongooseConn = mongoose.createConnection(connectionStr, mongooseConnOpts); // connect to our database
  }

  const lot = require( './models/lot' );
  const LotModel = mongooseConn.model( 'Lot', lot.schema );
  this.LotModel = LotModel;
  this.enums = lot.enums;

  this.closeConn = function() { mongooseConn.close(); };


  this.getLots = function(query, opts={}) {
    const sortOpts = opts.sort || { createdAt: -1 };
    if(opts.limit) {
      return this.LotModel.find(query).sort(sortOpts).limit(opts.limit);
    }
    else {
      return this.LotModel.find(query).sort(sortOpts);
    }
  };

  this.submitNewLot = Promise.method(function(lot) {
    //TODO: validation -> needs handle
    if(!lot.status) {
      lot.status = this.enums.status[0];
    }
    const newLot = new this.LotModel(lot);
    return newLot.save();
  });

  this.updateLot = Promise.method(async function(lot) {
    //TODO: validation -> needs handle
    if(!lot || !lot._id)
      throw new Error('Not a valid lot.');

    const updateDocument = { };

    if(lot.handle) {
      updateDocument.handle = lot.handle;
    }
    if('description' in lot) {
      updateDocument.description = lot.description;
    }
    if(lot.type) {
      updateDocument.type = lot.type;
    }
    if(lot.packagingType) {
      updateDocument.packagingType = lot.packagingType;
    }
    if(lot.manifestId) {
      updateDocument.manifestId = lot.manifestId;
    }
    if('totalUnits' in lot) {
      updateDocument.totalUnits = lot.totalUnits;
    }
    if(lot.estimatedRetailValue) {
      updateDocument.estimatedRetailValue = lot.estimatedRetailValue;
    }
    if(lot.numBoxes) { // DEPRECATED: use shippingItems for new data
      updateDocument.numBoxes = lot.numBoxes;
    }
    if(lot.status) {
      updateDocument.status = lot.status;
    }
    if(lot.soldOn) {
      updateDocument.soldOn = lot.soldOn;
    }
    if(lot.listedOn) {
      updateDocument.listedOn = lot.listedOn;
    }
    if(lot.destinationMarketplace) {
      updateDocument.destinationMarketplace = lot.destinationMarketplace;
    }
    if(lot.listings) {
      updateDocument.listings = lot.listings;
    }
    if(lot.submittedListings) {
      updateDocument.submittedListings = lot.submittedListings;
    }
    if(lot.listingData) {
      updateDocument.listingData = lot.listingData;
    }
    if("unmanifested" in lot) {
      updateDocument.unmanifested = lot.unmanifested;
    }
    if(lot.manifestFileLocation) {
      updateDocument.manifestFileLocation = lot.manifestFileLocation;
    }
    if(lot.shippingItems) {
      updateDocument.shippingItems = lot.shippingItems;
    }
    return this.LotModel.findOneAndUpdate(
      { _id: lot._id },
      { $set: updateDocument },
      { new: true }
      // { upsert: true, new: true }
    );
  });

  this.getLotById = Promise.method(function(lotId) {
    return LotModel.findOne({ _id: lotId });
  });

  this.getLotByHandle = Promise.method(function(lotHandle) {
    return LotModel.findOne({ handle: lotHandle });
  });

  this.deleteLot = Promise.method(function(lotId) {
    return LotModel.remove({_id: lotId});
  });

  this.addImage = Promise.method(function(lotId, metadata){
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return LotModel.findOne({ _id: lotId }).then(lot=>{
      if(!lot) {
        return { error: "Lot ID not found." };
      }

      const data = { primary: metadata.primary };
      if(metadata.s3) {
        data.s3 = metadata.s3;
      }
      if(metadata.filename) {
        data.filename = metadata.filename;
      }

      return this.LotModel.findOneAndUpdate(
        { _id: lot._id },
        { $set: { images: lot.images.concat([data]) } },
        { new: true }
        // { upsert: true, new: true }
      );
    });
  });

  this.setPrimaryImage = Promise.method(function(lotId, image){
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return LotModel.findOne({ _id: lotId }).then(lot=>{
      if(!lot) {
        return { error: "Lot ID not found." };
      }

      const oldPrimaryImage = lot.images.find(item => item.primary);
      if(oldPrimaryImage && (image.s3 ? oldPrimaryImage.s3===image.s3 : oldPrimaryImage.filename===image.filename) ){
        return lot;
      }
      const foundImageNewPrimary = lot.images.find(item => image.s3 ? item.s3 === image.s3 : item.filename === image.filename);
      if(!foundImageNewPrimary) {
        return { error: `Image ${ image.s3 || image.filename } not associated with lot ${lotId}.` };
      }

      foundImageNewPrimary.primary = true;
      if(oldPrimaryImage) {
        oldPrimaryImage.primary = false;
      }

      return this.LotModel.findOneAndUpdate(
        { _id: lot._id },
        { $set: { images: lot.images } },
        { new: true }
        // { upsert: true, new: true }
      );
    });
  });

  this.removeImage = Promise.method(function(lotId, image) {
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return LotModel.findOne({ _id: lotId }).then(lot=>{
      if(!lot) {
        return { error: "Lot ID not found." };
      }

      const foundImageToBeRemovedIndex = lot.images.findIndex(item => image.s3 ? item.s3 === image.s3 : item.filename === image.filename);
      if(foundImageToBeRemovedIndex==-1) {
        return { error: `Image ${image} not associated with lot ${lotId}.` };
      }

      lot.images.splice(foundImageToBeRemovedIndex, 1);
      return this.LotModel.findOneAndUpdate(
        { _id: lot._id },
        { $set: { images: lot.images } },
        { new: true }
        // { upsert: true, new: true }
      );
    });
  });

  this.add3pManifest = Promise.method(function(lotId, manifestData) {
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    if(!manifestData) {
      throw new Error("No manifest data submitted.");
    }
    return LotModel.findOne({ _id: lotId }).then(lot=>{
      if(!lot) {
        return { error: "Lot ID not found." };
      }
      if(!lot.thirdPartyManifests) {
        lot.thirdPartyManifests = [];
      }
      lot.totalUnits = ( lot.totalUnits ? lot.totalUnits : 0 ) + manifestData.totalUnits;
      lot.thirdPartyManifests.push(manifestData);
      return lot.save();
    });
  });
};

