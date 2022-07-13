import angular from 'angular';

import * as api from '../../api';

/******************* Store Content Service *************************/
angular.module('myApp').factory('StoreContentSvc', [ '$q', function( $q ) {

  return {


    edit: newContent  => $q.when( api.editStoreContent( newContent ) ),

    list: () => $q.when( api.listStoreContent() ).then( content =>  {

      return content;

    }),


  };

}]);