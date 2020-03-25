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

export function listManifests() {
  const qp = {
    num: 25
  };

  const uri = `/api/manifests/list?${querystring.stringify(qp)}`;

  return axios.get(uri).then( resp => resp.data );
}

export function getManifest( fileName, isPrivate = false ) {
  const qp = {
    file: fileName,
    private: isPrivate ? 1 : 0
  };

  const uri = `/api/manifests/get?${querystring.stringify(qp)}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  })
    .then( resp => resp.data );

}