const express = require('express');

const auth = require('../auth');
const documentSvc = require('../modules/document-svc');

const fs = require('fs');
const formidable = require('formidable');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const filterParamsFromQueryParams = ( qp ) => {

  const fp = {};

  if( qp.handle ) {
    fp.handle = new RegExp( qp.handle, 'i');
  }

  if( qp.vendor ) {
    fp.vendor = new RegExp( qp.vendor, 'i');
  }

  if( 'received' in qp ) {
    fp.isReceived = !!parseInt( qp.received );
  }

  if( 'problem' in qp ) {
    fp.hasProblem = !!parseInt( qp.problem );
  }

  return fp;
};

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ inventoryDb }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    listIncomingShipments
  );
  router.get(
    '/count',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    countIncomingShipments
  );
  router.post(
    '/create',
    auth.isAuthorized( 'CREATE_INCOMING_SHIPMENT' ),
    createIncomingShipment
  );
  router.get(
    '/:shipmentId',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentById
  );
  router.patch(
    '/:shipmentId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    editIncomingShipment
  );
  router.delete(
    '/:shipmentId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    removeIncomingShipment
  );

  // Pallet modifying operations
  router.post(
    '/:shipmentId/pallets',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    addIncomingShipmentPallet
  );
  router.delete(
    '/:shipmentId/pallets/:palletId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    removeIncomingShipmentPallet
  );
  router.patch(
    '/:shipmentId/pallets/:palletId',
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    editIncomingShipmentPallet
  );

  // Incoming Shipment documents
  router.get(
    '/:shipmentId/documents',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    listIncomingShipmentDocuments
  );
  router.get(
    '/:shipmentId/documents/:documentName', 
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentDocument
  );
  router.delete(
    '/:shipmentId/documents/:documentName', 
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    removeIncomingShipmentDocument
  );
  router.put(
    '/:shipmentId/documents/:documentName', 
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    uploadIncomingShipmentDocument
  );

  // Receiving shipments/pallets
  router.put(
    '/:shipmentId/is-received', 
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    receiveIncomingShipment
  );
  router.post(
    '/:shipmentId/pallets-received', 
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    receiveIncomingShipmentPallet
  );
  router.delete(
    '/:shipmentId/pallets-received/:palletId',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    removeIncomingShipmentPalletReceived
  );
  router.patch(
    '/:shipmentId/pallets-received/:palletId',
    auth.isAuthorized( 'RECEIVE_INCOMING_SHIPMENT' ),
    editIncomingShipmentPalletReceived
  );
  
  //TODO: unreceivePallet endpoint
  
  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function listIncomingShipments( req, res ) {

    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const query = {
      // paging
      skip: ( page - 1 ) * numPage,
      num: numPage,

      // sorting
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),

      // filters
      filterParams: filterParamsFromQueryParams( req.query ),
    };

    const shipments = await inventoryDb.listIncomingShipments(query);

    res.json( { shipments } );
  };

  async function countIncomingShipments( req, res ) {
  
    const count = await inventoryDb.countIncomingShipments( filterParamsFromQueryParams( req.query ) );

    res.json({ count: count });
    
  }

  async function createIncomingShipment( req, res ) {

    const data = Object.assign(
      {},
      req.body
    );

    data.palletsExpected = data.pallets;
    delete data.pallets;

    if( req.body.arrivalDate ) {
      data.arrivalDateExpected = new Date( req.body.arrivalDate );
      delete data.arrivalDate;
    }

    const shipment = await inventoryDb.createIncomingShipment( data );

    res.json( { shipment } );

  }

  async function getIncomingShipmentById( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      res.json( { shipment } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  };

  async function editIncomingShipment( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.edit( req.body );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }

  }

  async function removeIncomingShipment( req, res ) {
    const result = await inventoryDb.removeIncomingShipment( req.params.shipmentId );
    res.json( result )
  }

  //==========================
  // Expected Pallets modifying handlers

  async function addIncomingShipmentPallet( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.addPalletExpected( req.body );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  }

  async function removeIncomingShipmentPallet( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.removePalletExpected( req.params.palletId );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  }

  async function editIncomingShipmentPallet( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.editPalletExpected( req.params.palletId, req.body );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  }

  //==================
  // document handlers

  async function listIncomingShipmentDocuments( req, res ) {

    const opts = {
      folder: documentSvc.folder('incoming-shipment')(req.params.shipmentId),
      num: req.query.num ? parseInt(req.query.num) + 1 : undefined,
      continuationToken: req.query.continuation_token
    };

    const result = await documentSvc.list( opts );

    res.json( result );
  }

  async function getIncomingShipmentDocument( req, res ) {
  
    const documentName = req.params.documentName;

    const stream = documentSvc.get( { 
      folder: documentSvc.folder('incoming-shipment')( req.params.shipmentId ),
      name: documentName
    } );

    stream.on('error', e => {
      res.json({ error: true, message: `Unable to get object: '${documentName}'` });
    });

    stream.pipe(res);

  }

  function removeIncomingShipmentDocument( req, res ) {
    
    const documentName = req.params.documentName;

    documentSvc.remove({
      folder: documentSvc.folder('incoming-shipment')( req.params.shipmentId ),
      name: documentName
    })
      .then( _ => res.json( { success: true } ) )
      .catch( _ => res.json({ error: true, message: `Unable to delete object: '${documentName}'` }) );

  }

  function uploadIncomingShipmentDocument( req, res, next ) {

    const documentName = req.params.documentName;

    const form = new formidable.IncomingForm();
    form.parse(req, async function (err, _fields, files) {
      if( err ) {
        next(err);
      }

      try {

        const file = Object.entries(files)[0];

        if(file) {

          const [ _, f ] = file;

          const readStream = fs.createReadStream(f.path);
  
          const storePromise = await documentSvc.store( {
            readStream: readStream,
            folder: documentSvc.folder('incoming-shipment')( req.params.shipmentId ),
            name: documentName,
            isPublic: false,
          } )

          console.log(`Unlinking temp file ${f.path}`);
          fs.promises.unlink(f.path);
          await storePromise
          res.json( { success: true } );
        }
        else {
          res.json( { error: true, message: 'No file uploaded.' } );
        }


      }
      catch (e) {
        next(e);
      }
    });

  }

  //===================
  // Receiving handlers

  async function receiveIncomingShipment( req, res ) {

    if( 'isReceived' in req.body && typeof req.body.isReceived === 'boolean' ) {
      const isReceived = req.body.isReceived;

      const shipmentId = req.params.shipmentId;

      const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
      if( shipment ) {
        const result = isReceived ? await shipment.receive() : await shipment.unreceive();
        res.json( { success: true } );
      }
      else {
        res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
      }
    }
    else {
      res.json( { error: true, message: `Invalid request.` } );
    }

  }

  async function receiveIncomingShipmentPallet( req, res, next ) {

    try {

      const shipmentId = req.params.shipmentId;

      const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );

      if( shipment ) {
        const result = await shipment.receivePallet( req.body );
        res.json( { success: true } );
      }
      else {
        res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
      }
    }
    catch(e) {
      res.json( { error: true, message: `Invalid request.` } );
      next(e);
    }

  }

  async function removeIncomingShipmentPalletReceived( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.removePalletReceived( req.params.palletId );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  }

  async function editIncomingShipmentPalletReceived( req, res ) {

    const shipmentId = req.params.shipmentId;

    const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
    if( shipment ) {
      const result = await shipment.editPalletReceived( req.params.palletId, req.body );
      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }
  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}


