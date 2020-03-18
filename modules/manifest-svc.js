const querystring = require('querystring');

const axios = require('axios');

const getUrl = path => `http://${__config.services.manifests}${path}`;

module.exports = {
  get: get
};

function get( req, res ) {

  const file = `${ req.query.internal ? 'internal' : 'public' }/${req.query.file}`;

  const uri = `${getUrl( '/get' )}?${querystring.stringify( { key: file } )}`;

  axios({
    method: 'get',
    url: uri,
    responseType: 'stream'
  })
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