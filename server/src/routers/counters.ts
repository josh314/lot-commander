import { Router } from 'express';
import { HydratedDocument } from 'mongoose';

import * as auth from '../auth';

import type { ICounter } from '../models/counter';
import { CountCommander } from '../modules/count-commander';
import * as schemas from '../schemas/api';
import { counters } from '@shared/api';

function counterToDTO(counter: HydratedDocument<ICounter>): counters.Data {
  return {
    _id: counter._id.toString(),
    handle: counter.handle,
    count: counter.count,
    createdAt: counter.createdAt.toISOString(),
    updatedAt: counter.updatedAt.toISOString(),
  };
}

function buildCounterResponse(counter: HydratedDocument<ICounter> | null): counters.Response {
  return { counter: counter ? counterToDTO(counter) : null };
}

/**********************************************
 * Routes factory function for export
 * ==================================
 *
 **********/

export function createRouter({ countCommander }: { countCommander: CountCommander }) {
  const router: Router = Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.post(

    '/',

    auth.isAuthorized( 'CREATE_COUNTER' ),

    async function initializeCounter( req, res ) {

      const { handle, count } = schemas.counters.InitializeRequestSchema.parse(req.body);

      const counter = await countCommander.initializeCounter( handle, count );

      const resp: counters.Response = buildCounterResponse(counter);

      res.json( resp );
    }

  );

  router.get(

    '/:handle',

    auth.isAuthorized( 'VIEW_COUNTER' ),

    async function getCounter( req, res ) {

      const handle = req.params.handle;
      const counter = await countCommander.getCounter( handle );

      const resp: counters.Response = buildCounterResponse(counter);

      res.json( resp );
    }

  );

  router.post(

    '/:handle',

    auth.isAuthorized( 'EDIT_COUNTER' ),

    async function incrementCounter( req, res ) {

      const handle = req.params.handle;
      const { increment } = schemas.counters.IncrementRequestSchema.parse(req.body);

      const counter = await countCommander.incrementCounter( handle, increment );

      const resp: counters.Response = buildCounterResponse(counter);

      res.json( resp );
    }
  );

  /**************************************
   * Return routes
   * =============
   *
   ************/
  return router;

}