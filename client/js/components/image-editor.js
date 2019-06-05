import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Croppie container directive ***************************/
angular.module('myApp').directive('editor', [function(){

}]);

/******************* Image editor controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', [ '$document', 'fileUpload', 'ImageSvc', function($document, fileUpload, ImageSvc) {
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

  vm.crop = async () => {
    const blob = await editor.result('blob', 'viewport', 'jpeg');
    fileUpload.uploadFileToUrl(blob, '/api/image/replace', ImageSvc.getStore());
  };
}]);

