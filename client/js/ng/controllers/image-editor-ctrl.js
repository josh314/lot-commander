import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Image editor controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', [ '$document', '$uibModal', 'fileUpload', 'ImageSvc', 'navigate',
  function( $document, $uibModal, fileUpload, ImageSvc, navigate) {
    const vm = this;

    const imgProps = {
      rotate: 0,
    };
    let editor;


    const imageStore = ImageSvc.getStore();

    const initImg = async () => {
      const img = new Image();

      const maxWidth = 640;
      const maxHeight = 640;

      img.onload = () => {

        let width = img.width;
        let height = img.height;

        if(width > maxWidth) {
          height = height*(maxWidth/width);
          width = maxWidth;
        }
        
        if(height > maxHeight) {
          width = width*(maxHeight/height);
          height = maxHeight;
        }

        editor = new Croppie(
          $document[0].getElementById('croppie-container'),
          {
            viewport: { width: .8*width, height: .8*height },
            boundary: { width: width, height: height },
            showZoomer: false,
            enableOrientation: true,
            enableResize: true,
            mouseWheelZoom: 'ctrl'
          }
        );
        editor.bind({
          url: imageStore.s3 ? `/api/image/?s3=${encodeURIComponent(imageStore.s3)}` : imageStore.filename,
          // orientation: 1
        });
      };
      img.src = imageStore.s3 ? `/api/image/?s3=${encodeURIComponent(imageStore.s3)}` : imageStore.filename;
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
          url: imageStore.s3 ? `/api/image/?s3=${encodeURIComponent(imageStore.s3)}` : imageStore.filename,
          oritentation: 1,
        });
      }
    };

    vm.preview = async function() {
      const image = await editor.result({type: 'base64', size: 'viewport', format: 'jpeg'});
      const modalInstance = $uibModal.open({
        templateUrl: '/partials/modals/_preview_image_edit_modal.html',
        size: 'lg',

        resolve: {
          image: function () {
            return image;
          }
        },

        controller: [ 'image', function(image) {
          const vm = this;
          vm.image = image;
        }],
        controllerAs: '$ctrl',

      });

      modalInstance.result.then(async function () {
        const blob = await editor.result({type: 'blob', size: 'original', format: 'jpeg', quality: .99});
        fileUpload.uploadFileToUrl(blob, '/api/image/replace', ImageSvc.getStore());
        navigate.viewLot( ImageSvc.parseS3Location(imageStore.s3).lotId );
      }, function () {
        console.log('Modal dismissed at: ' + new Date());
      });
    };
  }
]);