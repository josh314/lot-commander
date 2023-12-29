import angular from 'angular';
import * as util from '../../utilities';

import { parser } from 'cron-parser';


class DisplayJob {

    constructor( job ) {

      Object.assign( this, job );

      if( this.nextRunAt ) {
        this.nextRunAt = new Date( this.nextRunAt );
      }

      if( job.repeatInterval ) {

        this.interval = parser.parseExpression( job.repeatInterval );

      }


    }


}

/******************* Controller for mailchimp scheduling *************************/
angular.module('myApp').controller( 'MailchimpScheduleCtrl', [

  'MailchimpSvc',
  'ModalSvc',
  'navigate',
  'sessionTimeout',

  function(

    MailchimpSvc,
    ModalSvc,
    navigate,
    sessionTimeout,

  ) {

    const vm = this;
    init();

    function init() {

      sessionTimeout.timeoutExpired();

      Object.assign(
        vm,
        {

          // expose modules to view

          util,

        }
      );

      getMailchimpJobs();

    }

    function getMailchimpJobs() {

      MailchimpSvc.listJobs()
        .then( jobs => {

          vm.jobGroups = util.groupBy( jobs, 'name', 'object' );

          console.log( vm.jobGroups )

        })
        .catch( err => {
          console.error( err );
        });

    }

  }
]);