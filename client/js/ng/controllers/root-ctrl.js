import angular from 'angular';

/******************* Angular App Root Controller ****************************/
angular.module('myApp').controller( 'RootCtrl', [

  'sessionTimeout',
  'SiteAnnouncementsSvc',

  function(

    sessionTimeout,
    SiteAnnouncementsSvc

  ) {

    sessionTimeout.init();
    SiteAnnouncementsSvc.init();

  }

]);

