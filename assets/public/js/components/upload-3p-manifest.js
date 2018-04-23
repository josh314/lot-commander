(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Upload 3rd Part Manifest Controller *************************/
	app.controller('Upload3pManifestCtrl', ['$http', '$scope', '$state', 'fileUpload', 'messageModal', 'sessionTimeout',
		function($http, $scope, $state, fileUpload, messageModal, sessionTimeout) {
			sessionTimeout.timeoutExpired();
			$scope.parseOpts = {};
			$scope.uploadManifest = function() {
	    	if($scope.manifestToUpload) {
			    const manifest = $scope.manifestToUpload;
			    const manifestFileExtension = manifest.name.split(".").pop();
			    const validFileExtensions = ['xls', 'xlsx', 'xlsm'];
			    if(validFileExtensions.includes(manifestFileExtension)) {
				    const uploadUrl = "/api/manifest-files/upload";
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
				  }
				  else {
				  	messageModal.launch({
				  		header: 'Input Error.',
				  		body: `Incorrect file type. Only these file extensions are accepted: ${validFileExtensions}`,
				  		type: 'error'
				  	});
				  }
			  }
			}
	}]);

})();