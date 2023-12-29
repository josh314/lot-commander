import angular from 'angular';

import * as api from '../../api';

/******************* Service for mailchimp scheduling ***/
angular.module('myApp').factory( 'MailchimpSvc', [

  '$q',

  function(

    $q,

  ) {

    return {
      listJobs: qp => $q.when( api.listMailchimpJobs( qp ) ),
      update: ( jobId, { interval, when, data } ) => $q.when( api.updateMailchimpJob( jobId, { interval, when, data } ) ),
    };

  }
]);