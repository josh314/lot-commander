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

      $scope.auctionStatusOptions = [ 'All', 'Open', 'Sold', 'Unsold', 'Cancelled' ];
      $scope.auctionStatus = 'Open';

      function updateAuctionList() {
        //TODO: sort by auction end date (or maybe update date)
        const query = {
          auction_status: $scope.auctionStatus==='All' ? undefined : $scope.auctionStatus,
          lot_id: $scope.auctionLotId,
        };
        $http.post('/api/bstock-db/auctions/get', query).then(resp=>{
          const auctions = resp.data;
          auctions.forEach((auction,idx,array)=>{
            auction.readableEndDate = (new Date(auction.auction_end_time)).toLocaleString();
            auction.readableStartDate = (new Date(auction.auction_start_time)).toLocaleString();
          });
          $scope.auctions = auctions;
          for(let auction of auctions) {
            $http.post(`/api/db/get/`, {handle: auction.lot_id}).then(resp=>{
              if(resp.data && resp.data.length) {
                auction.inLotDb = true;
                auction.lotDbId = resp.data[0]._id;
              }
            })
          }
        })
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