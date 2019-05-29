import app from '../ng-app';

/******************* Provides utility function for verifying title length for different listing types ****/
app.service('listingTitleVerifier', [function() {
  return {
    tooLong: title => {
      const res = {
        bstock: false,
        shopify: false,
      };

      if(title && title.length >= 68) {
        res.bstock = true;
      }
      if(title && title.length >= 96) {
        res.shopify = true;
      }
      return res;
    },
  };
}]);
