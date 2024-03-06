const enums = require('./enums');
const helpers = require('../helpers');
const { ResourceNotFoundError } = require('../errors');

const lotQueryFilter = ( { handle, lotNumber, status } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( lotNumber ) {
    filter.lotNumber = lotNumber;
  }

  if( status ) {
    filter.status = status;
  }

  return filter;
};


/*********************************************************
**********************************************************
************** Constructor function **********************
**********************************************************
**********************************************************/



exports.Client = function( { Lot, countCommander } ) {

  this.LotModel = Lot;
  this.countCommander = countCommander;

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

  this.createLot = async function(lot) {
    //TODO: validation -> needs handle
    if(!lot.status) {
      lot.status = enums.lotStatus[0];
    }

    if( typeof lot.isDeleted !== 'boolean' ) {
      lot.isDeleted = false;
    }

    if( !lot.lotNumber ) {
      const counter = await this.countCommander.incrementCounter( 'pallet-lots' , 1 );
      lot.lotNumber = counter.count;
    }

    const newLot = new this.LotModel(lot);
    return newLot.save();
  };

  this.editLot = async function( lotId, _editDocument ) {

    try {

      const lot = await this.getLotById( lotId );

      if( !lot ) {
        throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
      }

      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: lot[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await lot.edit( editDocument );

      return { lot, edits };

    }
    catch( e ) {
      console.error( e );
      throw e;
    }

  };

  this.getLotById = function( lotId, { populate } = {} ) {

    const findDoc = {
      _id: lotId,
      isDeleted: false
    };

    let q = this.LotModel.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

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

  this.getLotsByHandles = function( handles, { populate } = {} ) {

    const findDoc = {
      handle: { $in: handles },
      isDeleted: false
    };

    let q = this.LotModel.find( findDoc );

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

  this.addImages = async function( lotId, images ) {

    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    for( let img of images ) {
      lot.images.push( img );
    }

    return lot.save();

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

  this.generateLotNumber = async function( lotId ) {

    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }


    if( !lot.lotNumber ) {

      const counter = await this.countCommander.incrementCounter( 'pallet-lots' , 1 );
      lot.lotNumber = counter.count;

      return lot.save();

    }
    else {

      return lot;

    }

  };
};

