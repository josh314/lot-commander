const express = require('express');

const auth = require('../auth');
const documentSvc = require('../modules/document-svc');

const fs = require('fs');
const formidable = require('formidable');
const Promise = require('bluebird');

module.exports = routes;

/**********************************************
 * Helpers
 * =======
 * 
 *********/

const listShipmentsFilterParamsFromQueryParams = ( qp ) => {

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

const __SHIPMENT_DOCUMENTS_FOLDER_PREFIX__ = 'incoming-shipment';
const __RESTRICTED_DOCUMENT_PERMISSION__ = 'VIEW_PURCHASING_DATA';

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ eventsDb, inventoryDb }) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  // view shipment(s)
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
  router.get(
    '/:shipmentId',
    auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' ),
    getIncomingShipmentById
  );

  // Edit/create shipment
  router.post(
    '/create',
    auth.isAuthorized( 'CREATE_INCOMING_SHIPMENT' ),
    createIncomingShipment
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
  router.patch(
    '/:shipmentId/documents/:documentName', 
    auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' ),
    editIncomingShipmentDocumentRestrictionStatus
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
      filterParams: listShipmentsFilterParamsFromQueryParams( req.query ),
    };

    const shipments = await inventoryDb.listIncomingShipments(query);

    res.json( { shipments } );
  };

  async function countIncomingShipments( req, res ) {
  
    const count = await inventoryDb.countIncomingShipments( listShipmentsFilterParamsFromQueryParams( req.query ) );

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

    eventsDb.createIncomingShipment( { user: req.user, shipment } );

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

      const edits = Object.keys( req.body ).map( _key => ({ path: _key, oldValue: shipment[ _key ], newValue: req.body[ _key ] }) ); 

      const result = await shipment.edit( req.body );

      for( let edit of edits ) {

        const eventData = Object.assign(
          {
            user: req.user,
            shipment: shipment,
          },
          edit
        )

        eventsDb.editIncomingShipment( eventData );

      }


      res.json( { success: true } );
    }
    else {
      res.json( { error: true, message: `No shipment found with _id ${shipmentId}.` } );
    }

  }

  async function removeIncomingShipment( req, res ) {

    const shipmentId = req.params.shipmentId;

    const result = await inventoryDb.removeIncomingShipment( shipmentId );

    eventsDb.removeIncomingShipment( { user: req.user, shipmentId: shipmentId } );
    res.json( result );

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
      folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)(req.params.shipmentId),
      num: req.query.num ? parseInt(req.query.num) + 1 : undefined,
      continuationToken: req.query.continuation_token
    };

    const result = await documentSvc.list( opts );

    if( result && result.documents ) {

      result.documents = (await Promise.map(
        result.documents,
        async (doc) => {

          const docTags = await documentSvc.getDocumentTags( { 
            folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)(req.params.shipmentId),
            name: doc.name
          } );
          
          const kv = docTags.TagSet.find( _ => _.Key === 'permission' );

          doc.permission = kv && kv.Value;

          return doc;
        }
      ))
        .filter( doc => req.user.isAuthorized(doc.permission) );

    }

    res.json( result );
  }

  async function getIncomingShipmentDocument( req, res ) {
  
    const documentName = req.params.documentName;

    const stream = documentSvc.get( { 
      folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)( req.params.shipmentId ),
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
      folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)( req.params.shipmentId ),
      name: documentName
    })
      .then( _ => res.json( { success: true } ) )
      .catch( _ => res.json({ error: true, message: `Unable to delete object: '${documentName}'` }) );

  }

  function uploadIncomingShipmentDocument( req, res, next ) {

    const documentName = req.params.documentName;

    const form = new formidable.IncomingForm();
    form.parse(req, async function (err, fields, files) {
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
            folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)( req.params.shipmentId ),
            name: documentName,
            permission: fields.isRestricted === 'true' ? __RESTRICTED_DOCUMENT_PERMISSION__ : null,
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

  function editIncomingShipmentDocumentRestrictionStatus( req, res ) {

    if( !req.body || !('isRestricted' in req.body) ) {
      res.json({ error: true, message: `Invalid request.` })
    }

    const documentName = req.params.documentName;

    documentSvc.setDocumentTags({
      folder: documentSvc.folder(__SHIPMENT_DOCUMENTS_FOLDER_PREFIX__)( req.params.shipmentId ),
      name: documentName,
      tagset: [
        {
          Key: 'permission',
          Value: req.body.isRestricted ? __RESTRICTED_DOCUMENT_PERMISSION__ : ''
        }
      ]
    })
      .then( _ => res.json( { success: true } ) )
      .catch( e => console.log(e) || res.json({ error: true, message: `Unable to update object: '${documentName}'` }) );

  }

  //===================
  // Receiving handlers

  async function receiveIncomingShipment( req, res ) {

    if( 'isReceived' in req.body && typeof req.body.isReceived === 'boolean' ) {
      const isReceived = req.body.isReceived;

      const shipmentId = req.params.shipmentId;

      const shipment = await inventoryDb.getIncomingShipmentById( shipmentId );
      if( shipment ) {

        if( isReceived ) {

          await shipment.receive();

          eventsDb.receiveIncomingShipment( { user: req.user, shipment } );

        }
        else {

          await shipment.unreceive();

          eventsDb.unreceiveIncomingShipment( { user: req.user, shipment } );

        }

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

        eventsDb.receiveIncomingShipmentPallet({
          user: req.user,
          shipment: result
        });

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


