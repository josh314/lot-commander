const {
  IllegalActionError
} = require('../errors');

module.exports = function( lotdbClient ) {


  function getLotById( lotId, { populate } = {} ) {
    return lotdbClient.getLotById( lotId, { populate } );
  }

  function getLotByHandle( handle, { populate } = {}  ) {
    return lotdbClient.getLotByHandle( handle, { populate } );
  }

  function getLotsByHandles( handles, { populate } = {} ) {
    return lotdbClient.getLotsByHandles( handles, { populate } );
  }

  function listLots( query ) {
    return lotdbClient.listLots( query );
  }

  function countLots( query ) {
    return lotdbClient.countLots( query );
  }

  async function createLot( _data ) {

    const existingLot = await lotdbClient.getLotByHandle( _data.handle );

    if( existingLot ) {
      throw new IllegalActionError(`Lot with handle ${ _data.handle } already exists.`, 'DUPLICATE_LOT_HANDLE');
    }

    console.log(`Submitting new lot with data:`);
    console.log(`${JSON.stringify( _data, null, 2 )}`);

    return lotdbClient.createLot( _data );

  }

  function editLot( lotId, _data ) {
    return lotdbClient.editLot( lotId, _data );
  }

  function setPrimaryImage( lotId, imageId ) {
    return lotdbClient.setPrimaryImage( lotId, imageId );
  }

  function addImage( lotId, imageMetadata ) {
    return lotdbClient.addImage( lotId, imageMetadata );
  }

  function addImages( lotId, images ) {
    return lotdbClient.addImages( lotId, images );
  }

  function removeImage( lotId, imageId ) {
    return lotdbClient.removeImage( lotId, imageId );
  }

  function deleteLot( lotId ) {
    return lotdbClient.deleteLot( lotId );
  }

  function generateLotNumber( lotId ) {
    return lotdbClient.generateLotNumber( lotId );
  }

  return {

    // other functionality
    countLots,
    listLots,
    getLotById,
    getLotByHandle,
    getLotsByHandles,
    deleteLot,
    createLot,
    editLot,
    setPrimaryImage,

    addImage,
    addImages,
    removeImage,
    generateLotNumber,

  };

};
