import angular from 'angular';

import * as api from '../../api';

const __ANNOUNCEMENTS_COOKIE_NAME__ = 'site-announcements';

/************ Service for managing site-wide announcements ***/
angular.module('myApp').factory( 'SiteAnnouncementsSvc', [

  '$cookies',
  '$q',
  'ModalSvc',

  function(

    $cookies,
    $q,
    ModalSvc

  ) {

    return {
      edit,
      create,
      remove,
      list,
      display,
      init,
    };

    async function init() {

      const announcementsCookie = $cookies.get( __ANNOUNCEMENTS_COOKIE_NAME__ );

      if( announcementsCookie ) {

        const { announcements } = JSON.parse(announcementsCookie);

        for( let announcement of announcements ) {
          await display( announcement );
        }
        $cookies.remove( __ANNOUNCEMENTS_COOKIE_NAME__ );

      }

    }

    function display( announcement ) {

      return ModalSvc.message( announcement );

    }

    function list( filter ) {
      return $q.when( api.listAnnouncements( filter ) );
    }

    function create( data ) {
      return $q.when( api.createAnnouncement( data ) );
    }

    function remove( announcementId ) {
      return $q.when( api.deleteAnnouncement( announcementId ) );
    }

    function edit( announcementId, data ) {
      return $q.when( api.editAnnouncement( announcementId, data ) );
    }

  }
]);