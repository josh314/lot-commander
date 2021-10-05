import angular from 'angular';

/*********************** Timeout session service ****************************/
angular.module('myApp').factory('sessionTimeout', ['$cookies', '$state', function($cookies, $state){
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

  function timeoutExpired() {
    const timeoutValue = new Date(getCurrentTimeout());
    console.log('current timeout value: ' + timeoutValue);
    if(new Date() > timeoutValue) {
      console.log('logging out...');
      $state.go('main.users.logout');
    }
  }

  function init() {
    console.log('sessionTimeout.init() called');
    let loginTimeout = getCurrentTimeout();
    if(!loginTimeout) {
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
    timeoutExpired: timeoutExpired,
    destroy: destroy
  };
}]);
