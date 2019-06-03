import angular from "angular";
import * as Promise from "bluebird";

const urls = {
  upload: '/api/image/upload',
  setPrimary: '/api/image/primary',
  remove: '/api/image/remove',
  delete: '/api/image/delete',
};

//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', 'fileUpload', 
  function($http, fileUpload){
    const svc = this;

    svc.uploadLotImages = (lot, images) => {
      return Promise.map(images, (image)=>{
        return fileUpload.uploadFileToUrl(image, urls.upload, { lotId: lot._id, primary: false });
      });
    };

    svc.updateLotPrimaryImage = (lot, image) => {
      return $http.post(urls.setPrimary, {lotId: lot._id, primaryImage: image});
    };

    svc.removeLotImage = async (lot, image) => {      
      const data = {
        lotId: lot._id,
        image: image.s3 ? image.s3 : image.filename,
        imageSrc: image.s3 ? 's3' : 'local'
      };
      let resp;

      resp = await $http.post(urls.remove, data);
      // if(!resp.error) {
      //   resp = svc.deleteImageFile( image );
      // }
      return resp;
    };

    svc.deleteImageFile = async (image) => {
      return $http.post(urls.delete, { image: image });
    };

  }
]);