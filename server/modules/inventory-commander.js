const mongoose = require('mongoose');
const dayjs = require('dayjs');

const {
  ResourceNotFoundError,
  ChildResourceNotFoundError,
  IllegalActionError
} = require('../errors');

const helpers = require('../helpers');

/************************************************
 * Helpers
 * =======
 *
 *********/

const awaitingShipmentFilter = { isReceived: false };

const receivedShipmentFilter = { isReceived: true };

const hasProblemShipmentFilter = {
  $where: function(){

    if( this.isReceived === false ) {
      return false;
    }

    const received = this.palletsReceived;
    const expected = this.palletsExpected;

    if( !received || !expected ) {
      return true;
    }

    if( received.length !== expected.length ) {
      return true;
    }

    if( received.some( p => p.hasProblem ) ) {
      return true;
    }

    return expected.some( pe => {
      return !received.find( pr => pr.handle === pe.handle );
    } );
  }
};

const noProblemShipmentFilter = {
  $where: function(){

    if( this.isReceived === false ) {
      return true;
    }

    const received = this.palletsReceived;
    const expected = this.palletsExpected;

    if( !received || !expected ) {
      return false;
    }

    if( received.length !== expected.length ) {
      return false;
    }

    if( received.some( p => p.hasProblem ) ) {
      return false;
    }

    return expected.every( pe => {
      return !!received.find( pr => pr.handle === pe.handle );
    } );
  }
};

const awaitingOrHasProblemShipmentFilter = ( hasProblemDateArrivedStart ) => ({
  $or: [
    awaitingShipmentFilter,
    hasProblemDateArrivedStart ?
      Object.assign( hasProblemShipmentFilter, { arrivalDate: { $gt: new Date(hasProblemDateArrivedStart) } } ) :
      hasProblemShipmentFilter
  ]
});

const flawlessShipmentFilter = {
  $and: [
    receivedShipmentFilter,
    noProblemShipmentFilter
  ]
};

const withoutProblemShipmentFilter = {
  $or: [
    awaitingShipmentFilter,
    noProblemShipmentFilter
  ]
};

const shipmentQueryFilter = ( { isReceived, handle, vendor, hasProblem, hasProblemDateArrivedStart, isPaidFor, isReadyForTransportation, includeClosed=false } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }
  if ( vendor ) {
    filter.vendor = vendor;
  }


  let shipmentReceivedStatusFilter;
  if( isReceived === true ) {

    if( hasProblem === false ) {

      shipmentReceivedStatusFilter = flawlessShipmentFilter;

    }
    else {

      shipmentReceivedStatusFilter = receivedShipmentFilter;

    }

  }
  else if ( isReceived === false ) {

    if( hasProblem === true ) {

      shipmentReceivedStatusFilter = awaitingOrHasProblemShipmentFilter( hasProblemDateArrivedStart );

    }
    else {

      shipmentReceivedStatusFilter = awaitingShipmentFilter;

    }

  }
  else {

    if( hasProblem === true ) {

      shipmentReceivedStatusFilter = hasProblemShipmentFilter;

    }
    else if( hasProblem === false ) {

      shipmentReceivedStatusFilter = withoutProblemShipmentFilter;

    }

  }

  if( shipmentReceivedStatusFilter ) {

    Object.assign( filter, shipmentReceivedStatusFilter );

  }

  if( !includeClosed ) {
    Object.assign( filter, { isClosed: { $not: { $eq: true } } } );
  }

  if( isPaidFor !== undefined ) {
    filter.isPaidFor = isPaidFor;
  }

  if( isReadyForTransportation !== undefined ) {
    filter.isReadyForTransportation = isReadyForTransportation;
  }

  return filter;
};

const palletQueryFilter = ( { handle, isReceived, isBrokendown, isAnonymous, hasProblem, toBeListed, isRepacked, hasLot, shipment, category, condition } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( shipment ) {
    filter.shipment = shipment;
  }

  if( isReceived !== undefined ) {
    filter.isReceived = isReceived;
  }

  if( hasProblem !== undefined ) {
    filter.hasProblem = hasProblem;
  }

  if( isBrokendown !== undefined ) {
    filter.isBrokendown = isBrokendown;
  }

  if( isAnonymous !== undefined ) {
    filter.isAnonymous = isAnonymous;
  }

  if( toBeListed !== undefined ) {
    filter.toBeListed = toBeListed;
  }

  if( isRepacked !== undefined ) {
    filter.isRepacked = isRepacked;
  }

  if( hasLot !== undefined ) {
    filter.lot = { $exists: hasLot }; // i.e. tests (non-)existence of the `lot` field based on the value of the boolean vriable hasLot
  }

  if( category ) {
    filter.category = category;
  }

  if( condition ) {
    filter.condition = condition;
  }

  return filter;
};

const packageQueryFilter = ( { handle, pallet, shipment, includeVirtual } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( pallet ) {
    filter.pallet = pallet;
  }

  if( shipment ) {
    filter.shipment = shipment;
  }

  if( !includeVirtual ) {
    filter.isInstantiated = true;
  }

  return filter;
};

const bundleQueryFilter = ( { handle, pkg, isPacked } ) => {
  const filter = {
    isDeleted: false,
  };

  if ( handle ) {
    filter.handle = handle;
  }

  if( pkg ) {
    filter.package = pkg;
  }

  if( isPacked !== undefined ) {
    filter.isPacked = isPacked;
  }

  return filter;
};

function getShipmentDateRangeMatchDocument( { startDate, endDate, dateField = 'createdAt' } ) {

  let shipmentMatchDoc;

  if( startDate || endDate ) {

    shipmentMatchDoc = {
      $and: [
        { isDeleted: false }
      ]
    };

    if( startDate ) {

      shipmentMatchDoc.$and.push(
        { [ dateField ]: { $gte: startDate } }
      );

    }


    if( endDate ) {

      shipmentMatchDoc.$and.push(
        { [ dateField ]: { $lte: endDate } }
      );

    }

  }
  else {

    shipmentMatchDoc = {
      isDeleted: false,
    };

  }
  return shipmentMatchDoc;
}


/************************************************
 *
 * Public Database Client
 * ======================
 *
 ****/


class InventoryCommander {
  constructor( {
    IncomingShipment,
    Package,
    Bundle,
    InventoryPallet,
  }) {

    // initialize models
    this.IncomingShipment = IncomingShipment;
    this.Package = Package;
    this.Bundle = Bundle;
    this.InventoryPallet = InventoryPallet;

  }

  //=====================================================
  // Shipments
  //

  listIncomingShipments( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = shipmentQueryFilter(filterParams);

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

    let q = this.IncomingShipment.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  countIncomingShipments( filterParams ) {

    const filter = shipmentQueryFilter(filterParams);

    return this.IncomingShipment.countDocuments( filter );

  }

  async createIncomingShipment( _data ) {

    const existingShipment = await this.getIncomingShipmentByHandle( _data.handle );

    if( existingShipment ) {
      throw new IllegalActionError(`Shipment with handle ${_data.handle} already exists.`, 'DUPLICATE_SHIPMENT_HANDLE');
    }

    if( _data.priceValuePercentage && Array.isArray( _data.palletsExpected ) ) {

      _data.palletsExpected.forEach( _p => _p.priceValuePercentage = _data.priceValuePercentage );

    }

    const data = Object.assign(
      {
        isPaidFor: false,
        isReadyForTransportation: false,
        isReceived: false,
        isClosed: false,
        isDeleted: false
      },
      _data
    );

    const newShipment = new this.IncomingShipment( data );
    return newShipment.save();
  }

  getIncomingShipmentById( shipmentId, { populate, includeDeleted = false } = {} ) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId(shipmentId);
    }
    catch ( _ ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.IncomingShipment.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  getIncomingShipmentByHandle( handle, { populate, includeDeleted = false } = {} ) {

    const findDoc = { handle };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.IncomingShipment.findOne( findDoc );

    if( populate ) {

      for( let path of populate ) {

        q = q.populate( path );

      }

    }

    return q.exec();

  }

  async deleteIncomingShipment( shipmentId, { deletePallets } = {}) {

    const shipment = await this.getIncomingShipmentById( shipmentId, deletePallets ? { populate: [ 'palletsReceived' ] } : {} );

    if( !shipment || shipment.isDeleted ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    let pallets;
    if( deletePallets ) {

      pallets = await Promise.all(
        shipment.palletsReceived.map( pallet => pallet.delete() )
      );

    }

    await shipment.delete();

    return { shipment, pallets };
  }

  async editIncomingShipment( shipmentId, _editDocument ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    try {
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: shipment[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await shipment.edit( editDocument );

      // if a category change (besides the removal of category), propagate to the pallets
      if( editDocument.category ) {

        const palletsToUpdate = shipment.palletsReceived.concat( shipment.palletsConsolidated );

        for( let palletId of palletsToUpdate ) {
          await this.editInventoryPallet( palletId, { category: editDocument.category } );
        }

      }

      // if a condition change (besides the removal of condition), propagate to the pallets
      if( editDocument.condition ) {

        const palletsToUpdate = shipment.palletsReceived.concat( shipment.palletsConsolidated );

        for( let palletId of palletsToUpdate ) {
          await this.editInventoryPallet( palletId, { condition: editDocument.condition } );
        }

      }

      // if a priceValuePercentage change (besides the removal of PVR), propagate to the pallets
      if( editDocument.priceValuePercentage ) {

        const palletsToUpdate = shipment.palletsReceived.concat( shipment.palletsConsolidated );

        for( let palletId of palletsToUpdate ) {
          await this.editInventoryPallet( palletId, { priceValuePercentage: editDocument.priceValuePercentage } );
        }

      }

      return { shipment, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }
  }

  async addIncomingShipmentExpectedPallet( shipmentId, palletData ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    await shipment.addPalletExpected( palletData );

    const pallet = shipment.getPalletExpectedByHandle( palletData.handle );

    return { shipment, pallet };

  }

  async removeIncomingShipmentExpectedPallet( shipmentId, palletId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const pallet = shipment.getPalletExpectedById( palletId );

    if( !pallet ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'incoming shipment',
        parentId: shipmentId,
        childType: 'inventory pallet',
        childId: palletId
      } );
    }

    await shipment.removePalletExpected( palletId );

    return { shipment, pallet };

  }

  async editIncomingShipmentExpectedPallet( shipmentId, palletId, _editDocument ) {

    const shipment = await this.getIncomingShipmentById( shipmentId, { populate: [ 'palletsReceived' ] } );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const pallet = shipment.getPalletExpectedById( palletId );

    if( !pallet ) {
      throw new ChildResourceNotFoundError( {
        parentType: 'incoming shipment',
        parentId: shipmentId,
        childType: 'inventory pallet',
        childId: palletId
      } );
    }

    const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: pallet[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

    if( edits.length <= 0 ) {
      return {};
    }

    const editDocument = edits.reduce( (acc, _) => {
      acc[_.path] = _.newValue;
      return acc;
    }, {});

    const editedPallet = await shipment.editPalletExpected( palletId, editDocument );

    if( shipment.palletsReceived ) {

      const associatedPalletReceived = shipment.palletsReceived.find( pr => pr.handle === editedPallet.handle );

      if( associatedPalletReceived ) {

        const palletReceivedEditDoc = Object.assign( {}, JSON.parse( JSON.stringify( editedPallet ) ) );

        delete palletReceivedEditDoc._id;

        associatedPalletReceived.edit( palletReceivedEditDoc );

      }

    }

    return { shipment, pallet, edits };
  }

  async receiveIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( shipment.isReceived ) {
      return {};
    }

    await shipment.receive();

    return { shipment };

  }

  async unreceiveIncomingShipment( shipmentId, { deletePallets } = {}) {

    const shipment = await this.getIncomingShipmentById( shipmentId, deletePallets ? { populate: [ 'palletsReceived' ] } : {} );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( !shipment.isReceived ) {
      return {};
    }

    let pallets;
    if( deletePallets ) {

      pallets = await Promise.all(
        shipment.palletsReceived.map( pallet => pallet.delete() )
      );

    }

    await shipment.unreceive();

    return { shipment, pallets };
  }

  async closeIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( shipment.isClosed ) {
      return {};
    }

    await shipment.close();

    return { shipment };

  }

  async reopenIncomingShipment( shipmentId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    if( !shipment.isClosed ) {
      return {};
    }

    await shipment.reopen();

    return { shipment };
  }

  async receiveIncomingShipmentPallet( shipmentId, _palletData ) {

    const shipment = await this.getIncomingShipmentById( shipmentId, { populate: [ 'palletsReceived', 'palletsConsolidated' ] } );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const existingPallets = shipment.palletsReceived.concat( shipment.palletsConsolidated );

    const duplicatePallet = existingPallets.find( _pr => _pr.handle === _palletData.handle );

    if( duplicatePallet ) {
      throw new IllegalActionError( `A pallet with the handle '${_palletData.handle}' already exists for the shipment ${shipmentId}.`, 'DUPLICATE_PALLET_HANDLE' );
    }

    // search for an expected pallet in this shipment with matching handle to the one being received
    const correspondingPalletExpected = shipment.getPalletExpectedByHandle( _palletData.handle );

    const basePalletObject = {
      isReceived: true,
      isRepacked: false,
      shipment: shipment._id,
      isAnonymous: correspondingPalletExpected ? correspondingPalletExpected.isAnonymous : false,
      toBeListed: correspondingPalletExpected ? correspondingPalletExpected.toBeListed : false,
    };

    // use corresponding expected pallet's units
    if( correspondingPalletExpected && correspondingPalletExpected.units ) {
      basePalletObject.units = correspondingPalletExpected.units;
    }

    // use corresponding expected pallet's retailValue
    if( correspondingPalletExpected && correspondingPalletExpected.retailValue ) {
      basePalletObject.retailValue = correspondingPalletExpected.retailValue;
    }

    // use corresponding expected pallet's priceValuePercentage
    if( correspondingPalletExpected && correspondingPalletExpected.priceValuePercentage ) {
      basePalletObject.priceValuePercentage = correspondingPalletExpected.priceValuePercentage;
    }

    // use corresponding expected pallet's salePrice
    if( correspondingPalletExpected && correspondingPalletExpected.salePrice ) {
      basePalletObject.salePrice = correspondingPalletExpected.salePrice;
    }

    // use corresponding expected pallet's cost
    if( correspondingPalletExpected && correspondingPalletExpected.cost ) {
      basePalletObject.cost = correspondingPalletExpected.cost;
    }

    // use corresponding expected pallet's category or shipment's category
    if( correspondingPalletExpected && correspondingPalletExpected.category ) {
      basePalletObject.category = correspondingPalletExpected.category;
    }
    else if ( shipment.category ) {
      basePalletObject.category = shipment.category;
    }

    // use corresponding expected pallet's condition or shipment's condition
    if( correspondingPalletExpected && correspondingPalletExpected.condition ) {
      basePalletObject.condition = correspondingPalletExpected.condition;
    }
    else if ( shipment.condition ) {
      basePalletObject.condition = shipment.condition;
    }

    const palletData = Object.assign(
      basePalletObject,
      _palletData
    );

    const { pallets: [ pallet ] } = await this.createInventoryPallets( palletData );

    await shipment.receivePallet( pallet._id );

    return { shipment, palletReceived: pallet, palletExpected: correspondingPalletExpected };
  }


  async deleteIncomingShipmentPalletReceived( shipmentId, palletId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId, { includeDeleted: true } );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const found = shipment.palletsReceived.includes( mongoose.Types.ObjectId(palletId) );

    if( found ) {

      var { pallet } = await this.deleteInventoryPallet( palletId );

      await shipment.removePalletReceived( palletId );
    }

    // eslint-disable-next-line block-scoped-var
    return { shipment, pallet };

  }

  async addIncomingShipmentPalletConsolidated( shipmentId, _palletData ) {

    const shipment = await this.getIncomingShipmentById( shipmentId, { populate: [ 'palletsReceived', 'palletsConsolidated' ] } );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const existingPallets = shipment.palletsReceived.concat( shipment.palletsConsolidated );

    const duplicatePallet = existingPallets.find( _pr => _pr.handle === _palletData.handle );

    if( duplicatePallet ) {
      throw new IllegalActionError(`A pallet with the handle ${_palletData.handle} already exists for the shipment ${shipmentId}.`, 'DUPLICATE_PALLET_HANDLE' );
    }

    const basePalletObject = {
      isReceived: false,
      shipment: shipment._id,
      category: shipment.category,
      condition: shipment.condition,
    };

    const palletData = Object.assign(
      basePalletObject,
      _palletData
    );

    const { pallets: [ pallet ] } = await this.createInventoryPallets( palletData );

    await shipment.addPalletConsolidated( pallet._id );

    return { shipment, pallet };
  }

  async deleteIncomingShipmentPalletConsolidated( shipmentId, palletId ) {

    const shipment = await this.getIncomingShipmentById( shipmentId );

    if( !shipment ) {
      throw new ResourceNotFoundError( { type: 'incoming shipment', id: shipmentId } );
    }

    const found = shipment.palletsConsolidated.includes( mongoose.Types.ObjectId(palletId) );

    if( found ) {

      var { pallet } = await this.deleteInventoryPallet( palletId );

      await shipment.removePalletConsolidated( palletId );
    }

    // eslint-disable-next-line block-scoped-var
    return { shipment, pallet };

  }

  //==========================================================
  // Inventory Pallets
  //


  listInventoryPallets( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = palletQueryFilter(filterParams);

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
      sortParams.createdAt = 1;
    }
    if( sortField !== 'handle' ) {
      sortParams.handle = 1;
    }

    let q = this.InventoryPallet.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  countInventoryPallets( filterParams ) {

    const filter = palletQueryFilter(filterParams);

    return this.InventoryPallet.countDocuments( filter );

  }

  async createInventoryPallets( _data ) {

    if( Array.isArray( _data ) ) {
      const pallets  = await this.InventoryPallet.create(_data);
      return { pallets  };
    }

    const pallet = await ( new this.InventoryPallet( _data ) ).save();
    return { pallets : [ pallet ] };

  }

  getInventoryPalletById( palletId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( palletId );
    }
    catch ( _ ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.InventoryPallet.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async deleteInventoryPallet( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( pallet.isDeleted ) {
      return {};
    }

    await pallet.delete();

    return { pallet };
  }

  async editInventoryPallet( palletId, _editDocument ) {

    const pallet = await this.getInventoryPalletById( palletId, { populate: [ 'shipment', 'shipment.palletsReceived', 'shipment.palletsConsolidated' ] } );
    const shipment = pallet.shipment;

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( _editDocument.handle ) {

      if( shipment ) {

        const duplicatePallet = shipment.palletsReceived.concat( shipment.palletsConsolidated ).find( _p => _p.handle === _editDocument.handle && _p._id.toString() !== pallet._id.toString() );

        if( duplicatePallet ) {
          throw new IllegalActionError( `A pallet with the handle '${_editDocument.handle}' already exists for the shipment ${shipment._id}.`, 'DUPLICATE_PALLET_HANDLE' );
        }

      }

    }

    try {
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: pallet[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await pallet.edit( editDocument );

      return { pallet, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }

  }

  async unlinkInventoryPalletLot( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    try{

      await pallet.unlinkLot( );

      return { pallet };

    }
    catch(e) {
      console.error(e);
      return {};
    }

  }

  async breakdownInventoryPallet( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( pallet.isBrokendown ) {
      return {};
    }

    await pallet.breakdown();

    return { pallet };

  }

  async unbreakdownInventoryPallet( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( !pallet.isBrokendown ) {
      return {};
    }

    await pallet.unbreakdown();

    return { pallet };

  }

  async repackInventoryPallet( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( pallet.isRepacked ) {
      return {};
    }

    await pallet.repack();

    return { pallet };

  }

  async unrepackInventoryPallet( palletId ) {

    const pallet = await this.getInventoryPalletById( palletId );

    if( !pallet ) {
      throw new ResourceNotFoundError( { type: 'inventory pallet', id: palletId } );
    }

    if( !pallet.isRepacked ) {
      return {};
    }

    await pallet.unrepack();

    return { pallet };

  }

  //==========================================================
  // Packages
  //

  listPackages( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = packageQueryFilter(filterParams);

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

    let q = this.Package.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();
  }

  countPackages( filterParams ) {

    const filter = packageQueryFilter(filterParams);

    return this.Package.countDocuments( filter );

  }

  async createPackages( _data, instantiate = false ) {

    let packages;

    if( Array.isArray( _data ) ) {
      packages = await this.Package.create(_data);
    }
    else {
      const pkg = await ( new this.Package( _data ) ).save();
      packages = [ pkg ];
    }

    if( instantiate ) {

      for( let _pkg of packages ) {
        await this.instantiatePackage( _pkg._id );
      }

    }

    return { packages };

  }

  getPackageById( pkgId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( pkgId );
    }
    catch ( _ ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Package.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  getPackagesById( pkgIds, { populate, includeDeleted = false } = {}) {

    const objectIds = pkgIds.map( _pkgId => {

      try {
        return new mongoose.Types.ObjectId( _pkgId );
      }
      catch ( _ ) {
        return null;
      }

    } ).filter( _ => _ );


    const findDoc = { _id: { $in: objectIds } };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Package.find( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async deletePackage( pkgId ) {

    const pkg = await this.getPackageById( pkgId );

    if( !pkg ) {
      throw new ResourceNotFoundError( { type: 'package', id: pkgId } );
    }

    if( pkg.isDeleted ) {
      return {};
    }

    if( pkg.shipment ) {

      await pkg.shipment.removePackage( pkgId );

    }

    await pkg.delete();

    return { package: pkg };
  }

  async editPackage( pkgId, _editDocument ) {

    const pkg = await this.getPackageById( pkgId );

    if( !pkg ) {
      throw new ResourceNotFoundError( { type: 'package', id: pkgId } );
    }

    try {
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: pkg[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await pkg.edit( editDocument );

      return { package: pkg, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }

  }

  async instantiatePackage( pkgId ) {

    const pkg = await this.getPackageById( pkgId, { populate: [ 'shipment', 'pallet', 'lot' ] } );

    if( !pkg ) {
      throw new ResourceNotFoundError( { type: 'package', id: pkgId } );
    }

    if( pkg.isInstantiated ) {
      return {};
    }

    await pkg.instantiate();

    if( pkg.shipment ) {

      await pkg.shipment.addPackage( pkgId );

    }

    return { package: pkg };

  }

  async uninstantiatePackage( pkgId ) {

    // TODO: link/unlink bundles, sub-packages, components

    const pkg = await this.getPackageById( pkgId, { populate: [ 'shipment', 'pallet', 'lot' ] } );

    if( !pkg ) {
      throw new ResourceNotFoundError( { type: 'package', id: pkgId } );
    }

    if( !pkg.isInstantiated ) {
      return {};
    }

    await pkg.uninstantiate();

    if( pkg.shipment ) {

      await pkg.shipment.removePackage( pkgId );

    }

    return { package: pkg };

  }


  //==========================================================
  // Bundles
  //

  listBundles( { num, skip, sort, sortDir, filterParams, populate = [] } ) {

    const filter = bundleQueryFilter(filterParams);

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

    let q = this.Bundle.find( filter ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();
  }

  countBundles( filterParams ) {

    const filter = bundleQueryFilter(filterParams);

    return this.Bundle.countDocuments( filter );

  }

  async createBundles( _data ) {

    if( Array.isArray( _data ) ) {
      const bundles = await this.Bundle.create(_data);
      return { bundles };
    }

    const bundle = await ( new this.Bundle( _data ) ).save();
    return { bundles: [ bundle ] };

  }

  getBundleById( bundleId, { populate, includeDeleted = false } = {}) {

    let objectId;

    try {
      objectId = new mongoose.Types.ObjectId( bundleId );
    }
    catch ( _ ) {
      return null;
    }

    const findDoc = { _id: objectId };

    if( !includeDeleted ) {
      findDoc.isDeleted = false;
    }

    let q = this.Bundle.findOne( findDoc );

    if( populate ) {

      q = helpers.appendPopulationQueries( q, populate );

    }

    return q.exec();

  }

  async deleteBundle( bundleId ) {

    const bundle = await this.getBundleById( bundleId );

    if( !bundle ) {
      throw new ResourceNotFoundError( { type: 'bundle', id: bundleId } );
    }

    if( bundle.isDeleted ) {
      return {};
    }

    await bundle.delete();

    return { bundle };
  }

  async editBundle( bundleId, _editDocument ) {

    const bundle = await this.getBundleById( bundleId );

    if( !bundle ) {
      throw new ResourceNotFoundError( { type: 'bundle', id: bundleId } );
    }

    try {
      const edits = Object.keys( _editDocument ).map( _key => ({ path: _key, oldValue: bundle[ _key ], newValue: _editDocument[ _key ] }) ).filter( x => x.oldValue !== x.newValue );

      if( edits.length <= 0 ) {
        return {};
      }

      const editDocument = edits.reduce( (acc, _) => {
        acc[_.path] = _.newValue;
        return acc;
      }, {});

      await bundle.edit( editDocument );

      return { bundle, edits };
    }
    catch(e) {
      console.error(e);
      return {};
    }

  }

  //==========================================================
  // Aggregation and Inventory Levels
  //
  //

  async aggregateInventoryPallets( { date } ) {

    let matchDoc;
    if( date ) {

      matchDoc = {
        $and: [
          { // was created by date
            createdAt: { $lte: date }
          },
          { isDeleted: false }, // not deleted
          { // either never brokendown or brokendown after date
            $or: [
              { isBrokendown: false },
              { brokendownDate: { $gte: date } }
            ]
          }
        ]
      };

    }
    else {

      matchDoc = {
        isDeleted: false,
        isBrokendown: false
      };

    }

    const groups = await this.InventoryPallet.aggregate()
      .match( matchDoc )
      .group( {
        _id: {
          "category": "$category",
          "condition": "$condition"
        },
        count: { $sum: 1 },
        cost: { $sum: "$cost" }
      } );

    const groupTitleMap = groups.map( _grp => {

      const res = {
        count: _grp.count
      };

      if( _grp.cost ) {
        res.cost = _grp.cost;
      }

      if( _grp._id.category ) {
        res.category = _grp._id.category;
      }

      if( _grp._id.condition ) {
        res.condition = _grp._id.condition;
      }

      return res;
    })
      .reduce( ( acc, grp ) => {

        // title = "category:condition", "uncategorized:condition" or "category"
        const title = `${ grp.category ? grp.category : 'uncategorized' }${ grp.condition ? ` -- ${grp.condition}` : '' }`;

        const existingGrp = acc.get(title);
        if( existingGrp ) {
          existingGrp.count += grp.count;
          existingGrp.cost += grp.cost;
        }
        else {
          acc.set( title, Object.assign( { title }, grp ) );
        }

        return acc;
      }, new Map());

    return [ ...groupTitleMap.values() ].sort( (a,b) => a.title < b.title ? -1 : 1 );

  }

  async getPackageInventory( { date } ) {

    let matchDoc;
    if( date ) {

      matchDoc = {
        $and: [
          { // was created and finished by date
            finishedDate: { $lte: date },
          },
          { // either never deleted or deleted after date
            $or: [
              { isDeleted: false },
              { deletedDate: { $gte: date } }
            ]
          },
          { // either never shipped or shipped after date
            $or: [
              { isShipped: false },
              { shippedDate: { $gte: date } }
            ]
          }
        ]
      };

    }
    else {

      matchDoc = {
        isFinished: true,
        isDeleted: false,
        isShipped: false
      };

    }

    return this.Package.aggregate()
      .match( matchDoc )
      .project( {
        class: { //either "type:units" or just type
          $cond:{
            if: "$units",
            then: {
              $concat: [
                "$type",
                ":",
                { $toString: "$units" }
              ]
            },
            else: "$type"
          }
        }
      } )
      .group( {
        _id: "$class",
        count: { $sum: 1 }
      } )
      .project( {
        _id: 0,
        class: "$_id",
        count: "$count"
      } );

  }

  async aggregateExpectedPallets( { startDate, endDate } ) {

    const shipmentMatchDoc = getShipmentDateRangeMatchDocument( { startDate, endDate } );

    const groups = await this.IncomingShipment.aggregate()
      .match( shipmentMatchDoc )
      .unwind( 'palletsExpected' )
      .group( {
        _id: {
          "category": "$palletsExpected.category",
          "condition": "$palletsExpected.condition"
        },
        units: { $sum: "$palletsExpected.units" },
        count: { $sum: 1 },
        cost: { $sum: "$palletsExpected.cost" }
      } );

    const groupTitleMap = groups.map( _grp => {

      const res = {
        count: _grp.count
      };

      if( _grp.cost ) {
        res.cost = _grp.cost;
      }

      if( _grp.units ) {
        res.units = _grp.units;
      }

      if( _grp._id.category ) {
        res.category = _grp._id.category;
      }

      if( _grp._id.condition ) {
        res.condition = _grp._id.condition;
      }

      return res;
    })
      .reduce( ( acc, grp ) => {

        // title = "category:condition", "uncategorized:condition" or "category"
        const title = `${ grp.category ? grp.category : 'uncategorized' }${ grp.condition ? ` -- ${grp.condition}` : '' }`;

        const existingGrp = acc.get(title);
        if( existingGrp ) {
          existingGrp.count += grp.count;
          existingGrp.cost += grp.cost;
        }
        else {
          acc.set( title, Object.assign( { title }, grp ) );
        }

        return acc;
      }, new Map());

    return [ ...groupTitleMap.values() ].sort( (a,b) => a.title < b.title ? -1 : 1 );


  }

  async aggregateTransportationCosts( { startDate, endDate, period } ){

    // initialize parameters
    startDate = dayjs( startDate ).startOf('day');
    endDate = dayjs( endDate ).endOf('day');
    if ( ![ 'year', 'quarter', 'month', 'week', 'day' ].includes( period )  ) {
      period = 'month';
    }

    const startDates = [  ];
    let _nextDate = startDate;
    while( _nextDate < endDate ) {
      startDates.push( _nextDate.toDate() );
      _nextDate = _nextDate.endOf( period ).add(1, 'day').startOf( period );
    }
    const boundaries = startDates.concat( [ endDate.toDate() ] );

    const costs = await this.IncomingShipment.aggregate(
      [
        {
          $match: getShipmentDateRangeMatchDocument( { startDate: startDate.toDate(), endDate: endDate.toDate(), dateField: 'arrivalDate' } )
        },
        {
          $bucket: {
            groupBy: '$arrivalDate',
            boundaries: boundaries,
            default: "Other",
            output: {
              "cost": { $sum: "$transportationCost" },
            }
          }
        }
      ]
    )
      .project( {
        _id: 0,
        date: "$_id",
        cost: "$cost"
      } );

    if( costs.length < startDates.length ) {
      for( let _d of startDates ) {

        const found = costs.find( _ => _.date.toString() === _d.toString() );

        if( !found ) {
          costs.push( { date: _d, cost: 0 } );
        }

      }
      costs.sort( (a,b) => a.date < b.date ? -1 : 1 );
    }


    return {
      costs
    };

  }

}

module.exports = InventoryCommander;