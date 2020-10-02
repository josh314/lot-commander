import querystring from 'querystring';
import axios from 'axios';

export function getLotByHandle(handle) {

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

/*************************************************
* Fulfillment
*
************/

export function getFulfillmentOrders(page) {

  return axios({
    method: 'get',
    url: `/api/fulfillment/list/${page}`,
  })
    .then( resp => resp.data );

}

export function getFulfillmentOrderById(orderId) {

  return axios.get(`/api/fulfillment/details/${orderId}`).then( resp => resp.data );

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

  const uri = `/api/manifests/?${querystring.stringify(qp)}`;

  return axios.get(uri).then( resp => {
    const manifests = resp.data.manifests;
    return manifests.filter( x => !x.name.match(/\/$/) ); // filter out directories
  });
}

export function getManifest( fileName, isPrivate = false ) {

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

  const uri = `/api/reports/units-sold?${querystring.stringify(qp)}`;

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

  const uri = `/api/reports/pallets-sold?${querystring.stringify(qp)}`;

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
  const uri = `/api/users/count/?${ queryParams ? querystring.stringify( queryParams ) : ''}`;

  return axios({
    method: 'get',
    url: uri,
  })
    .then( resp => resp.data );

}

export function listUsers( queryParams ) {
  const uri = `/api/users/?${ queryParams ? querystring.stringify( queryParams ) : ''}`;

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


/*************************************************
* Receiving
* =========
*
************/

export function listIncomingShipments( qp ) {
  return axios({
    method: 'get',
    url: `/api/receiving/?${querystring.stringify(qp)}`,
  })
    .then( resp => resp.data );
}
export function countIncomingShipments() {
  return axios({
    method: 'get',
    url: `/api/receiving/count`,
  })
    .then( resp => resp.data );
}
export function createIncomingShipment( shipment ) {
  return axios({
    method: 'post',
    url: `/api/receiving/create`,
    data: shipment 
  })
    .then( resp => resp.data );
}
export function getIncomingShipmentById( shipmentId ) {
  return axios({
    method: 'get',
    url: `/api/receiving/${ shipmentId }`,
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

export function uploadIncomingShipmentDocument( shipmentId, _document ) {

  const fd = new FormData();
  fd.append('file', _document);

  return axios({
    method: 'put',
    url: `/api/receiving/${ shipmentId }/documents/${ _document.name }`,
    data: fd
  })
    .then( resp => resp.data );
}

// Receiving shipments/pallets
export function receiveIncomingShipment( shipmentId ) {
  return axios({
    method: 'put',
    url: `/api/receiving/${ shipmentId }/is-received`,
  })
    .then( resp => resp.data );
}
