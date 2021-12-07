import angular from 'angular';

/******************* Manifest File Handler service ******************************/
angular.module('myApp').factory( 'UtilitiesSvc', [ function( ) {

  return {
    humanReadableFileSize,
    prettifyDate
  };

  function humanReadableFileSize( size ) {

    if( size > 1024*1024 ) {
      return `${(size/1024/1024).toFixed(2)} MB`;
    }
    else if ( size > 1024 ) {
      return `${(size/1024).toFixed(2)} KB`;
    }
    else {
      return `${size} B`;
    }

  }

  function prettifyDate (dt) { return dt && dt.toLocaleDateString(); }

}]);
