import angular from 'angular';
import "angular-cookies";
import "angular-animate";
import "angular-sanitize";
import "@uirouter/angularjs";
import "angular-ui-bootstrap";

/************************************************************************
************************ Angular app ************************************
************************************************************************/
angular.module('myApp', ['ui.bootstrap', 'ui.router', 'ngAnimate', 'ngSanitize', 'ngCookies']);

