const path = require('path');

const db = require(path.join(__config.libDir.bstock, 'bstock-db'));
const client = new db.Client({ db: __config.db.bstockdb, logger: __logger});


function getAuctions(req, res) {
  const findQuery = {};
  if(req.body.auction_status) {
    findQuery.auction_status = req.body.auction_status;
  }
  if(req.body.lot_id) {
    findQuery.lot_id = new RegExp(req.body.lot_id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  }
  const sortOpts = {
    auction_end_time: -1,
  }; 

  client.getAuctions(findQuery, { sort: sortOpts, limit: 50 }).then(resp=>{
    res.json(resp);
  });
}

module.exports = {
  getAuctions: getAuctions,
};