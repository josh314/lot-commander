import angular from 'angular';

import successBeepWav from '../../../audio/success.wav';
import warningBeepWav from '../../../audio/fail-1.wav';
import failBeepWav from '../../../audio/fail-2.wav';

const successBeep = new Audio(successBeepWav);
const warningBeep = new Audio(warningBeepWav);
const failBeep = new Audio(failBeepWav);


/******************* Audio service *************************/
angular.module('myApp').factory('AudioAlertSvc', [ function( ) { 

  return {
    fail: fail,
    success: success,
    warning: warning
  };

  function fail( ) {
    failBeep.play();
  }

  function success( ) {
    successBeep.play();
  }

  function warning( ) {
    warningBeep.play();
  }

}]);
