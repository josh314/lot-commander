import angular from "angular";
import * as Promise from "bluebird";

const urls = {
  upload: '/api/image/upload',
  setPrimary: '/api/image/primary',
  remove: '/api/image/remove',
};

//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', '$localStorage', 'fileUpload', 
  function($http, $localStorage, fileUpload){
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
        image: image
      };
      let resp;

      resp = await $http.post(urls.remove, data);

      return resp;
    };

    svc.getStore = () => $localStorage.image;

    svc.setStore = (image) => $localStorage.image = image;

    svc.resetStore = () => delete $localStorage.image;

    svc.getFromImageServer = (s3Location) => {
      try {
        return $http.get(`/api/image/?s3=${encodeURIComponent(s3Location)}`);
      }
      catch(e) {
        throw Error(`Problem obtaining image at ${s3Location}`);
      }
    };

  }
]);