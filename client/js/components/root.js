import app from '../ng-app';

/******************* Angular App Root Controller ****************************/
app.controller('RootCtrl', ['sessionTimeout', function(sessionTimeout) {
  sessionTimeout.init();
}]);

