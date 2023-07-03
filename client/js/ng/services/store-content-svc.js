import angular from 'angular';

import * as api from '../../api';

/******************* Store Content Service *************************/
angular.module('myApp').factory('StoreContentSvc', [ '$q', function( $q ) {

  const deleteContent = ( gid, env ) => $q.when( api.deleteStoreContent( gid, { env } ) );

  return {

    getSchema: () => $q.when( api.getStoreContentSchema( ) ),

    get: ( gid, env ) => $q.when( api.getStoreContent( gid, { env } ) ),

    edit: ( newContent, env ) => $q.when( api.editStoreContent( newContent, { env } ) ),

    list: ( env ) => $q.when( api.listStoreContent( { env } ) ).then( content =>  {

      return content;

    }),

    delete: deleteContent,

    deleteMany: ( content ) => $q.when( Promise.all( content.map( _c => deleteContent( _c.gid, _c.env ) ) ) ),

  };

}]);