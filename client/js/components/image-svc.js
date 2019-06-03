import angular from "angular";
import * as Promise from "bluebird";

const urls = {
  upload: '/api/image/upload',
  setPrimary: '/api/image/primary',
  remove: '/api/image/remove',
  delete: '/api/image/delete',
};

//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', '$state', 'fileUpload', 
  function($http, $state, fileUpload){
    const svc = this;

    svc.uploadLotImages = function(lot, images){
      return Promise.map(images, (image)=>{
        return fileUpload.uploadFileToUrl(image, urls.upload, { lotId: lot._id, primary: false });
      });
    };

    svc.updateLotPrimaryImage = function(lot, image) {
      return $http.post(urls.setPrimary, {lotId: lot._id, primaryImage: image});
    };

    svc.removeLotImage = async function(lot, image) {      
      const data = {
        lotId: lot._id,
        image: image
      };
      let resp;

      resp = await $http.post(urls.remove, data);
      // if(!resp.error) {
      //   resp = svc.deleteImageFile( image );
      // }
      return resp;
    };

    svc.deleteImageFile = async function(image) {
      return $http.post(urls.delete, { image: image });
    }
  }
]);