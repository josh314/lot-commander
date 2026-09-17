import angular from 'angular';

/*********************** Timeout session service ****************************/
angular.module('myApp').factory('sessionTimeout', ['$cookies', function($cookies){
  const cookieName = 'lotCommander';

  function expireTime() {

    // Values for local time browser session timeout
    const timeoutHour = 2;
    const timeoutMinutes = 0;
    const timeoutSeconds = 0;

    const d = new Date();
    d.setHours(timeoutHour);
    d.setMinutes(timeoutMinutes);
    d.setSeconds(timeoutSeconds);
    if(d < new Date()) {
      d.setDate(d.getDate() + 1);
    }
    return d;
  }

  function getCurrentTimeout() {
    const lotCommanderCookie = $cookies.getObject(cookieName);
    const loginTimeout = lotCommanderCookie ? lotCommanderCookie.timeout : undefined;
    return loginTimeout;
  }

  function isExpired() {
    const timeoutValue = new Date(getCurrentTimeout());
    console.log('current timeout value: ' + timeoutValue);
    return new Date() > timeoutValue;
  }

  function init() {
    console.log('sessionTimeout.init() called');
    let loginTimeout = getCurrentTimeout();
    if(!loginTimeout || new Date(loginTimeout) < new Date()) {
      console.log("init'ing new timeout value");
      loginTimeout = expireTime();
      let lotCommanderCookie = {
        timeout: loginTimeout,
      };
      $cookies.putObject(cookieName, lotCommanderCookie);
    } else {
      loginTimeout = new Date(loginTimeout);
    }
    console.log('Session will timeout at: ' + loginTimeout);
  }

  function destroy() {
    $cookies.remove(cookieName);
  }

  return {
    init: init,
    isExpired: isExpired,
    destroy: destroy
  };
}]);
