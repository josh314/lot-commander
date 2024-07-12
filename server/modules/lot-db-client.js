const enums = require('./enums');
const helpers = require('../helpers');
const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  IllegalActionError,
} = require('../errors');

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

  this.createLot = async function( _data ) {

    const existingLot = await this.getLotByHandle( _data.handle );

    if( existingLot ) {
      throw new IllegalActionError(`Lot with handle ${ _data.handle } already exists.`, 'DUPLICATE_LOT_HANDLE');
    }

    console.log(`Submitting new lot with data:`);
    console.log(`${JSON.stringify( _data, null, 2 )}`);

    if( !_data.status ) {
      _data.status = enums.lotStatus[0];
    }

    if( typeof _data.isDeleted !== 'boolean' ) {
      _data.isDeleted = false;
    }

    if( !_data.lotNumber ) {
      const counter = await this.countCommander.incrementCounter( 'pallet-lots' , 1 );
      _data.lotNumber = counter.count;
    }

    const newLot = new this.LotModel( _data );
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

      q = helpers.appendPopulationQueries( q, populate );

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

      q = helpers.appendPopulationQueries( q, populate );

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

  this.addImage = async function( lotId, metadata ){
    if(!lotId) {
      throw new Error('No lot ID submitted.');
    }
    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    return lot.addImage( metadata );

  };

  this.addImages = async function( lotId, images ) {

    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    for( let img of images ) {
      lot.addImage( img, { save: false } );
    }

    return lot.save();

  };

  this.setPrimaryImage = async function( lotId, imageId ){

    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    const foundImageNewPrimary = lot.images.find( item => item._id.toString() === imageId.toString() );
    if(!foundImageNewPrimary) {

      throw new ChildResourceNotFoundError( {
        parentType: 'lot',
        parentId: lotId,
        childType: 'image',
        childId: imageId
      } );

    }

    const oldPrimaryImage = lot.images.find( item => item.primary );
    if( oldPrimaryImage === foundImageNewPrimary ){
      return lot;
    }

    foundImageNewPrimary.primary = true;
    if(oldPrimaryImage) {
      oldPrimaryImage.primary = false;
    }

    return lot.save();
  };

  this.removeMedia = async function( lotId, mediaId, mediaType ) {

    const lot = await this.getLotById( lotId );

    if( !lot ) {
      throw new ResourceNotFoundError( { type: 'lot', id: lotId } );
    }

    let arr;
    if( mediaType === 'images' ) {
      arr = lot.images;
    }
    else if( mediaType === 'videos' ) {
      arr = lot.videos;
    }
    else {
      throw new IllegalActionError('Invalid media type.');
    }


    const foundIdx = arr.findIndex( item => item._id.toString() === mediaId.toString() );
    if( foundIdx === -1 ) {

      throw new ChildResourceNotFoundError( {
        parentType: 'lot',
        parentId: lotId,
        childType: mediaType,
        childId: mediaType
      } );

    }

    lot.images.splice( foundIdx, 1 );

    return lot.save();

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

