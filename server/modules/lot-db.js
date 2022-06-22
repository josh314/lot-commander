const {
  IllegalActionError
} = require('../errors');

module.exports = function( lotdbClient ) {


  function getLotById( lotId ) {
    return lotdbClient.getLotById( lotId );
  }

  function getLotByHandle( handle ) {
    return lotdbClient.getLotByHandle( handle );
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

    _data.listings = [{ platform: 'bstock', body: ''}];

    return lotdbClient.submitNewLot( _data );

  }

  function editLot( _data ) {
    return lotdbClient.updateLot( _data );
  }

  function setPrimaryImage( lotId, image ) {
    return lotdbClient.setPrimaryImage( lotId, image );
  }

  function addImage (lotId, imageMetadata ) {
    return lotdbClient.addImage( lotId, imageMetadata );
  }

  function removeImage( lotId, image ) {
    return lotdbClient.removeImage( lotId, image );
  }

  function markAsListed( lotId ) {
    const data = {
      _id: lotId,
      status: 'Listed'
    };
    return lotdbClient.updateLot( data );
  }

  function deleteLot( lotId ) {
    return lotdbClient.deleteLot( lotId );
  }


  return {

    // other functionality
    countLots,
    listLots,
    getLotById,
    getLotByHandle,
    deleteLot,
    createLot,
    editLot,
    setPrimaryImage,

    addImage,
    removeImage,
    markAsListed,

    // Export data types
    enums: lotdbClient.enums,
  };

};
