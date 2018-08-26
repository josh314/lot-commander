(function() {
  'use strict';
  /************************************************************************
  ************************ Angular app ************************************
  *************************************************************************/
  var app = angular.module('myApp');

  /******************* Provides utility function for verifying title length for different listing types ****/
  app.service('listingTitleVerifier', [function() {
    return {
      tooLong: title => {
        const res = {
          bstock: false,
          shopify: false,
        };

        if(title.length >= 68) {
          res.bstock = true;
        }
        return res;
      },
    };
  }]);
})();