(function() {
  'use strict';
  /************************************************************************
  ************************ Angular app ************************************
  *************************************************************************/
  var app = angular.module('myApp');

  /******************* Open Auctions Controller *************************/
  app.controller('ListAuctionsCtrl', ['$http', '$scope', 'sessionTimeout',
    function($http, $scope, sessionTimeout) {   
      sessionTimeout.timeoutExpired();
      $scope.auctions = [];

      $scope.auctionStatusOptions = [ 'Open', 'Sold', 'Unsold', 'Cancelled' ];
      $scope.auctionStatus = 'Open';

      function updateAuctionList() {
        //TODO: sort by auction end date (or maybe update date)
        const query = {
          auction_status: $scope.auctionStatus,
        };
        $http.post('/api/bstock-db/auctions/get', query).then(resp=>{
          const auctions = resp.data;
          auctions.forEach((auction,idx,array)=>{
            auction.readableEndDate = (new Date(auction.auction_end_time)).toLocaleString();
            // auction.readableCreatedAt = (new Date(auction.createdAt)).toLocaleString();
          });
          $scope.auctions = auctions;
        });
      }
      updateAuctionList();

      $scope.update = updateAuctionList;
  }]);

  /******************* Finished Auctions Controller *************************/
  app.controller('FinishedAuctionsCtrl', ['$http', '$scope', 'sessionTimeout',
    function($http, $scope, sessionsTimeout) {   
      sessionTimeout.timeoutExpired();

  }]);
})();