import angular from 'angular';

import successBeepWav from '../../audio/success.wav';
import failBeepWav from '../../audio/fail-2.wav';

const successBeep = new Audio(successBeepWav);
const failBeep = new Audio(failBeepWav);


/******************* Audio service *************************/
angular.module('myApp').factory('AudioAlertSvc', [ function( ) { 

  return {
    fail: fail,
    success: success,
  };

  function fail( ) {
    failBeep.play();
  }

  function success( ) {
    successBeep.play();
  }

}]);
