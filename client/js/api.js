import qs from 'querystring';
import axios from 'axios';


/*************************************************
* Lot-db and Manifest-db
* ======================
*
************/

export function listLots( query ) {

  return axios({
    method: 'post',
    url: '/api/db/get',
    data: query
  })
    .then(resp=>{
      const lots = resp.data;
      return lots;
    });

}

export function getLotByHandle( handle ) {

  return axios({
    method: 'post',
    url: '/api/db/get-by-handle',
    data: { handle: handle }
  })
    .then(resp=>{
      const lot = resp.data;
      return lot;
    });

}

export function getLot( lotId ) {

  return axios({
    method: 'get',
    url: `/api/db/get/${ lotId }`
  })
    .then(resp=>{
      const lot = resp.data;
      return lot;
    });

}

export function getManifest( manifestId ) {

  return axios({
    method: 'get',
    url: `/api/db/manifest/${ manifestId }`
  })
    .then(resp=>{
      return resp.data.manifest;
    });

}

export function import3rdPartyManifestBlock( { lot, blockId } ) {

  return axios({
    method: 'post',
    url: `/api/db/import-3p-manifest-block`,
    data: { lot, blockId }
  })
    .then(resp=>{
      return resp.data;
    });

}

export function createLot( data ) {

  return axios({
    method: 'post',
    url: `/api/db/new-lot`,
    data: data
  })
    .then(resp=>{
      return resp.data;
    });

}

export function deleteLot( lotId ) {

  return axios({
    method: 'post',
    url: `/api/db/delete-lot`,
    data: { lotId }
  })
    .then(resp=>{
      return resp.data;
    });

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
* Reports
* =======
*
************/

// startdate and endDate should be ISO 8601 strings
export function unitsSoldReport( { startDate, endDate, tag, binSize } ) {
  const qp = {};
  if(startDate) {
    qp.start_date = startDate;
  }
  if(endDate) {
    qp.end_date = endDate;
  }
  if(tag) {
    qp.tag = tag;
  }
  if(binSize) {
    qp.bin_size = binSize;
  }

  const uri = `/api/reports/units-sold?${qs.stringify(qp)}`;

  return axios.get(uri).then( resp => resp.data );
}

// startdate and endDate should be ISO 8601 strings
export function palletsSoldReport( { startDate, endDate, tag, binSize } ) {
  const qp = {};
  if(startDate) {
    qp.start_date = startDate;
  }
  if(endDate) {
    qp.end_date = endDate;
  }
  if(tag) {
    qp.tag = tag;
  }
  if(binSize) {
    qp.bin_size = binSize;
  }

  const uri = `/api/reports/pallets-sold?${qs.stringify(qp)}`;

  return axios.get(uri).then( resp => resp.data );
}

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
export function getIncomingShipmentById( shipmentId, { populate = [] } = {} ) {

  let populateStr;
  if( populate && populate.length ) {

    populateStr = '?' + populate.map( s => `populate_${s}=1` ).join('&');

  }

  return axios({
    method: 'get',
    url: `/api/receiving/${ shipmentId }${ populateStr || '' }`,
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

// Incoming Shipment documents
export function listIncomingShipmentDocuments( shipmentId ) {
  return axios({
    method: 'get',
    url: `/api/receiving/${ shipmentId }/documents`,
  })
    .then( resp => resp.data );
}

export function getIncomingShipmentDocument( shipmentId, documentName ) {
  return axios({
    method: 'get',
    url: `/api/receiving/${ shipmentId }/documents/${ documentName }`,
    responseType: 'stream'
  })
    .then( resp => resp.data );
}

export function removeIncomingShipmentDocument( shipmentId, documentName ) {
  return axios({
    method: 'delete',
    url: `/api/receiving/${ shipmentId }/documents/${ documentName }`,
  })
    .then( resp => resp.data );
}

export function uploadIncomingShipmentDocument( shipmentId, _document, isRestricted ) {

  const fd = new FormData();
  fd.append('file', _document);
  fd.append('isRestricted', isRestricted);

  return axios({
    method: 'put',
    url: `/api/receiving/${ shipmentId }/documents/${ _document.name }`,
    data: fd
  })
    .then( resp => resp.data );
}

export function updateIncomingShipmentDocumentRestrictionStatus( shipmentId, documentName, isRestricted ) {
  return axios({
    method: 'patch',
    url: `/api/receiving/${ shipmentId }/documents/${ documentName }`,
    data: {
      isRestricted: isRestricted
    }
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

export function editReceivedPallet( palletId, _data ) {
  return axios({
    method: 'patch',
    url: `/api/pallets/${ palletId }`,
    data: _data
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