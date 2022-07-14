import angular from 'angular';

import * as api from '../../api';

/******************* Store Content Service *************************/
angular.module('myApp').factory('StoreContentSvc', [ '$q', function( $q ) {

  return {

    get: gid => $q.when( api.getStoreContent( gid ) ),

    edit: newContent => $q.when( api.editStoreContent( newContent ) ),

    list: () => $q.when( api.listStoreContent() ).then( content =>  {

      return content;

    }),

    delete: gid => $q.when( api.deleteStoreContent( gid ) ),

  };

}]);