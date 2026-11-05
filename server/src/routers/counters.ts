import { Router } from 'express';
import { HydratedDocument } from 'mongoose';

import * as auth from '../auth';

import type { ICounter } from '../models/counter';
import type{ CountCommander } from '../modules/count-commander';
import { counters } from '@shared/api';

import { parseRequest } from '../parse-request';

function counterToDTO(counter: HydratedDocument<ICounter>): counters.DTO {

  return {
    _id: counter._id.toString(),
    handle: counter.handle as counters.Handle,
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

export function createRouter( countCommander: CountCommander ) {
  const router: Router = Router();

  /*******************************************
   * Register route handlers
   * ======
   *
   ****/

  router.get(

    '/:handle',

    auth.isAuthorized( 'VIEW_COUNTER' ),

    async function getCounter( req, res ) {

      const handle = parseRequest(counters.HandleSchema, req.params.handle, 'handle');
      const counter = await countCommander.getCounter( handle );

      const resp: counters.Response = buildCounterResponse(counter);

      res.json( resp );
    }

  );

  router.post(

    '/:handle',

    auth.isAuthorized( 'EDIT_COUNTER' ),

    async function incrementCounter( req, res ) {

      const handle = parseRequest(counters.HandleSchema, req.params.handle, 'handle');
      const { increment } = parseRequest(counters.IncrementRequestSchema, req.body);

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