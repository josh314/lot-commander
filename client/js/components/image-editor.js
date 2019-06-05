import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Croppie container directive ***************************/
angular.module('myApp').directive('editor', [function(){

}]);

/******************* Image editor controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', [ '$document', '$uibModal', 'fileUpload', 'ImageSvc', function($document, $uibModal, fileUpload, ImageSvc) {
  const vm = this;

  const imgProps = {
    rotate: 0,
  };
  let editor;

  const imageStore = ImageSvc.getStore();
  const img = new Image();

  img.onload = () => {
    editor = new Croppie(
      $document[0].getElementById('croppie-container'),
      {
        viewport: { width: img.width, height: img.height },
        boundary: { width: img.width+100, height: img.height+100 },
        showZoomer: false,
        enableOrientation: true,
        enableResize: true,
        mouseWheelZoom: 'ctrl'
      }
    );
    editor.bind({
      url: imageStore.s3 || imageStore.filename,
      // orientation: 1
    });
  };
  img.src = imageStore.s3 || imageStore.filename;

  vm.rotate = () => {
    imgProps.rotate = ( imgProps.rotate + 90 ) % 360;
    if(imgProps.rotate) {
      editor.rotate(imgProps.rotate);
    }
    else {
      editor.bind({
        url: imageStore.s3 || imageStore.filename,
        oritentation: 1,
      });
    }
  };


  vm.preview = async function() {
    const image = await editor.result('base64', 'viewport', 'jpeg');
    const modalInstance = $uibModal.open({
      templateUrl: '/partials/modals/_preview_image_edit_modal.html',
      size: 'lg',
      controller: 'PreviewImageEditModalController as preview',
      resolve: {
        image: function () {
          return image;
        }
      },
    });

    modalInstance.result.then(async function () {
      const blob = await editor.result('blob', 'viewport', 'jpeg');
      fileUpload.uploadFileToUrl(blob, '/api/image/replace', ImageSvc.getStore());
    }, function () {
      console.log('Modal dismissed at: ' + new Date());
    });
  };
}]);

/******************* Preview Image edit Modal controller *******************************/
angular.module('myApp').controller('PreviewImageEditModalController', [ 'image', function(image) {
  const vm = this;
  vm.image = image;
}]);
