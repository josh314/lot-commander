import angular from 'angular';

import * as api from '../../api';

/******************* Store Content Service *************************/
angular.module('myApp').factory('StoreContentSvc', [ '$q', function( $q ) {

  const deleteContent = ( content ) => $q.when( api.deleteStoreContent( content ) );

  return {

    getSchema: () => $q.when( api.getStoreContentSchema( ) ),

    get: ( gid, env ) => $q.when( api.getStoreContent( gid, { env } ) ),

    edit: ( newContent, env ) => $q.when( api.editStoreContent( newContent, { env } ) ),

    list: ( env ) => $q.when( api.listStoreContent( { env } ) ).then( content =>  {

      return content;

    }),

    delete: deleteContent,

    deleteMany: contents => $q.when( Promise.all( contents.map( deleteContent ) ) ),

  };

}]);