const express = require('express');

const auth = require('../auth');
const { InvalidRequestError } = require('../errors');
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

const __SHIPMENT_DOCUMENTS_FOLDER_PREFIX__ = 'incoming-shipment';
const __SHIPMENT_EXPECTED_PALLET_DOCUMENTS_FOLDER_PREFIX__ = 'incoming-shipment-expected-pallet';
const __INVENTORY_PALLET_DOCUMENTS_FOLDER_PREFIX__ = 'inventory-pallet';
const __RESTRICTED_DOCUMENT_PERMISSION__ = 'VIEW_PURCHASING_DATA';

const __FOLDER_PREFIX__ = {
  'shipment': __SHIPMENT_DOCUMENTS_FOLDER_PREFIX__,
  'shipment-expected-pallet': __SHIPMENT_EXPECTED_PALLET_DOCUMENTS_FOLDER_PREFIX__,
  'received-pallet': __INVENTORY_PALLET_DOCUMENTS_FOLDER_PREFIX__,
  'consolidated-pallet': __INVENTORY_PALLET_DOCUMENTS_FOLDER_PREFIX__
};

function authViewDocumentAccess( req, res, next ) {

  switch( req.query.object_type ) {
    case 'shipment':
    case 'shipment-expected-pallet':
      return auth.isAuthorized( 'VIEW_INCOMING_SHIPMENT' )( req, res, next );
    case 'received-pallet':
    case 'consolidated-pallet':
      return auth.isAuthorized( 'VIEW_INVENTORY_PALLET'  )( req, res, next );
    default:
      throw new InvalidRequestError();
  }

}

function authEditDocumentAccess( req, res, next ) {

  switch( req.query.object_type ) {
    case 'shipment':
    case 'shipment-expected-pallet':
      return auth.isAuthorized( 'EDIT_INCOMING_SHIPMENT' )( req, res, next );
    case 'received-pallet':
    case 'consolidated-pallet':
      return auth.isAuthorized( 'EDIT_INVENTORY_PALLET'  )( req, res, next );
    default:
      throw new InvalidRequestError();
  }

}

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes( ) {
  const router = new express.Router();

  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.get(
    '/:objectId',
    authViewDocumentAccess,
    listObjectDocuments
  );
  router.get(
    '/:objectId/:documentName', 
    authViewDocumentAccess,
    getObjectDocument
  );
  router.delete(
    '/:objectId/:documentName', 
    authEditDocumentAccess,
    removeObjectDocument
  );
  router.put(
    '/:objectId/:documentName', 
    authEditDocumentAccess,
    uploadObjectDocument
  );
  router.patch(
    '/:objectId/:documentName', 
    authEditDocumentAccess,
    editObjectDocumentProperties
  );

  //==================
  // document handlers

  async function listObjectDocuments( req, res, next ) {

    try {

      const opts = {
        folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )(req.params.objectId),
        num: req.query.num ? parseInt(req.query.num) + 1 : undefined,
        continuationToken: req.query.continuation_token
      };

      const result = await documentSvc.list( opts );

      if( result && result.documents ) {

        result.documents = (await Promise.map(
          result.documents,
          async (doc) => {

            const docTags = await documentSvc.getDocumentTags( {
              folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )(req.params.objectId),
              name: doc.name
            } );

            // docTags.Tagset is an array of objects with props Key, Value, i.e. docTags.Tagset = [ { Key: ..., Value: ...}, ... ]
            for( let { Key, Value } of docTags.TagSet ) {
              doc[ Key ] = Value;
            }

            return doc;
          }
        ))
          .filter( doc => req.user.isAuthorized(doc.permission) );

      }

      res.json( result );
    }
    catch(e) {
      next( e );
    }
  }

  async function getObjectDocument( req, res ) {
  
    const documentName = req.params.documentName;

    const stream = documentSvc.get( { 
      folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )( req.params.objectId ),
      name: documentName
    } );

    stream.on('error', _e => {
      res.json({ error: true, message: `Unable to get object: '${documentName}'` });
    });

    stream.pipe(res);

  }

  function removeObjectDocument( req, res ) {
    
    const documentName = req.params.documentName;

    documentSvc.remove({
      folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )( req.params.objectId ),
      name: documentName
    })
      .then( _ => res.json( { success: true } ) )
      .catch( _ => res.json({ error: true, message: `Unable to delete object: '${documentName}'` }) );

  }

  function uploadObjectDocument( req, res, next ) {

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
  
          const tags = {
            permission: fields.isRestricted === 'true' || fields.documentType === 'invoice' ? __RESTRICTED_DOCUMENT_PERMISSION__ : '',
            documentType: fields.documentType || '',
          };

          await documentSvc.store( {
            readStream: readStream,
            folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )( req.params.objectId ),
            name: documentName,
            tags
          } );

          console.log(`Unlinking temp file ${f.path}`);
          fs.promises.unlink(f.path);
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

  function editObjectDocumentProperties( req, res, next ) {

    try {

      if( !req.body ) {
        throw new InvalidRequestError();
      }

      const documentName = req.params.documentName;

      const newTags = {};
      if( 'isRestricted' in req.body ) {
        newTags.permission = req.body.isRestricted ? __RESTRICTED_DOCUMENT_PERMISSION__ : '';
      }
      if( 'documentType' in req.body ) {
        newTags.documentType = req.body.documentType || '';
      }

      if( !Object.entries(newTags).length ) {
        throw new InvalidRequestError();
      }

      documentSvc.addDocumentTags({
        folder: documentSvc.folder( __FOLDER_PREFIX__[ req.query.object_type ] )( req.params.objectId ),
        name: documentName,
        tags: newTags
      })
        .then( _ => res.json( { success: true } ) );

    }
    catch(e) {
      next( e );
    }

  }

  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}
  