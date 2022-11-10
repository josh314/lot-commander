/*********************************************************
**********************************************************
************** Constructor function **********************
**********************************************************
**********************************************************/


const lotQueryFilter = ( { handle, status } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( status ) {
    filter.status = status;
  }

  return filter;
};


exports.Client = function( { Lot } ) {

  this.LotModel = Lot;
  this.enums = Lot.enums;

  this.countLots = function( filterParams ) {

    const filter = lotQueryFilter( filterParams );

    return this.LotModel.countDocuments( filter );
  };


  this.listLots = function( { num, skip, sort, sortDir, filterParams } ) {

    const filter = lotQueryFilter( filterParams );

    let sortField;
    if ( sort ) {
      sortField = sort;
    }
    else {
      sortField = 'createdAt';
    }

    const sortParams = {
      [ sortField ] : sortDir || 1
    };

    if( sortField !== 'createdAt' ) {
      sortParams.createdAt = -1;
    }

    const q = this.LotModel.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
    return q.exec();

  };

  this.submitNewLot = function(lot) {
    //TODO: validation -> needs handle
    if(!lot.status) {
      lot.status = this.enums.status[0];
    }

    if( typeof lot.isDeleted !== 'boolean' ) {
      lot.isDeleted = false;
    }

    const newLot = new this.LotModel(lot);
    return newLot.save();
  };

  this.updateLot = async function(lot) {
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
    if('category' in lot) {
      updateDocument.category = lot.category;
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
  };

  this.getLotById = function( lotId, { populate } = {} ) {

    const findDoc = {
      _id: lotId,
      isDeleted: false
    };

    let q = this.LotModel.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  };

  this.getLotByHandle = function( lotHandle, { populate } = {} ) {

    const findDoc = {
      handle: lotHandle,
      isDeleted: false
    };

    let q = this.LotModel.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  };

  this.deleteLot = function(lotId) {
    return this.LotModel.findOneAndUpdate(
      { _id: lotId },
      { $set: { isDeleted: true } },
      { new: true }
    );
  };

  this.addImage = function(lotId, metadata){
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return this.LotModel.findOne({ _id: lotId }).then(lot=>{
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
  };

  this.setPrimaryImage = function(lotId, image){
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return this.LotModel.findOne({ _id: lotId }).then(lot=>{
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
  };

  this.removeImage = function(lotId, image) {
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    return this.LotModel.findOne({ _id: lotId }).then(lot=>{
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
  };

  this.add3pManifest = function(lotId, manifestData) {
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    if(!manifestData) {
      throw new Error("No manifest data submitted.");
    }
    return this.LotModel.findOne({ _id: lotId }).then(lot=>{
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
  };
};

