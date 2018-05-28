const path = require('path');

const db = require(path.join(__config.libDir.bstock, 'bstock-db'));
const client = new db.Client({ db: __config.db.bstockdb, logger: __logger});


function getAuctions(req, res, next) {
  const findQuery = {
    auction_status: req.body.auction_status,
  };
  const sortOpts = {
    auction_end_time: -1,
  }; 

  client.getAuctions(findQuery, { sort: sortOpts }).then(resp=>{
    res.json(resp);
  })
}

module.exports = {
  getAuctions: getAuctions,
};