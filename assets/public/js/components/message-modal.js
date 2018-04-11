(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Message Modal service ******************************/
	app.factory('messageModal', ['$uibModal', function($uibModal){
		return {
			launch: function(message) {
				
				const modalInstance = $uibModal.open({
		      templateUrl: '/partials/_message_modal.html',
		      size: 'lg',
		      controller: 'MessageModalController',
		      resolve: {
		        message: function () {
		          return message;
		        }
		      },
		    });

				modalInstance.result.then(function(){},function(){});
			}
		}
	}]);

	/***************** Modal Controller ************************/
	app.controller('MessageModalController', [ '$scope', 'message', function($scope, message){
		$scope.message = JSON.parse(JSON.stringify(message));
	}]);
})();