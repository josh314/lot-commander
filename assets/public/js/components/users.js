(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	const app = angular.module('myApp');

	function passwordInvalid(password) {
		// if(password.length < 20) {
		// 	return true;
		// }

		return false;
	}

	/*********************** Logout service ****************************/
	app.factory('logout', ['$http', '$window', 'sessionTimeout', function($http, $window, sessionTimeout){
		return function() {
			$http.get('/logout').then(res=>{
				// userStore.logout();
				console.log("destroying 'manifester' cookie");
				sessionTimeout.destroy();
				$window.location.reload();
			});
		};
	}]);

	/*********************** Timeout session service ****************************/
	app.factory('sessionTimeout', ['$cookies', '$state', function($cookies, $state){
		var cookieName = 'manifester';

		// Values for local time browser session timeout
		var timeoutHour = 2;
		var timeoutMinutes = 0;
		var timeoutSeconds = 0;

		function expireTime() {
			var d = new Date();
			d.setHours(timeoutHour);
			d.setMinutes(timeoutMinutes);
			d.setSeconds(timeoutSeconds);
			if(d < new Date()) {
				d.setDate(d.getDate() + 1);
			}
			return d;
		}

		function getCurrentTimeout() {
			var manifesterCookie = $cookies.getObject(cookieName);
			var loginTimeout = manifesterCookie ? manifesterCookie.timeout : undefined;
			return loginTimeout;
		}

		function timeoutExpired() {
			var timeoutValue = new Date(getCurrentTimeout())
			console.log('current timeout value: ' + timeoutValue);
			if(new Date() > timeoutValue) {
				console.log('logging out...');
				$state.go('main.users.logout');
			}
		};

		function init() {
			console.log('sessionTimeout.init() called');
			var loginTimeout = getCurrentTimeout();
			if(!loginTimeout) {
				console.log("init'ing new timeout value");
				var loginTimeout = expireTime();
				var manifesterCookie = {
					timeout: loginTimeout,
				}
				$cookies.putObject(cookieName, manifesterCookie);
			} else {
				loginTimeout = new Date(loginTimeout)
			}
			console.log('Session will timeout at: ' + loginTimeout)
		}

		function destroy() {
			$cookies.remove(cookieName);
		}

		return {
			init: init,
			timeoutExpired: timeoutExpired,
			destroy: destroy
		}
	}]);

	/*************** Logout Controller **************************/
	app.controller('LogoutCtrl', ['logout', function(logout){
		logout();
	}]);

	/******************* Change Password Controller ********************/
	app.controller('ChangeUserPasswordCtrl', ['$scope', '$http', 'logout', 'sessionTimeout', function($scope, $http, logout, sessionTimeout){
		sessionTimeout.timeoutExpired();
		$scope.passwordMismatch = false;
		$scope.passwordInvalid = false;

		$scope.submitPasswordChange = function() {

			$scope.passwordInvalid = passwordInvalid($scope.password);
			$scope.passwordMismatch = ($scope.password !== $scope.confirmPassword);

			if($scope.passwordInvalid || $scope.passwordMismatch) {
				return;
			}

			const submitData = { password: $scope.password };
			$http.post('/api/users/change-password', submitData).then(function(resp){
				logout();
			});
		};
	}]);

})();
