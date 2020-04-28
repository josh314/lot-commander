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
* Orders
*
************/

export function getOrders(page) {

  const query = {
    page: page,
  };

  return axios({
    method: 'post',
    url: '/api/orders/list',
    data: query
  })
    .then( resp => resp.data );

}

export function getOrderById(orderId) {

  return axios.get(`/api/orders/details/${orderId}`).then( resp => resp.data );

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