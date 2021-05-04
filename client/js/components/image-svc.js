import angular from "angular";
import * as Promise from "bluebird";

import errorImg from '../../030-warning.svg';

const urls = {
  upload: '/api/image/upload',
  setPrimary: '/api/image/primary',
  remove: '/api/image/remove',
};

//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', '$localStorage', '$timeout', '$window', 'fileUpload', 
  function($http, $localStorage, $timeout, $window, fileUpload){
    const svc = this;

    /**
    * Returns a function which loads an image.
    * 
    * @param {number} timeout - how long to wait for image to load before giving up (in milliseconds)
    * @param {string} [placeholderImg] - an image to use as a placeholder if the requested image is not found
    */
    svc.loadImageWithTimeoutAndPlaceholder = (timeout, placeholderImg) => {
      /**
      * Returns an image object or null.
      * @function
      * @param {number} imageUrl - link to image
      */
      return (imageUrl) => {
        return new Promise( resolve => {
          // create img container
          const img = new Image();

          // create a timeout in case image ain't found quickly
          const killImg = $timeout(() => {
            img.removeAttribute('src');

            if(placeholderImg) {
              img.src = placeholderImg;
              resolve(img);
            }
            else { 
              resolve(null);
            }
            // reject(new Error('fuck'));
          }, timeout || 1000);

          img.onload = () => {
            // cancel the timeout if loaded
            $timeout.cancel(killImg);
            resolve(img);
          };

          img.src = imageUrl;
        });
      };
    };

    svc.loadRepresentativeImage = async (opts={}) => {
      const { images, containerId, className} = opts;
      let img;
      if(!images || !images.length) {
        img = new Image();
        img.src = errorImg; 
      }
      else {
        img = await Promise.any( images.map( this.loadImageWithTimeoutAndPlaceholder(1000, errorImg) ) );
      }

      img.className = className || '';

      if(containerId) {
        const parent = $window.document.getElementById(containerId);
        parent.appendChild(img);
      }
      else {
        return img;
      }
    };

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

    svc.getImageList = ( { urlEncode } = { urlEncode: false }  ) => {
      try {
        return $http.get(`/api/image/list?url_encode=${ urlEncode ? 1 : 0 }`).then( _ => _.data );
      }
      catch(e) {
        throw Error(`Problem obtaining images`);
      }
    };

    svc.parseS3Location = (s3Location) => {
      const res = {};

      const p = /https:\/\/(.*)\.s3\.amazonaws\.com\/(.*)\/(.*)/;
      const match = s3Location.match(p);
      if(match) {
        res.bucket = match[1];
        res.lotId = match[2];
        res.imgName = match[3] && decodeURIComponent(match[3]);
        res.key = `${res.lotId}/${res.imgName}`;
      }

      return res;
    };
  }
]);