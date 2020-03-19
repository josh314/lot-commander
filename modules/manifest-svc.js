const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  api: {
    get: get,
  },
  putToSvc: putToSvc
};

function getFromSvc(key) {

  const uri = `${getUrl( '/get' )}?${querystring.stringify( { key: key } )}`;

  return axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  });

}

function putToSvc( readStream, key, isPublic = false ) {

  const uri = `${getUrl( '/put' )}/${ isPublic ? 'public/' : '/'}${key}`;

  return axios({
    method: 'post',
    url: encodeURI(uri),
    data: readStream,
    timeout: 10*1000
  });

}

function get( req, res ) {

  const file = `${ req.query.internal ? 'internal' : 'public' }/${req.query.file}`;

  getFromSvc(file)
    .then( resp => {
      if( resp.data.error === 'NoSuchKey') {
        res.json({
          status: "failed",
          message: `File does not exist: ${file}`
        })
      }
      else {
        console.log('Streaming response...')
        resp.data.pipe(res);
      }
    })
    .catch(e => {
      console.log(e)
      res.json({
        "status": "failed",
        "message": `Unable to get object: '${file}'`
      });
    });
}
