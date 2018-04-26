(function() {
	'use strict';
	/************************************************************************
	************************ Angular app ************************************
	*************************************************************************/
	var app = angular.module('myApp');

	/******************* Upload 3rd Part Manifest Controller *************************/
	app.controller('Upload3pManifestCtrl', ['$http', '$scope', '$state', 'dbEnums', 'fileUpload', 'messageModal', 'sessionTimeout',
		function($http, $scope, $state, dbEnums, fileUpload, messageModal, sessionTimeout) {
			sessionTimeout.timeoutExpired();

			$scope.parseOpts = {};
			$scope.noFileSelected = false;
			$scope.noBarcodeColSelected = false;
			$scope.priceNeedsType = false;

			$scope.lotTypeEnum = dbEnums.lotType;
			$scope.priceTypeEnum = dbEnums.priceType;
			$scope.waitingForResponse =false;

			$scope.uploadManifest = function() {
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

		    if($scope.parseOpts.priceCol!==undefined && !$scope.priceType) {
					$scope.priceNeedsType = true;
					return;
		    }
		    else {
		    	$scope.priceNeedsType = false;
		    }

		    const manifest = $scope.manifestToUpload;
		    const manifestFileExtension = manifest.name.split(".").pop();
		    const validFileExtensions = ['xls', 'xlsx', 'xlsm'];
		    if(validFileExtensions.includes(manifestFileExtension)) {
			    const uploadUrl = "/api/manifest-files/upload";
			    const metadata = { 
						parseOpts: JSON.stringify($scope.parseOpts),
						liquidationSource: $scope.liquidationSource,
						type: $scope.lotType,
			    };
			    if($scope.parseOpts.priceCol!==undefined && $scope.priceType) {
						metadata.priceType = $scope.priceType;
			    }
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