import angular from 'angular';

/******************* Upload 3rd Part Manifest Controller *************************/
angular.module('myApp').controller( 'UploadLotManifestCtrl', [

  '$state',
  '$stateParams',
  'fileUpload',
  'ModalSvc',

  function(

    $state,
    $stateParams,
    fileUpload,
    ModalSvc,

  ) {
    const vm = this;

    vm.noFileSelected = false;
    vm.waitingForResponse =false;

    vm.uploadManifest = function() {
      if(!vm.manifestToUpload) {
        vm.noFileSelected = true;
        return;
      }
      else {
        vm.noFileSelected = false;
      }

      const manifest = vm.manifestToUpload;
      const manifestFileExtension = manifest.name.split(".").pop();
      const validFileExtensions = ['xls', 'xlsx', 'xlsm'];
      if(validFileExtensions.includes(manifestFileExtension)) {
        const uploadUrl = `/api/lots/${$stateParams.lotId}/upload-manifest`;

        fileUpload.uploadFileToUrl(manifest, uploadUrl).then(resp=>{
          if(!resp.data.error) {
            ModalSvc.message({header: 'Status', body: 'Submission successful.', type: 'success'});
            $state.go('main.lots.view', { lotId: $stateParams.lotId });
          }
          else {
            ModalSvc.message({header: 'Submission failed', body: resp.data.error, type: 'error'});
          }
        });
        vm.waitingForResponse = true;
      }
      else {
        ModalSvc.message({
          header: 'Input Error.',
          body: `Incorrect file type. Only these file extensions are accepted: ${validFileExtensions}`,
          type: 'error'
        });
      }

    };
  }
]);

