const path = require('path');
const fs = require('fs');

const Promise = require('bluebird');
const moment = require('moment');

const unlink = Promise.promisify(fs.unlink);

const formidable = require('formidable');

const imageServer = require(path.join(__basedir, __config.modulesPath, 'image-server'));
const manifestSvc = require(path.join(__basedir, __config.modulesPath, 'manifest-svc'));

const mandb = require(path.join(__basedir, __config.modulesPath, 'manifest-db'));

const libLotDb = require('lot-db');

const lotdbClient = new libLotDb.Client({ connection: __mongooseConnection }); 

function getLotById(lotId) {
  return lotdbClient.getLotById(lotId);
}

function getLotByIdApi(req, res) {
  getLotById(req.params.lotId).then(resp=>{
    res.json(resp);
  });
}

function getLotByHandle(handle) {
  return lotdbClient.getLotByHandle(handle);
}

async function getLotByHandleApi(req, res) {
  const handle = req.body.handle;
  let response;
  if(handle) {
    const lot = await getLotByHandle(handle);
    response = lot;
  }
  else {
    response = { error: 'No lot handle submitted.' };
  }
  res.json(response);
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
    await imageServer.deleteLotImages(lotId);
    res.json({ success: true });
  }
  catch (e) {
    throw new Error(e);
  }
}

function updateLot(lot) {
  return lotdbClient.updateLot(lot);
}

function uploadManifest(req, res, next) {
  const lotId = req.params.lotId;
  const form = new formidable.IncomingForm();
  form.parse(req, async function (err, fields, files) {
    try {
      const fileUploads = [];
      for(let [_, f] of Object.entries(files)){
        const readStream = fs.createReadStream(f.path);

        const lot = await getLotById(lotId);

        const s3Key = `${ lotId }/${ lot.handle }${ path.extname(f.name)  }`;

        const storePromise = manifestSvc.put( readStream, s3Key , true).then(resp=>{
          console.log("Here's where you'd update the lot...");
          if(resp && resp.data) {
            return updateLot({
              _id: lotId,
              manifestFileLocation: resp.data.Location
            });
          }
        })
          .then(_=>{
            console.log(`Unlinking temp file ${f.path}`);
            unlink(f.path);
            return _;
          });
        fileUploads.push(storePromise);
      }
      res.json(Promise.all(fileUploads));
    }
    catch (e) {
      next(e);
    }
  });
}


module.exports = {
  //middleware
  getLotByIdApi: getLotByIdApi,
  getLotByHandleApi: getLotByHandleApi,
  getLots: getLots,
  newLot: newLot,
  editLotMetadata: editLotMetadata,
  saveManifest: saveManifest,
  getManifest: getManifest,
  setPrimaryImage: setPrimaryImage,
  deleteLot: deleteLot,
  uploadManifest: uploadManifest,
  // other functionality
  getLotById: getLotById,
  getLotByHandle: getLotByHandle,
  addImage: addImage,
  removeImage: removeImage,
  lotStatusEnum: lotdbClient.LotModel.statusEnum,
  lotTypeEnum: lotdbClient.LotModel.typeEnum,
  marketplaceEnum: lotdbClient.LotModel.marketplaceEnum,
  packagingTypeEnum: lotdbClient.LotModel.packagingTypeEnum,
  weightUnitsEnum: lotdbClient.LotModel.weightUnitsEnum,
  lengthUnitsEnum: lotdbClient.LotModel.lengthUnitsEnum,
  markAsListed: markAsListed,
  updateLot: updateLot,
};