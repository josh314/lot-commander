import angular from 'angular';

import * as api from '../../api';

/******************* Open Auctions Controller *************************/
angular.module('myApp').controller('ListAuctionsCtrl', [ 'LotSvc', 'sessionTimeout',
  function( LotSvc, sessionTimeout ) {
    sessionTimeout.timeoutExpired();

    const vm = this;

    vm.auctions = [];
    vm.auctionStatusOptions = [ 'All', 'Open', 'Sold', 'Unsold', 'Cancelled' ];
    vm.auctionStatus = 'Open';

    vm.update = updateAuctionList;

    function updateAuctionList() {
      //TODO: sort by auction end date (or maybe update date)
      const query = {
        auction_status: vm.auctionStatus==='All' ? undefined : vm.auctionStatus,
        lot_id: vm.auctionLotId,
      };
      api.listAuctions( query ).then( auctions =>{

        vm.auctions = auctions;

        auctions.forEach((auction)=>{
          auction.readableEndDate = (new Date(auction.auction_end_time)).toLocaleString();
          auction.readableStartDate = (new Date(auction.auction_start_time)).toLocaleString();
        });

        for(let auction of auctions) {
          LotSvc.list( { handle: auction.lot_id } ).then( lots =>{
            if( lots.length ) {
              auction.inLotDb = true;
              auction.lotDbId = lots[0]._id;
            }
          });
        }

      });
    }
    updateAuctionList();
  }
]);

/******************* Finished Auctions Controller *************************/
angular.module('myApp').controller('FinishedAuctionsCtrl', ['sessionTimeout', sessionTimeout => sessionTimeout.timeoutExpired() ]);
