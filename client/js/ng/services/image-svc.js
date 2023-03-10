import angular from "angular";

import errorImg from '../../../030-warning.svg';
import * as api from '../../api';

const urls = {
  upload: '/api/image/upload',
  remove: '/api/image/remove',
};

//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', '$localStorage', '$q', '$timeout', '$window', 'fileUpload',
  function( $http, $localStorage, $q, $timeout, $window, fileUpload ){
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

    svc.loadRepresentativeImage = async ( { images, containerId, className } ) => {
      let img;
      if(!images || !images.length) {
        img = new Image();
        img.src = errorImg;
      }
      else {
        img = await Promise.any( images.map( this.loadImageWithTimeoutAndPlaceholder(10000, errorImg) ) );
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

      const uploads = [];

      for( let image of images ) {
        uploads.push(
          fileUpload.uploadFileToUrl(image, urls.upload, { lotId: lot._id, primary: false })
        );
      }

      return Promise.all( uploads );

    };

    svc.updateLotPrimaryImage = (lot, image) => {
      return $q.when( api.setPrimaryLotImage( lot._id, image ) );
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