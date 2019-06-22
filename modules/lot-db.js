const path = require('path');

const Promise = require('bluebird');
const moment = require('moment');

const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));
// const inmarDb = require(path.join(__basedir, __config.modulesPath, 'inmar-db'));

const libLotDb = require('lot-db/lotdb');


const lotdbClient = new libLotDb.Client({ connection: __connections.lots }); 

function getLotById(lotId) {
  return lotdbClient.getLotById(lotId);
}

function getLotByIdApi(req, res) {
  getLotById(req.params.lotId).then(resp=>{
    res.json(resp);
  });
}

function getLots(req, res) {
  //todo: start and end dates, other search filters, sort options
  __logger.info('Lot list requested.');
  const opts = {
    sort: { createdAt: -1 },
    limit: 100,
  };
  const query = {};
  if(req.body.startDate) {
    query.createdAt = req.body.createdAt || {};
    query.createdAt.$gte = moment(req.body.startDate).startOf('day').toDate();
  }
  if(req.body.endDate) {
    query.createdAt = req.body.createdAt || {};
    query.createdAt.$lte = moment(req.body.endDate).endOf('day').toDate();
  }
  if(req.body.status) {
    query.status = req.body.status;
  }
  if(req.body.handle) {
    let regExpStr = ';';
    if(req.body.handle.prefix) {
      regExpStr = '^'+req.body.handle.value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    else {
      regExpStr = req.body.handle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    query.handle = new RegExp(regExpStr, 'i');
  }
  lotdbClient.getLots(query, opts).then(resp=>{
    res.json(resp);
  });
}

function newLot(req, res) {
  const newLot = req.body;
  __logger.info(`Submitting new lot with data ${JSON.stringify(newLot)}.`);
  newLot.listings = [{ platform: 'bstock', body: ''}];
  lotdbClient.getLots({handle: newLot.handle}).then(resp=>{
    if(!resp || !resp[0]) {
      lotdbClient.submitNewLot(newLot).then(resp=>{
        res.json(resp);
      });
    }
    else {
      res.json({lotExists: true});
    }
  });
}

function editLotMetadata(req, res) {
  const lotData = req.body;
  lotData._id = req.params.lotId;
  lotdbClient.updateLot(lotData).then(resp=>{
    res.json(resp);
  });
}

function saveManifest(req, res) {
  // save inventoy to manifest db
  // if successful, update lot db
  const lot = req.body.lot;
  const manifest = {
    _id: lot.manifestId,
    handle: lot.handle,
    inventory: lot.inventory,
  };
  mandb.submitManifest(manifest)
    .then(mandbResp=>{
      if(mandbResp) {
        const lotUpdate = {
          _id: lot._id,
          // totalUnits: lot.inventory.reduce( (sum, item) => { return sum + item.quantity; }, 0),
          totalUnits: lot.totalUnits ? lot.totalUnits : 0,
          manifestId: mandbResp._id,
        };
        return Promise.join(mandbResp, lotdbClient.updateLot(lotUpdate));
      }
    })
    .then(resp=>{
      res.json(resp);
    });
}

function getManifest(req, res) {
  mandb.getManifestById(req.params.manifestId).then(resp=>{
    res.json({ manifest: resp });
  });
}

function setPrimaryImage(req, res) {
  lotdbClient.setPrimaryImage(req.body.lotId, req.body.primaryImage).then(resp=>{
    if(resp.error) {
      __logger.error(resp.error);
      res.json({error: 'server error.'});
    }
    else {
      res.json(resp);
    }
  });
}

function addImage(lotId, imageMetadata) {
  return lotdbClient.addImage(lotId, imageMetadata);
}

function removeImage(lotId, image) {
  return lotdbClient.removeImage(lotId, image);
}

// function link3pManifestBlock(req, res, next){
//   const blockId = req.body.blockId;
//   inmarDb.getManifestByBlockId(blockId).then(manifest=>{
//     if(!manifest) {
//       const msg = 'Block Id not found.';
//       const e = new Error(msg);
//       e.clientMessage = msg;
//       next(e);
//     }
//     else {
//       const block = manifest.blocks.find(b => b.blockId===blockId);
//       const totalUnits = block.contents.reduce((units, item) => units + item.quantity, 0);
//       const linkManifestData = { dbId: manifest._id, blockId: blockId, totalUnits };
//       lotdbClient.add3pManifest(req.body.lotId, linkManifestData).then(resp=>{
//         res.json(resp);
//       });
//     }
//   });
// }

// function import3pManifestBlock(req, res, next){
//   const blockId = req.body.blockId;
//   inmarDb.getManifestByBlockId(blockId).then(thirdPartyManifest=>{
//     if(!thirdPartyManifest) {
//       const msg = 'Block Id not found.';
//       const e = new Error(msg);
//       e.clientMessage = msg;
//       next(e);
//     }
//     else {
//       const lot = req.body.lot;
//       const block = thirdPartyManifest.blocks.find(b => b.blockId===blockId);

//       mandb.submitManifest({
//         handle: lot.handle,
//         inventory: block.contents,
//       })
//         .then(mandbResp=>{
//           if(mandbResp) {
//             const lotUpdate = {
//               _id: lot._id,
//               totalUnits: block.contents.reduce((units, item) => units + item.quantity, 0),
//               manifestId: mandbResp._id,
//             };
//             return Promise.join(mandbResp, lotdbClient.updateLot(lotUpdate));
//           }
//         })
//         .then(resp=>{
//           res.json(resp);
//         });
//     }
//   });
// }

function markAsListed(lotId) {
  const data = {
    _id: lotId,
    status: 'Listed'
  };
  return lotdbClient.updateLot(data);
}

async function deleteLot(req,res) {
  const lotId = req.body.lotId;
  try {
    await lotdbClient.deleteLot(lotId);
    await imageServer.deleteLotBucket(lotId);
    res.json({ success: true });
  }
  catch (e) {
    throw new Error(e);
  }
}

function updateLot(lot) {
  return lotdbClient.updateLot(lot);
}

module.exports = {
  //middleware
  getLotByIdApi: getLotByIdApi,
  getLots: getLots,
  newLot: newLot,
  editLotMetadata: editLotMetadata,
  saveManifest: saveManifest,
  getManifest: getManifest,
  setPrimaryImage: setPrimaryImage,
  deleteLot: deleteLot,
  // other functionality
  getLotById: getLotById,
  addImage: addImage,
  removeImage: removeImage,
  lotStatusEnum: lotdbClient.LotModel.statusEnum,
  lotTypeEnum: lotdbClient.LotModel.typeEnum,
  marketplaceEnum: lotdbClient.LotModel.marketplaceEnum,
  // link3pManifestBlock: link3pManifestBlock,
  // import3pManifestBlock: import3pManifestBlock,
  markAsListed: markAsListed,
  updateLot: updateLot,
};