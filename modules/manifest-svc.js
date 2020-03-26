const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  build: build,
  get: get,
  list: list,
  put: put,
};

function build( sheets, saveAs = '', isPublic = false) {

  const data = {
    sheets: sheets,
  };

  if(saveAs) {
    data.s3 = {
      key: saveAs,
      public: isPublic
    }
  }

  return axios({
    method: 'post',
    url: `${getUrl( '/build' )}`,
    data: data,
    responseType: 'stream',
    timeout: 10*1000
  });

}

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
      }
    });
}
