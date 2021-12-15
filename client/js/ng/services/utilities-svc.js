import angular from 'angular';

/******************* Manifest File Handler service ******************************/
angular.module('myApp').factory( 'UtilitiesSvc', [ function( ) {


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

  function prettifyDate (dt) { return dt && dt.toLocaleDateString ? dt.toLocaleDateString() : dt; }


  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  });

  function displayAsMoney( num ) {

    if( !num ) return;

    return currencyFormatter.format( num );

  }

  function htmlifyText( txt ) {
    return txt ? txt.split("\n").join('<br/>') : txt;
  }

  return {
    displayAsMoney,
    htmlifyText,
    humanReadableFileSize,
    prettifyDate
  };

}]);
