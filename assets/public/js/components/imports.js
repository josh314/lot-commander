(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Imports Controller *************************/
	app.controller('ImportsCtrl', ['$http', '$scope', '$state', 'fileUpload', 'messageModal', 'sessionTimeout',
		function($http, $scope, $state, fileUpload, messageModal, sessionTimeout) {
			sessionTimeout.timeoutExpired();

			$scope.parseOpts = {};
			$scope.noFileSelected = false;
			$scope.noBarcodeColSelected = false;

			$scope.waitingForResponse =false;

			$scope.importManifest = function() {
				if(!$scope.manifestToUpload) {
					$scope.noFileSelected = true;
					return;
				}
				else {
					$scope.noFileSelected = false;
				}

				if($scope.parseOpts.upcCol===undefined) {
					$scope.noBarcodeColSelected = true;
					return;
				}
				else {
	    		$scope.noBarcodeColSelected = false;
				}

		    const manifest = $scope.manifestToUpload;
		    const manifestFileExtension = manifest.name.split(".").pop();
		    const validFileExtensions = ['xls', 'xlsx', 'xlsm']; // CSV?
		    if(validFileExtensions.includes(manifestFileExtension)) {
			    const uploadUrl = "/api/imports/manifest";
			    const metadata = { 
						parseOpts: JSON.stringify($scope.parseOpts),
			    };
			    fileUpload.uploadFileToUrl(manifest, uploadUrl, metadata).then(resp=>{
			    	if(!resp.data.error) {
				    	messageModal.launch({header: 'Status', body: 'Submission successful.', type: 'success'});
				    }
				    else {
				    	messageModal.launch({header: 'Submission failed', body: resp.data.error, type: 'error'});
				    }
			    	$state.reload();
			    });
			    $scope.waitingForResponse = true;
			  }
			  else {
			  	messageModal.launch({
			  		header: 'Input Error.',
			  		body: `Incorrect file type. Only these file extensions are accepted: ${validFileExtensions}`,
			  		type: 'error'
			  	});
			  }

			}
	}]);

})();