import angular from "angular";
import * as path from 'path';

import errorImg from '../../../030-warning.svg';
import * as api from '../../api';

/******************************************************
 * Helpers & constants
 * ===================
 *
 ***********/

const __IMAGE_FILE_EXT__ = [
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".svg",
  ".webp",
  ".heic",
  ".heif",
  ".raw"
];

const __VIDEO_FILE_EXT__ = [
  ".mp4",
  ".avi",
  ".mkv",
  ".mov",
  ".wmv",
  ".flv",
  ".m4v",
  ".webm",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".3g2",
  ".ogv",
  ".mts",
  ".m2ts"
];

function isImageFile( filename ) {
  const ext = path.extname(filename).toLowerCase();
  return __IMAGE_FILE_EXT__.includes(ext);
}
function isVideoFile( filename ) {
  const ext = path.extname(filename).toLowerCase();
  return __VIDEO_FILE_EXT__.includes(ext);
}

//************* Media service
angular.module('myApp').service( 'MediaSvc', [ '$localStorage', '$q', '$timeout', '$window',
  function( $localStorage, $q, $timeout, $window ){
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

          const src = proxy ? `/api/media/proxy?url=${encodeURIComponent(imageUrl)}` : imageUrl;
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

    svc.isImageFile = isImageFile;
    svc.isVideoFile = isVideoFile;

    svc.loadRepresentativeImage = ( { images, containerId, className } ) => {

      // using $timeout forces a tick in the digest cycle which ensures that the parent containers have been created from recent changes in the model
      return $timeout( async () => {

        let itemContainer;
        if( containerId ) {
          itemContainer = $window.document.getElementById(containerId);

          if( !itemContainer ) {
            return;
          }

          // return if there is already a representative image.
          if( itemContainer.querySelector('img.representative-img') ) {
            return;
          }
        }

        let img;
        if(!images || !images.length) {
          img = new Image();
          img.src = errorImg;
        }
        else {
          img = await Promise.any( images.map( this.loadImageWithTimeoutAndPlaceholder(10000, errorImg) ) );
        }

        if( containerId ) {
          img.className = `representative-img${ className ? ` ${ className}` : ''}`;

          // check once more for representative image before adding
          const representativeImg = itemContainer.querySelector('img.representative-img');
          if( !representativeImg ) {
            itemContainer.appendChild(img);
          }
        }

        return img;

      }, 1);

    };

    svc.uploadLotImages = ( lotId, images ) => {

      return $q.when( api.uploadLotImage( lotId, images ) );

    };

    svc.uploadLotImage = ( lotId, image, primary = false ) => {

      return $q.when( api.uploadLotImage( lotId, image, primary) );

    };

    svc.uploadLotMultipleMedia = ( lotId, mediaArray, mediaType ) => {

      return $q.when( api.uploadLotMedia( lotId, mediaArray, mediaType ) );

    };

    svc.uploadLotMedia = ( lotId, media, mediaType, primary = false ) => {

      return $q.when( api.uploadLotMedia( lotId, media, mediaType, primary) );

    };

    svc.updateLotPrimaryMedia = ( lotId, mediaId, mediaType ) => {
      return $q.when( api.setPrimaryLotMedia( lotId, mediaId, mediaType ) );
    };

    svc.removeLotMedia = async ( lotId, media, mediaType ) => {
      return $q.when( api.removeLotMedia( lotId, media, mediaType ) );
    };

    svc.getStore = () => $localStorage.image;

    svc.setStore = (image) => $localStorage.image = image;

    svc.resetStore = () => delete $localStorage.image;

    svc.getImageList = ( { urlEncode } = { urlEncode: false }  ) => $q.when( api.listImages( { urlEncode } ) );

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

    svc.getMediaLink = media => media.s3 ? `/api/media/?s3=${ encodeURIComponent( media.s3 ) }` : media.filename;
    svc.getImageLink = this.getMediaLink;

    svc.cleanImageObject = imageObj => ({
      _id: imageObj._id,
      s3: imageObj.s3,
      filename: imageObj.filename,
      primary: imageObj.primary
    });

    svc.renderLotCollage = lotId => $q.when( api.renderLotCollage( lotId ) );
  }
]);