const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  api: {
    get: get,
    put: put
  }
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
  console.log(key)
  const uri = `${getUrl( '/put' )}/${ isPublic ? 'public/' : '/'}${key}`;

  axios({
    method: 'post',
    url: uri,
    data: readStream
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
