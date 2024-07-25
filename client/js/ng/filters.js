import angular from 'angular';

// Converts seconds to a time string in the format of 'hh:mm:ss'
angular.module('myApp').filter( 'numberToTime', function() {

  return function( seconds ) {

    if( !seconds ) {
      seconds = 0;
    }

    const hours = Math.floor( seconds / 3600 );
    const minutes = Math.floor( seconds / 60 );
    const remainingSeconds = seconds % 60;

    let timeString = '';
    if( hours ) {
      timeString += `${hours}:`;
    }
    timeString += `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;

    return timeString;
  };

});