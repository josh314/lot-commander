const express = require('express');

const auth = require('../auth');
const { ResourceNotFoundError } = require('../errors');


module.exports = routes;

/**********************************************
 * Routes function for export
 * ==========================
 * 
 **********/

function routes({ listings, lotdb }) {
  const router = new express.Router();


  /*******************************************
   * Register route handlers
   * ======
   * 
   ****/

  router.post(
    '/submit',
    express.json(),
    ( req, res, next ) => {
      const marketplace = req.body.listing.marketplace;
      if( marketplace === 'wholesaleninjas' ) {
        auth.isAuthorized('SUBMIT_SHOPIFY_LISTING')(req,res,next);
      }
      else if ( marketplace === 'bstock' ) {
        auth.isAuthorized('SUBMIT_AUCTION')(req,res,next);
      }
      else {
        throw new Error(`Marketplace '${marketplace}' not recognized.`);
      }
    },
    submit
  );


  /*******************************************
   * Define Handlers
   * ===============
   * 
   ****/

  async function submit( req, res, next ) {

    try {
      const lotId = req.body.lotId;
      const listing = req.body.listing;
      const publish = !!req.body.publish;

      const lot = await lotdb.getLotById( lotId );
      if( !lotId || !lot ) {
        console.error('No listing submitted: invalid or missing lotId.');
        const e = new ResourceNotFoundError( { name: 'lot', id: lotId } );
        throw e;
      }
      listing.lot = lot;
    
      const respPromise = listings.submit( { lotId, listing, publish } );

      // Submission takes a while so don't wait
      res.json({ message: 'Listing submitted. Submission may take several minutes.'});

      // wait for submission to finish then update the lot
      const submittedListingResponse = await respPromise;
      lotdb.updateLot( submittedListingResponse.lot );
    }
    catch(e) {

      return next( e );

    }
  

  }


  /**************************************
   * Return routes
   * =============
   * 
   ************/
  return router;

}