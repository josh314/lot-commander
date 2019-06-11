import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Image editor controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', [ '$document', '$state', '$uibModal', 'fileUpload', 'ImageSvc', 
  function($document, $state, $uibModal, fileUpload, ImageSvc) {
    const vm = this;

    const imgProps = {
      rotate: 0,
    };
    let editor;


    const imageStore = ImageSvc.getStore();

    const initImg = async () => {
      const img = new Image();

      img.onload = () => {
        editor = new Croppie(
          $document[0].getElementById('croppie-container'),
          {
            viewport: { width: .8*img.width, height: .8*img.height },
            boundary: { width: img.width, height: img.height },
            showZoomer: false,
            enableOrientation: true,
            enableResize: true,
            mouseWheelZoom: 'ctrl'
          }
        );
        editor.bind({
          url: `/api/image/?s3=${encodeURIComponent(imageStore.s3)}` || imageStore.filename,
          // orientation: 1
        });
      };
      img.src = `/api/image/?s3=${encodeURIComponent(imageStore.s3)}` || imageStore.filename;
      return img;
    };
    initImg();

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
      const image = await editor.result({type: 'base64', size: 'viewport', format: 'jpeg'});
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
        const blob = await editor.result({type: 'blob', size: 'viewport', format: 'jpeg', quality: .99});
        fileUpload.uploadFileToUrl(blob, '/api/image/replace', ImageSvc.getStore());
        $state.go('main.lots.view', { lotId: ImageSvc.parseS3Location(imageStore.s3).lotId });
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };
  }
]);

/******************* Preview Image edit Modal controller *******************************/
angular.module('myApp').controller('PreviewImageEditModalController', [ 'image', function(image) {
  const vm = this;
  vm.image = image;
}]);
