const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  get: get,
  list: list,
  put: put
};

function get(key) {

  const uri = `${getUrl( '/get' )}?${querystring.stringify( { key: key } )}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  });

}

function put( readStream, key, isPublic = false ) {

  const uri = `${getUrl( '/put' )}/${ isPublic ? 'public/' : '/'}${key}`;

  return axios({
    method: 'post',
    url: encodeURI(uri),
    data: readStream,
    timeout: 10*1000
  });

}

function list( queryParams = {} ) {

  const qs = querystring.stringify(queryParams);

  const uri = `${getUrl( '/list' )}${ qs ? '?' + qs : ''}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream',
  });
}

function build( readStream, sheets, name) {

}