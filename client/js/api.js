import qs from 'querystring';
import axios from 'axios';


/*************************************************
* Helpers & util
* ======================
*
************/

function getPopulateQueryParamsObject( populateArray = [] ) {

  let obj = {};

  for( let s of populateArray ) {
    obj[ `populate_${s}` ] = 1;
  }

  return obj;
}


/*************************************************
* Lot-db and Manifest-db
* ======================
*
************/

export function listLots( queryParams ) {

  return axios({
    method: 'get',
    url: `/api/lots/?${ queryParams ? qs.stringify( queryParams ) : ''}`
  })
    .then( resp => resp.data && resp.data.lots );

}

export function countLots( queryParams ) {

  return axios({
    method: 'get',
    url: `/api/lots/count?${ queryParams ? qs.stringify( queryParams ) : ''}`
  })
    .then( resp => resp.data );

}

export function getLotByHandle( handle, { populate = [] } = {}  ) {

  if(!handle) {
    throw new Error('Must supply lot handle.');
  }

  const queryParams = getPopulateQueryParamsObject( populate );

  return axios({
    method: 'get',
    url: `/api/lots/by-handle/${handle}?${ qs.stringify( queryParams ) }`
  })
    .then( resp => resp.data && resp.data.lot );

}

export function getLot( lotId, { populate = [] } = {} ) {

  if(!lotId) {
    throw new Error('Must supply lot ID.');
  }

  const queryParams = getPopulateQueryParamsObject( populate );

  return axios({
    method: 'get',
    url: `/api/lots/${ lotId }?${ qs.stringify( queryParams ) }`
  })
    .then( resp => resp.data && resp.data.lot );

}

export function getManifest( manifestId ) {

  if(!manifestId) {
    throw new Error('Must supply manifest ID.');
  }

  return axios({
    method: 'get',
    url: `/api/lots/manifest/${ manifestId }`
  })
    .then( resp => resp.data && resp.data.manifest );

}

export function import3rdPartyManifestBlock( { lot, blockId } ) {

  return axios({
    method: 'post',
    url: `/api/db/import-3p-manifest-block`,
    data: { lot, blockId }
  })
    .then( resp => resp.data );

}

export function createLot( data ) {

  return axios({
    method: 'post',
    url: `/api/lots/`,
    data: data
  })
    .then( resp => resp.data );

}

export function deleteLot( lotId ) {

  if(!lotId) {
    throw new Error('Must supply lot ID.');
  }

  return axios({
    method: 'delete',
    url: `/api/lots/${ lotId }`
  })
    .then( resp => resp.data );

}

export function editLot( lotId, data ) {

  if(!lotId) {
    throw new Error('Must supply lot ID.');
  }

  return axios({
    method: 'patch',
    url: `/api/lots/${ lotId }`,
    data: data
  })
    .then( resp => resp.data && resp.data.lot );

}

export function saveLotManifest( lot ) {

  if(!lot) {
    throw new Error('Must supply lot data.');
  }

  return axios({
    method: 'post',
    url: `/api/lots/${lot._id}/manifest`,
    data: { lot }
  })
    .then( resp => resp.data && resp.data.manifest );

}

export function uploadLotManifestFile( lotId, file, filename ) {

  if( !lotId ) {
    throw new Error('Must supply lot ID.');
  }

  const fd = new FormData();
  fd.append( 'file', file ); // type File object

  const url = filename ? `/api/lots/${ lotId }/upload-manifest/${ filename }` : `/api/lots/${ lotId }/upload-manifest`;

  return axios({
    method: 'post',
    url,
    data: fd
  })
    .then( resp => resp.data  );

}

export function setPrimaryLotImage( lotId, image ) {
  return axios({
    method: 'post',
    url: `/api/lots/${lotId}/primary-image`,
    data: {
      image: image
    }
  })
    .then( resp => resp.data );
}

/*************************************************
* Manifests
* =========
*
************/

export function listManifests( isPublic = false ) {

  const qp = {
    num: 25,
    prefix: isPublic ? 'public' : 'private'
  };

  const uri = `/api/manifests/?${qs.stringify(qp)}`;

  return axios.get(uri).then( resp => {
    const manifests = resp.data.manifests;
    return manifests.filter( x => !x.name.match(/\/$/) ); // filter out directories
  });
}

export function getManifestFile( fileName, isPrivate = false ) {

  const uri = `/api/manifests/${ isPrivate ? 'private' : 'public' }/${encodeURIComponent(fileName)}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  })
    .then( resp => resp.data );

}

export function generateLotManifest( lotId, save = true, bstock = false ) {

  if(!lotId) {
    throw new Error('Must supply lot ID.');
  }

  const uri = `/api/manifests/generate`;

  const body = {
    lotId: lotId,
    save: save,
    bstock: bstock
  };

  return axios({
    method: 'post',
    url: uri,
    data: body,
    responseType: save ? 'json' : 'stream'
  })
    .then( resp => resp.data );

}


/*************************************************
* Auctions
* =======
*
************/

export function listAuctions( query ) {

  return axios({
    method: 'post',
    url: '/api/bstock-db/auctions/get',
    data: query
  })
    .then(resp=>{
      const auctions = resp.data;
      return auctions;
    });

}

/*************************************************
* Reports
* =======
*
************/

// // startdate and endDate should be ISO 8601 strings
// export function unitsSoldReport( { startDate, endDate, tag, binSize } ) {
//   const qp = {};
//   if(startDate) {
//     qp.start_date = startDate;
//   }
//   if(endDate) {
//     qp.end_date = endDate;
//   }
//   if(tag) {
//     qp.tag = tag;
//   }
//   if(binSize) {
//     qp.bin_size = binSize;
//   }

//   const uri = `/api/reports/units-sold?${qs.stringify(qp)}`;

//   return axios.get(uri).then( resp => resp.data );
// }

// // startdate and endDate should be ISO 8601 strings
// export function palletsSoldReport( { startDate, endDate, tag, binSize } ) {
//   const qp = {};
//   if(startDate) {
//     qp.start_date = startDate;
//   }
//   if(endDate) {
//     qp.end_date = endDate;
//   }
//   if(tag) {
//     qp.tag = tag;
//   }
//   if(binSize) {
//     qp.bin_size = binSize;
//   }

//   const uri = `/api/reports/pallets-sold?${qs.stringify(qp)}`;

//   return axios.get(uri).then( resp => resp.data );
// }

/*************************************************
* Users
* =====
*
************/

export function createNewUser( newUserData ) {
  const uri = `/api/users/create`;

  return axios({
    method: 'post',
    url: uri,
    data: newUserData
  })
    .then( resp => resp.data );
}

export function countUsers( queryParams ) {
  const uri = `/api/users/count/?${ queryParams ? qs.stringify( queryParams ) : ''}`;

  return axios({
    method: 'get',
    url: uri,
  })
    .then( resp => resp.data );

}

export function listUsers( queryParams ) {
  const uri = `/api/users/?${ queryParams ? qs.stringify( queryParams ) : ''}`;

  return axios({
    method: 'get',
    url: uri,
  })
    .then( resp => resp.data );

}

export function editUserRoles( userId, _roles ) {
  const uri = `/api/users/${userId}/roles`;

  return axios({
    method: 'put',
    url: uri,
    data: { roles: _roles }
  })
    .then( resp => resp.data );
}

export function editUserDisabledStatus( userId, _isDisabled ) {
  const uri = `/api/users/${userId}/disabled`;

  return axios({
    method: 'put',
    url: uri,
    data: { isDisabled: _isDisabled }
  })
    .then( resp => resp.data );
}

export function logoutUser() {

  return axios({
    method: 'get',
    url: '/logout'
  })
    .then( resp => resp.data );

}

export function changeUserPassword( newPassword ) {

  const uri = `/api/users/change-password`;

  return axios({
    method: 'post',
    url: uri,
    data: { password: newPassword }
  })
    .then( resp => resp.data );

}

/*************************************************
* Receiving
* =========
*
************/

export function listIncomingShipments( qp ) {
  return axios({
    method: 'get',
    url: `/api/receiving/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data );
}
export function countIncomingShipments( qp ) {
  return axios({
    method: 'get',
    url: `/api/receiving/count/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data );
}
export function createIncomingShipment( shipment ) {
  return axios({
    method: 'post',
    url: `/api/receiving/`,
    data: shipment
  })
    .then( resp => resp.data );
}
export function getIncomingShipmentById( shipmentId, { populate = [], getPalletProceeds } = {} ) {

  const queryParams = getPopulateQueryParamsObject( populate );

  if( getPalletProceeds ) {
    queryParams.pallet_proceeds = 1;
  }

  return axios({
    method: 'get',
    url: `/api/receiving/${ shipmentId }?${ qs.stringify( queryParams ) }`,
  })
    .then( resp => resp.data );
}


export function getIncomingShipmentByHandle( handle, { populate = [] } = {} ) {

  const queryParams = getPopulateQueryParamsObject( populate );

  return axios({
    method: 'get',
    url: `/api/receiving/by-handle/${ handle }?${ qs.stringify( queryParams ) }`,
  })
    .then( resp => resp.data );
}


export function removeIncomingShipment( shipmentId ) {
  return axios({
    method: 'delete',
    url: `/api/receiving/${ shipmentId }`,
  })
    .then( resp => resp.data );
}

export function editIncomingShipment( shipmentId, _data ) {
  return axios({
    method: 'patch',
    url: `/api/receiving/${ shipmentId }`,
    data: _data
  })
    .then( resp => resp.data );
}

// Pallet modifying operations
export function addIncomingShipmentPallet( shipmentId, _pallet ) {
  return axios({
    method: 'post',
    url: `/api/receiving/${ shipmentId }/pallets`,
    data: _pallet
  })
    .then( resp => resp.data );
}
export function removeIncomingShipmentPallet( shipmentId, palletId ) {
  return axios({
    method: 'delete',
    url: `/api/receiving/${ shipmentId }/pallets/${ palletId }`,
  })
    .then( resp => resp.data );
}
export function editIncomingShipmentPallet( shipmentId, palletId, _data ) {
  return axios({
    method: 'patch',
    url: `/api/receiving/${ shipmentId }/pallets/${ palletId }`,
    data: _data
  })
    .then( resp => resp.data );
}


// Receiving shipments/pallets
export function receiveIncomingShipment( shipmentId ) {
  return axios({
    method: 'put',
    url: `/api/receiving/${ shipmentId }/is-received`,
    data: { isReceived: true }
  })
    .then( resp => resp.data );
}

export function unreceiveIncomingShipment( shipmentId ) {
  return axios({
    method: 'put',
    url: `/api/receiving/${ shipmentId }/is-received`,
    data: { isReceived: false }
  })
    .then( resp => resp.data );
}


export function receiveIncomingShipmentPallet( shipmentId, _data ) {
  return axios({
    method: 'post',
    url: `/api/receiving/${ shipmentId }/pallets-received`,
    data: _data
  })
    .then( resp => resp.data );
}

export function unreceiveIncomingShipmentPallet( shipmentId, palletId ) {
  return axios({
    method: 'delete',
    url: `/api/receiving/${ shipmentId }/pallets-received/${ palletId }`,
  })
    .then( resp => resp.data );
}


// Close/reopen shipments

export function closeIncomingShipment( shipmentId ){
  return axios({
    method: 'patch',
    url: `/api/receiving/${ shipmentId }/is-closed`,
    data: { isClosed: true }
  })
    .then( resp => resp.data );
}

export function reopenIncomingShipment( shipmentId ){
  return axios({
    method: 'patch',
    url: `/api/receiving/${ shipmentId }/is-closed`,
    data: { isClosed: false }
  })
    .then( resp => resp.data );
}

export function addIncomingShipmentPalletConsolidated( shipmentId, _data ) {
  return axios({
    method: 'post',
    url: `/api/receiving/${ shipmentId }/pallets-consolidated`,
    data: _data
  })
    .then( resp => resp.data );
}

export function removeIncomingShipmentPalletConsolidated( shipmentId, palletId ) {
  return axios({
    method: 'delete',
    url: `/api/receiving/${ shipmentId }/pallets-consolidated/${ palletId }`,
  })
    .then( resp => resp.data );
}

export function aggregateExpectedPallets( startDate, endDate ) {

  const queryParams = {
    start_date: startDate,
    end_date: endDate
  };

  return axios({
    method: 'get',
    url: `/api/inventory/expected-pallets?${ qs.stringify( queryParams ) }`,
  })
    .then( resp => resp.data && resp.data.pallets );
}

export function aggregateTransportationCosts( startDate, endDate, period ) {

  const queryParams = {
    start_date: startDate,
    end_date: endDate,
    period
  };

  return axios({
    method: 'get',
    url: `/api/receiving/transportation?${ qs.stringify( queryParams ) }`,
  })
    .then( resp => resp.data && resp.data.costs );
}

/*************************************************
* Documents
* =========
*
************/

export function listObjectDocuments( objectId, objectType ) {
  return axios({
    method: 'get',
    url: `/api/documents/${ objectId }?object_type=${ objectType }`,
  })
    .then( resp => resp.data );
}

export function getObjectDocument( objectId, objectType, documentName ) {
  return axios({
    method: 'get',
    url: `/api/documents/${ objectId }/${ documentName }?object_type=${ objectType }`,
    responseType: 'arraybuffer'
  })
    .then( resp => resp.data );
}

export function removeObjectDocument( objectId, objectType, documentName ) {
  return axios({
    method: 'delete',
    url: `/api/documents/${ objectId }/${ documentName }?object_type=${ objectType }`,
  })
    .then( resp => resp.data );
}

export function uploadObjectDocument( objectId, objectType, _document, { documentType, isRestricted }) {

  const fd = new FormData();
  fd.append('file', _document);
  fd.append('isRestricted', isRestricted);
  if( documentType ) {
    fd.append('documentType', documentType);
  }

  return axios({
    method: 'put',
    url: `/api/documents/${ objectId }/${ _document.name }?object_type=${ objectType }`,
    data: fd
  })
    .then( resp => resp.data );
}

export function updateObjectDocumentProperties( objectId, objectType, documentName, { documentType, isRestricted } ) {
  return axios({
    method: 'patch',
    url: `/api/documents/${ objectId }/${ documentName }?object_type=${ objectType }`,
    data: {
      isRestricted,
      documentType
    }
  })
    .then( resp => resp.data );
}


/*************************************************
* Pallets
* ======
*
************/

export function getInventoryPallet( palletId,  { populate = [] } = {} ) {

  const queryParams = getPopulateQueryParamsObject( populate );

  return axios({
    method: 'get',
    url: `/api/pallets/${ palletId }?${ qs.stringify( queryParams ) }`
  })
    .then( resp => resp.data );
}
export function listInventoryPallets( qp ) {
  return axios({
    method: 'get',
    url: `/api/pallets/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.pallets );
}
export function countInventoryPallets( qp ) {
  return axios({
    method: 'get',
    url: `/api/pallets/count/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.count );
}
export function createInventoryPallets( pallets ) {
  return axios({
    method: 'post',
    url: `/api/pallets/`,
    data: { pallets }
  })
    .then( resp => resp.data );
}
export function aggregateInventoryPallets( date ) {
  return axios({
    method: 'get',
    url: `/api/pallets/aggregate/${ date ? `?date=${date}` : '' }`,
  })
    .then( resp => resp.data.pallets );
}
export function editInventoryPallet( palletId, _data ) {
  return axios({
    method: 'patch',
    url: `/api/pallets/${ palletId }`,
    data: _data
  })
    .then( resp => resp.data );
}
export function breakdownInventoryPallet( palletId, isBrokendown = true ) {
  return axios({
    method: 'put',
    url: `/api/pallets/${ palletId }/is-brokendown`,
    data: { isBrokendown }
  })
    .then( resp => resp.data );
}
export function repackInventoryPallet( palletId, isRepacked = true ) {
  return axios({
    method: 'put',
    url: `/api/pallets/${ palletId }/is-repacked`,
    data: { isRepacked }
  })
    .then( resp => resp.data );
}
export function deleteInventoryPallet( palletId ) {
  return axios({
    method: 'delete',
    url: `/api/pallets/${ palletId }`
  })
    .then( resp => resp.data );
}




/*************************************************
* Events
* ======
*
************/

export function getIncomingShipmentEvents( shipmentId ) {
  return axios({
    method: 'get',
    url: `/api/events/shipment/${ shipmentId }?populate_user=1&populate_shipment=1`
  })
    .then( resp => resp.data );
}

/*************************************************
* Images
* =========
*
************/

export function cloneImages( lotId, images ) {
  return axios({
    method: 'post',
    url: `/api/image/clone`,
    data: {
      lotId,
      images
    }
  })
    .then( resp => resp.data );
}

export function addInventoryPalletImages( palletId, images ) {
  return axios({
    method: 'post',
    url: `/api/pallets/${ palletId }/images`,
    data: {
      images
    }
  })
    .then( resp => resp.data );
}

export function addLotImages( lotId, images ) {
  return axios({
    method: 'post',
    url: `/api/lots/${ lotId }/images`,
    data: {
      images
    }
  })
    .then( resp => resp.data );
}

export function removePalletImage( palletId, image ) {

  const req = {
    palletId,
    image
  };

  return axios({
    method: 'post',
    url: `/api/image/remove`,
    data: req
  })
    .then( resp => resp.data );
}

export function removePalletSplitGroupImage( palletId, splitGroupId, image ) {

  const req = {
    palletId,
    splitGroupId,
    image
  };

  return axios({
    method: 'post',
    url: `/api/image/remove`,
    data: req
  })
    .then( resp => resp.data );
}


/*************************************************
* Manual Inventory
* ================
*
************/


export function listManualInventory( qp ) {

  const queryParams = qp;

  queryParams.populate_user = 'populate_user' in qp ? qp.populate_user : 1;

  return axios({
    method: 'get',
    url: `/api/manual-inventory/?${qs.stringify(queryParams)}`
  })
    .then( resp => resp.data );
}

export function countManualInventory( qp ) {

  return axios({
    method: 'get',
    url: `/api/manual-inventory/count?${qs.stringify(qp)}`
  })
    .then( resp => resp.data );
}

export function getManualInventory( inventoryId, qp ) {

  const queryParams = qp;

  queryParams.populate_user = 'populate_user' in qp ? qp.populate_user : 1;

  return axios({
    method: 'get',
    url: `/api/manual-inventory/${inventoryId}?${qs.stringify(queryParams)}`
  })
    .then( resp => resp.data );
}

export function createManualInventory( inventory ) {

  return axios({
    method: 'post',
    url: `/api/manual-inventory/new`,
    data: inventory
  })
    .then( resp => resp.data );

}

export function deleteManualInventory( inventoryId ) {
  return axios({
    method: 'delete',
    url: `/api/manual-inventory/${ inventoryId }`,
  })
    .then( resp => resp.data );
}

export function editManualInventory( inventoryId, data ) {

  return axios({
    method: 'patch',
    url: `/api/manual-inventory/${ inventoryId }`,
    data: data
  })
    .then( resp => resp.data );

}

/*************************************************
* Listings
* ================
*
************/


export function submitLotListing( lotId, listingData, publish = false ) {

  const data = {
    lotId,
    listing: listingData,
    publish
  };

  return axios({
    method: 'post',
    url: `/api/listings`,
    data: data
  })
    .then( resp => resp.data );

}


export function listStoreShippingRates( qp ) {

  const queryParams = {
    include_pallets: qp.includePallets ? 1 : 0
  };

  return axios({
    method: 'get',
    url: `/api/listings/shipping/rates?${qs.stringify(queryParams)}`
  })
    .then( resp => resp.data.rates );
}

export function editStoreShippingRate( pvid /* REST or GQL version*/, rate ) {

  const data = {
    rates: [
      {
        id: pvid,
        rate
      }
    ]
  };

  return axios({
    method: 'post',
    url: `/api/listings/shipping/rates`,
    data: data
  })
    .then( resp => resp.data.rates[0] );

}

export function editStoreMultipleShippingRates( rates = [ /* { id, rate }: { product variant id (either REST or GQL version), number in dollars }  */] ) {

  return axios({
    method: 'post',
    url: `/api/listings/shipping/rates`,
    data: { rates }
  })
    .then( resp => resp.data.rates );

}

export function removeStoreShippingRate( productVariantGid ) {

  return axios({
    method: 'delete',
    url: `/api/listings/shipping/rates/${ encodeURIComponent( productVariantGid ) }`
  })
    .then( resp => resp.data );
}

export function getPalletBreakdownServiceRate() {

  return axios({
    method: 'get',
    url: `/api/listings/shipping/rates/pallet-breakdown-service`
  })
    .then( resp => resp.data );
}

export function setPalletBreakdownServiceRate( newRate ) {

  return axios({
    method: 'post',
    url: `/api/listings/shipping/rates/pallet-breakdown-service`,
    data: {
      rate: newRate
    }
  })
    .then( resp => resp.data );
}

export function listShippingConfigurations( { everydayBargainsOnly, includePallets } = {} ) {

  const queryParams = {};

  if( typeof everydayBargainsOnly !== 'undefined' ) {
    queryParams.everyday_bargains_only = everydayBargainsOnly ? 1 : 0;
  }

  if( typeof includePallets !== 'undefined' ) {
    queryParams.include_pallets = includePallets ? 1 : 0;
  }

  return axios({
    method: 'get',
    url: `/api/listings/shipping/configurations?${ qs.stringify( queryParams ) }`
  })
    .then( resp => resp.data );

}

export function getShippingConfiguration( gid ) {

  return axios({
    method: 'get',
    url: `/api/listings/shipping/configurations/${ encodeURIComponent(gid)  }`
  })
    .then( resp => resp.data );

}

export function setShippingConfiguration( gid, shippingConfiguration ) {

  return axios({
    method: 'post',
    url: `/api/listings/shipping/configurations/${ encodeURIComponent(gid) }`,
    data: {
      shippingConfiguration
    }
  })
    .then( resp => resp.data );

}

export function listActiveProducts( { everydayBargainsOnly = false } = {} ) {

  const queryParams = {
    everyday_bargains_only: everydayBargainsOnly ? 1 : 0
  };

  return axios({
    method: 'get',
    url: `/api/listings/products?${qs.stringify( queryParams )}`
  })
    .then( resp => resp.data );

}

export function listActiveProductVariants( { everydayBargainsOnly = false } = {} ) {

  const queryParams = {
    everyday_bargains_only: everydayBargainsOnly ? 1 : 0
  };

  return axios({
    method: 'get',
    url: `/api/listings/product-variants?${qs.stringify( queryParams )}`
  })
    .then( resp => resp.data );

}

export function getProductVariant( id ) {
  return axios({
    method: 'get',
    url: `/api/listings/product-variants/${ encodeURIComponent(id) }`
  })
    .then( resp => resp.data );
}

export function listProductBundles() {

  return axios({
    method: 'get',
    url: `/api/listings/bundles`
  })
    .then( resp => resp.data );

}

export function getProductBundle( gid ) {

  return axios({
    method: 'get',
    url: `/api/listings/bundles/${ encodeURIComponent(gid)  }`
  })
    .then( resp => resp.data );

}

export function setProductBundle( gid, bundle ) {

  return axios({
    method: 'post',
    url: `/api/listings/bundles/${ encodeURIComponent(gid) }`,
    data: {
      bundle
    }
  })
    .then( resp => resp.data );

}


/*************************************************
* Counters
* ================
*
************/

export function getCounter( handle ) {

  return axios({
    method: 'get',
    url: `/api/counters/${ handle }`
  })
    .then( resp => resp.data.counter );

}

export function incrementCounter( handle, increment ) {

  return axios({
    method: 'post',
    url: `/api/counters/${ handle }`,
    data: {
      increment
    }
  })
    .then( resp => resp.data.counter );

}


/*************************************************
* Store Content Management
* ================
*
************/

export function getStoreContentSchema() {

  return axios({
    method: 'get',
    url: `/api/content/schema`
  })
    .then( resp => resp.data );

}

export function getStoreContent( gid, queryParams ) {

  return axios({
    method: 'get',
    url: `/api/content/${ encodeURIComponent(gid) }?${ queryParams ? qs.stringify( queryParams ) : ''}`
  })
    .then( resp => resp.data );

}

export function listStoreContent( queryParams ) {

  return axios({
    method: 'get',
    url: `/api/content/?${ queryParams ? qs.stringify( queryParams ) : ''}`
  })
    .then( resp => resp.data );

}

export function editStoreContent( content, queryParams ) {

  return axios({
    method: 'post',
    url: `/api/content?${ queryParams ? qs.stringify( queryParams ) : ''}`,
    data: { content }
  })
    .then( resp => resp.data.metafields[0] );

}

export function deleteStoreContent( gid, queryParams ) {

  return axios({
    method: 'delete',
    url: `/api/content/${ encodeURIComponent(gid) }?${ queryParams ? qs.stringify( queryParams ) : ''}`
  })
    .then( resp => resp.data );

}

/*************************************************
* Orders
* ======
*
************/

export function getOrder( orderId ) {

  return axios({
    method: 'get',
    url: `/api/orders/${ orderId }`
  })
    .then( resp => resp.data.order );
}
export function listOrders( qp ) {
  return axios({
    method: 'get',
    url: `/api/orders/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.orders );
}
export function countOrders( qp ) {
  return axios({
    method: 'get',
    url: `/api/orders/count/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.count );
}


/*************************************************
* Product Data
* ============
*
************/

export function getProductDataByBarcode( barcode ) {

  return axios({
    method: 'get',
    url: `/api/product-data/${ barcode }`
  })
    .then( resp => resp.data );
}
export function queueProductDataFetching( barcodes ) {
  return axios({
    method: 'post',
    url: `/api/product-data/queue`,
    data: { barcodes }
  })
    .then( resp => resp.data );
}
export function bulkGetProductData( barcodes ) {
  return axios({
    method: 'post',
    url: `/api/product-data/bulk-get`,
    data: { barcodes }
  })
    .then( resp => resp.data );
}


/*************************************************
* Packages
* ======
*
************/

export function getPackage( pkgId ) {

  return axios({
    method: 'get',
    url: `/api/packages/${ pkgId }`
  })
    .then( resp => resp.data.package );
}
export function listPackages( qp ) {
  return axios({
    method: 'get',
    url: `/api/packages/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.packages );
}
export function countPackages( qp ) {
  return axios({
    method: 'get',
    url: `/api/packages/count/?${qs.stringify(qp)}`,
  })
    .then( resp => resp.data.count );
}

export function createPackages( pkgs, instantiate = false ) {
  return axios({
    method: 'post',
    url: `/api/packages/`,
    data: {
      packages: pkgs,
      instantiate
    }
  })
    .then( resp => resp.data );
}

export function removePackage( pkgId ) {
  return axios({
    method: 'delete',
    url: `/api/packages/${ pkgId }`,
  })
    .then( resp => resp.data );
}

export function editPackage( pkgId, _data ) {
  return axios({
    method: 'patch',
    url: `/api/packages/${ pkgId }`,
    data: _data
  })
    .then( resp => resp.data );
}

export function instantiatePackage( pkgId ) {
  return axios({
    method: 'put',
    url: `/api/packages/${ pkgId }/is-instantiated`,
    data: { isInstantiated: true }
  })
    .then( resp => resp.data );
}


/*************************************************
* Print & Labels
* ==============
*
************/


export function getLabelsforPackageList( packageIds ) {
  return axios({
    method: 'post',
    url: `/api/print/labels/packages/`,
    data: { packageIds },
    responseType: 'blob'
  })
    .then( resp => resp.data );
}
