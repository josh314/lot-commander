const Agenda = require('agenda');
// the following are dependencies included in the agenda package
const humanInterval = require('human-interval');
const cronParser = require('cron-parser');

const __TIME_ZONE__ = process.env.TIMEZONE;

const mongoose = require('mongoose');
const {
  IllegalActionError,
  ResourceNotFoundError
} = require('../errors');

/************************************************
 * Helpers
 * =======
 *
 *********/

function invalidInterval( interval ) {

  try {
    cronParser.parseExpression( interval );
    return false;
  }
  catch(e) {
    'no-op';
  }

  return isNaN( humanInterval( interval ) );

}

function invalidDate( date ) {
  const dateObj = new Date( date );
  return isNaN( dateObj.getTime() );
}


const jobsQueryFilter = ( {
  type,
  name,
} ) => {

  const filter = {};

  if ( type ) {
    filter.type = type;
  }

  if ( name ) {
    filter.name = name;
  }

  return filter;
};


/**********************************************
 * Consolidated scheduler class
 * ============================
 *
 *********/

class Scheduler {

  constructor( { mongo, shopifyGql } ) {

    this.mongo = mongo;

    this._schedulers = {
      lotCommander: new LotCommanderScheduler( { mongo, shopifyGql } ),
      mailchimp: new MailchimpScheduler( mongo ),
    };

  }

  init() {
    const promises = [];
    for( let _scheduler of Object.values( this._schedulers ) ) {
      promises.push( _scheduler.init() );
    }

    return Promise.all( promises );
  }


  setShopMetafield( when, metafield ) {

    return this._schedulers.lotCommander.setShopMetafield( when, metafield );

  }

  listMailchimpJobs( { num, skip, sort, sortDir, filterParams }  ) {
    return this._schedulers.mailchimp.listJobs( { num, skip, sort, sortDir, filterParams } );
  }


  getMailchimpJobById( jobId ) {
    return this._schedulers.mailchimp.getJobById( jobId );
  }


  updateMailchimpJob( jobId, { interval, when, data } ) {
    return this._schedulers.mailchimp.updateJob( jobId, { interval, when, data } );
  }

  updateMailchimpJobData( jobId, data ) {
    return this._schedulers.mailchimp.updateJobData( jobId, data );
  }


  updateMailchimpJobInterval( jobId, interval ) {
    return this._schedulers.mailchimp.updateJobInterval( jobId, interval );
  }

  updateMailchimpJobWhen( jobId, when ) {
    return this._schedulers.mailchimp.updateJobWhen( jobId, when );
  }

  createMailchimpJob( { when, interval, name, data } ) {

    if( when ) {
      return this._schedulers.mailchimp.newScheduledJob( when, name, data );
    }
    else if( interval ) {
      return this._schedulers.mailchimp.newCronJob( interval, name, data );
    }
    else {
      throw new Error( 'Must provide either "when" or "interval" for new job.' );
    }

  }

}

module.exports = Scheduler;

/**********************************************
 * Worker classes
 * ==============
 *
 *********/

// Prototype for all schedulers

class _Scheduler {
  constructor( name, mongo ) {

    this.name = name;

    this.agenda = new Agenda({
      db: { collection: `${name}-scheduled-tasks` },
      mongo,
      name: 'lot-commander', // name of client

      // defaultConcurrency: 1,
      // maxConcurrency: 1,
      disableAutoIndex: true,

      // this option is how often the database job is queried, in memory jobs can run faster than this.
      processEvery: '10 minutes',
    });

    this.agenda.on( "complete", (job) => {
      console.log( `Completed: ${job.attrs.name} ( _id: ${ job.attrs._id } )` );
    });

    this.agenda.on( "success", (job) => {
      console.log( `Success: ${job.attrs.name} ( _id: ${ job.attrs._id } )` );
    });

    // TODO: how do we handle failures? retry? notify?


  }

  async init(  ) {

    // start the scheduler

    console.log();
    console.log(`Starting task processing for ${this.name} scheduler...`);
    await this.agenda.start();

  }

  async findCronJob( cronName ) {

    // Query cronjobs
    const cronJobsQuery = {
      name: cronName,
      type: 'single',
      repeatInterval: { $exists: true }
    };

    const cronJobs = await this.agenda.jobs(
      cronJobsQuery
    );

    return cronJobs && cronJobs[0];

  }

  listJobs( { num = 10, skip = 0, sort = 'nextRunAt', sortDir = 1, filterParams } ) {

    const filter = jobsQueryFilter( filterParams );

    const sortQuery = {
      [sort]: sortDir
    };

    return this.agenda.jobs(
      filter,
      sortQuery,
      num,
      skip
    );

  }

  newCronJob( interval, name, data ) {

    return this.agenda.every( interval, name, data, { timezone: __TIME_ZONE__ } );

  }

  newScheduledJob( when, name, data ) {

    return this.agenda.schedule( when, name, data, { timezone: __TIME_ZONE__ } );

  }

  async updateJobInterval( jobId, interval ) {

    if( invalidInterval( interval ) ) {
      throw new IllegalActionError( 'Invalid interval.' );
    }

    const job = await this.getJobById( jobId );

    if( !job ) {
      throw new ResourceNotFoundError( { type: 'scheduled-job', id: jobId } );
    }

    if( job.attrs.type !== 'single' ) {
      throw new IllegalActionError( 'Can only update interval of single jobs.' );
    }

    job.repeatEvery( interval, { timezone: process.env.TIMEZONE } );
    return job.save();

  }

  async updateJobData( jobId, data ) {

    const job = await this.getJobById( jobId );

    if( !job ) {
      throw new ResourceNotFoundError( { type: 'scheduled-job', id: jobId } );
    }

    job.attrs.data = data;

    return job.save();

  }

  async updateJobWhen( jobId, when ) {

    if( invalidDate( when ) ) {
      throw new IllegalActionError( 'Invalid datetime.' );
    }

    const job = await this.getJobById( jobId );

    if( !job ) {
      throw new ResourceNotFoundError( { type: 'scheduled-job', id: jobId } );
    }

    if( job.attrs.type !== 'normal' ) {
      throw new IllegalActionError( 'Can only update datetime of normal jobs.' );
    }

    job.schedule( when );
    return job.save();

  }

  async updateJob( jobId, { interval, when, data } ) {

    if( interval && invalidInterval( interval ) ) {
      throw new IllegalActionError( 'Invalid interval.' );
    }

    if( when && invalidDate( when ) ) {
      throw new IllegalActionError( 'Invalid datetime.' );
    }

    const job = await this.getJobById( jobId );

    if( !job ) {
      throw new ResourceNotFoundError( { type: 'scheduled-job', id: jobId } );
    }

    if( interval && job.attrs.type !== 'single' ) {
      throw new IllegalActionError( 'Can only update interval of single jobs.' );
    }

    if( when && job.attrs.type !== 'normal' ) {
      throw new IllegalActionError( 'Can only update datetime of normal jobs.' );
    }

    if( interval ) {
      job.repeatEvery( interval, { timezone: process.env.TIMEZONE } );
    }

    if( when ) {
      job.schedule( when );
    }

    if( data ) {
      job.attrs.data = data;
    }

    return job.save();

  }


  async getJobById( jobId ) {

    const jobs = await this.agenda.jobs(
      {
        _id: new mongoose.Types.ObjectId( jobId )
      }
    );

    return jobs && jobs[0];

  }


}

// Scheduler for Lot Commander

class LotCommanderScheduler extends _Scheduler {

  constructor( { mongo, shopifyGql } ) {

    super( 'lot-commander', mongo );

    this.agenda.define( "setShopMetafield", job => {

      const { metafield } = job.attrs.data;

      return shopifyGql.setShopMetafield( metafield );

    });

    this.agenda.define( "deleteShopMetafield", job => {

      const { gid } = job.attr.data;

      return shopifyGql.deleteMetafield( gid );

    });

  }


  async getAllScheduledStoreContentChanges() {

    const pendingJobsQuery = {
      type: 'normal',
      name: {
        $in: [
          'deleteShopMetafield',
          'setShopMetafield',
        ]
      },
      lastFinishedAt: null,
    };

    const pendingJobs = await this.agenda.jobs( pendingJobsQuery );

    return pendingJobs;

  }


  setShopMetafield( when, metafield ) {

    return this.agenda.schedule( when, "setShopMetafield", { metafield } );

  }


}

// Scheduler for Mailchimp emails

class MailchimpScheduler extends _Scheduler {

  constructor( mongo ) {

    super( 'shopify-mailchimp', mongo );

  }


}