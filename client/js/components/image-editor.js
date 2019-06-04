import angular from 'angular';
import * as Croppie from 'croppie';

/******************* Flash Message controller *******************************/
angular.module('myApp').controller('ImageEditorCtrl', ['ImageSvc', function(ImageSvc) {

  const image = ImageSvc.getStore();

  const el = document.getElementById('croppie-container');
  const editor = new Croppie(
    document.getElementById('croppie-container'),
    {
      viewport: { width: 200, height: 100 },
      boundary: { width: 300, height: 300 },
      showZoomer: true,
      // enableOrientation: true,
      enableResize: true,
      mouseWheelZoom: 'ctrl'
    }
  );
  editor.bind({
      url: image.s3 || image.filename,
      orientation: 1
  });


}]);

