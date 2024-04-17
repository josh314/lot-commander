import angular from "angular";

import errorImg from '../../../030-warning.svg';
import * as api from '../../api';


//************* Images service
angular.module('myApp').service('ImageSvc', ['$http', '$localStorage', '$q', '$timeout', '$window',
  function( $http, $localStorage, $q, $timeout, $window ){
    const svc = this;

    /**
    * Returns a function which loads an image.
    *
    * @param {number} timeout - how long to wait for image to load before giving up (in milliseconds)
    * @param {string} [placeholderImg] - an image to use as a placeholder if the requested image is not found
    * @param {boolean} [proxy] - whether to use the proxy endpoint to load the image
    */
    svc.loadImageWithTimeoutAndPlaceholder = (timeout, placeholderImg, proxy = false ) => {
      /**
      * Returns an image object or null.
      * @function
      * @param {string} imageUrl - link to image
      */
      return (imageUrl) => {
        return new Promise( ( resolve, reject ) => {
          // create img container
          const img = new Image();

          const src = proxy ? `/api/image/proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;
          if( proxy ) {
            img.crossOrigin = 'anonymous';
          }

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
          img.onerror = reject;

          img.src = src;
        });
      };
    };

    svc.loadRepresentativeImage = ( { images, containerId, className } ) => {

      // using $timeout forces a tick in the digest cycle which ensures that the parent containers have been created from recent changes in the model
      return $timeout( async () => {

        if( !containerId ) {
          return;
        }

        const itemContainer = $window.document.getElementById(containerId);

        // return if there is already a representative image.
        let representativeImg = itemContainer.querySelector('img.representative-img');
        if( representativeImg ) {
          return;
        }

        let img;
        if(!images || !images.length) {
          img = new Image();
          img.src = errorImg;
        }
        else {
          img = await Promise.any( images.map( this.loadImageWithTimeoutAndPlaceholder(10000, errorImg) ) );
        }

        img.className = `representative-img${ className ? ` ${ className}` : ''}`;

        // check once more for representative image before adding
        representativeImg = itemContainer.querySelector('img.representative-img');
        if( !representativeImg ) {
          itemContainer.appendChild(img);
        }

      }, 1);

    };

    svc.uploadLotImages = ( lotId, images ) => {

      return $q.when( api.uploadLotImage( lotId, images ) );

    };

    svc.uploadLotImage = ( lotId, image, primary = false ) => {

      return $q.when( api.uploadLotImage( lotId, image, primary) );

    };

    svc.updateLotPrimaryImage = ( lotId, imageId ) => {
      return $q.when( api.setPrimaryLotImage( lotId, imageId ) );
    };

    svc.removeLotImage = async ( lotId, image ) => {
      return $q.when( api.removeLotImage( lotId, image ) );
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

    svc.uploadPalletImages = ( palletId, images ) => {

      return $q.when( api.uploadPalletImages( palletId, images ) );

    };

    svc.uploadPalletSplitGroupImages = ( palletId, splitGroupId, images ) => {

      return $q.when( api.uploadPalletSplitGroupImages( palletId, splitGroupId, images ) );

    };

    svc.removePalletImage = async ( palletId, image ) => {
      return $q.when( api.removePalletImage( palletId, image ) );
    };

    svc.removePalletSplitGroupImage = async ( palletId, splitGroupId, image ) => {
      return $q.when( api.removePalletSplitGroupImage( palletId, splitGroupId, image ) );
    };

    svc.getImageLink = image => image.s3 ? `/api/image/?s3=${encodeURIComponent(image.s3)}` : image.filename;

    svc.cleanImageObject = imageObj => ({
      _id: imageObj._id,
      s3: imageObj.s3,
      filename: imageObj.filename,
      primary: imageObj.primary
    });

    svc.renderLotCollage = lotId => $q.when( api.renderLotCollage( lotId ) );
  }
]);