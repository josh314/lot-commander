import angular from 'angular';

/*********************** Upload files directive & controller ***********************/
angular.module('myApp').directive('uploadFilesDir', function(){
  return {
    restrict: 'E',
    replace: false,
    templateUrl: '/partials/directives/_upload_files.html',
    scope: {
      uploadFn: '&',
      isProcessing: '<?',
      selectFilesBtnText: "<?",
      uploadFilesBtnText: "<?",
      waitText: "<?",
    },
    controller: 'UploadFilesDirCtrl as $ctrl',
  };
});


angular.module('myApp').controller( 'UploadFilesDirCtrl', [

  '$scope',
  'ModalSvc',

  function(

    $scope,
    ModalSvc,

  ) {

    const vm = this;
    init();

    function init() {

      Object.assign(
        vm,
        {

          id: crypto.randomUUID(),

          filesToUpload: null,

          selectFilesBtnText: $scope.selectFilesBtnText || 'Select file(s)',
          uploadFilesBtnText: $scope.uploadFilesBtnText || 'Upload file(s)',
          waitText: $scope.waitText || 'Uploading file(s)...',

          uploadFiles,

        }
      );

    }

    async function uploadFiles() {

      await ModalSvc.wait( {
        message: 'Uploading files...',
        waitFor: $scope.uploadFn( { files: vm.filesToUpload } ),
      } );

      if( $scope.isProcessing ) {
        await ModalSvc.message( { header: 'Processing', body: 'File upload is processing. Please check back later.' } );
      }

      vm.filesToUpload = null;

    }


  }
]);