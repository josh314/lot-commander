const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  build: build,
  get: get,
  list: list,
  put: put,
  deleteGoogleSpreadsheet,
  exportToGoogle,
  getGoogleSpreadsheet,
};

function build( sheets, saveAs = '', isPublic = false) {

  const data = {
    sheets: sheets,
  };

  if(saveAs) {
    data.s3 = {
      key: saveAs,
      public: isPublic
    };
  }

  return axios({
    method: 'post',
    url: `${getUrl( '/build' )}`,
    data: data,
    responseType: saveAs ? 'json' : 'stream',
    timeout: 10*1000
  });

}

function get(key) {

  const uri = `${getUrl( `/manifests/${key}` )}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  });

}

function put( readStream, key, isPublic = false ) {

  const uri = `${getUrl( '/manifests' )}/${ isPublic ? 'public/' : '/'}${key}`;

  return axios({
    method: 'put',
    url: encodeURI(uri),
    data: readStream,
    timeout: 10*1000
  });

}

function list( queryParams = {} ) {

  const qs = querystring.stringify(queryParams);

  const uri = `${getUrl( '/manifests' )}${ qs ? '?' + qs : ''}`;

  return axios({
    method: 'get',
    url: uri
  })
    .then(resp => resp.data )
    .then( data => {
      return {
        baseUrl: `https://${data.Name}.s3.amazonaws.com/`,
        continuationToken: data.NextContinuationToken,
        manifests: data.Contents.map( item => ({
          name: item.Key,
          size: item.Size,
          lastModified: item.LastModified
        })
        )
      };
    });
}

/*************** Google sheets functionality ***************************/

function exportToGoogle( key, title, customerEmail, purchasePrice ) {

  const uri = `${getUrl( '/google/' )}${ key }`;

  return axios({
    method: 'post',
    url: uri,
    data: {
      title,
      customerEmail,
      purchasePrice
    }
  })
    .then( resp => resp.data );

}

// TODO: with range info

function getGoogleSpreadsheet( spreadsheetId, nameRangesOnly ) {

  const uri = `${getUrl( '/google/' )}${ spreadsheetId }?${ nameRangesOnly ? 'named_ranges_only=1' : '' }`;

  return axios({
    method: 'get',
    url: uri
  })
    .then( resp => resp.data );

}


function deleteGoogleSpreadsheet( spreadsheetId ) {

  const uri = `${getUrl( '/google/' )}${ spreadsheetId }`;

  return axios({
    method: 'delete',
    url: uri
  })
    .then( resp => resp.data );

}
