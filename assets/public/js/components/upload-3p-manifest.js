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
			$scope.uploadManifest = function() {
	    	if($scope.manifestToUpload) {
			    const manifest = $scope.manifestToUpload;
			    const uploadUrl = "/api/manifest-files/upload";
			    $scope.parseOpts =  {
			    	upcCol: 5,
			    	blockCol: 11,
			    	descCol: 6,
			    	quantCol: 9,
			    	priceCol: 10
			    };
			    const metadata = { 
						parseOpts: JSON.stringify($scope.parseOpts),
			    };
			    fileUpload.uploadFileToUrl(manifest, uploadUrl, metadata).then(resp=>{
			    	if(!resp.data.error) {
				    	messageModal.launch({header: 'Status', body: 'Submission successful.', type: 'success'});
				    }
				    else {
				    	messageModal.launch({header: 'Submission failed', body: resp.data.error});
				    }
			    	$state.reload();
			    });
			  }
			}
	}]);

})();