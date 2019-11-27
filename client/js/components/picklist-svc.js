import 'angular';

import { Picklist } from '../picklist';

angular.module('myApp').factory('PicklistSvc', [ '$localStorage', 'api', function($localStorage, api) {

  const key = orderId => `picklist-${orderId}`;

  const svc = {
    getOrderPicklist: getOrderPicklist,
    getPickStatus: getPickStatus,
    // updatePickStatus: updatePickStatus,
    refresh: refresh,
  };
  return svc;

  function getCache(orderId) {
    return $localStorage[key(orderId)];
  }

  function store(orderId, picklist) {
    $localStorage[key(orderId)] = picklist;
  }

  function refresh(order) {
    return newPicklist(order);
  }

  function getOrderPicklist(order, refreshPicklist=false) {
    const cached = refreshPicklist ? undefined : getCache(order.orderId);
    if(cached) {
      return Promise.resolve( new Picklist(cached) );
    }
    return newPicklist(order);
  }

  function newPicklist(order) {

    const lotReqs = order.items.map(getOrderItemLot);

    return Promise.all(lotReqs).then(lots => {
      // TODO: handle rejected lot requests?

      const picklist = new Picklist( { lots: lots } );

      store(order.orderId, picklist);
      return picklist;
    });
  }

  function getOrderItemLot(orderItem) {
    if( orderItem.lineItemKey === 'discount' ) {
      return null;
    }
    //TODO: Everday bargains won't be in lot-db
    const lotHandle = orderItem.sku;
    return api.getLotByHandle(lotHandle);
  }

  function getPickStatus(orderId) {
    const cached = getCache(orderId);
    if(cached) {
      return cached.status;
    }
    else {
      return Picklist.status.READY;
    }
  }

  // function updatePickStatus(orderId) {
  //   const cached = getCache(orderId);
  //   if(cached) {

  //     const currentStatus = cached.status;
  //     const newStatus = cached.items.every( item => item.picked ) ? statusEnum.DONE : ( cached.items.some( item => item.picked ) ? statusEnum.PICKING : statusEnum.READY );

  //     if( currentStatus !== newStatus ) {
  //       cached.status = newStatus;
  //       store(orderId, cached);
  //     }

  //   }
  // }

  // function scanBarcode(barcode) {

  // }

  // Pick items functions. Not really useful unless we have specific barcodes for each shipping item. 
  //
  // function buildPickItemsFromLot(lot) {
  //   if( lot.shippingItems && lot.shippingItems.length ) {
  //     return buildPickItemsFromLotShippingItems(lot);
  //   }
  //   else if ( lot.numBoxes ) {
  //     return buildPickItemsFromLotNumBoxes(lot);
  //   }
  //   else {
  //     return buildPickItemsFromLotMissingShippingData(lot);
  //   }

  // }

  // function pickingItemBoilerplateFromLot(lot) {
  //   return {
  //     handle: lot.handle,
  //     title: lot.listingData.title,
  //   };
  // }

  // function buildPickItemsFromLotShippingItems(lot) {
  //   return lot.shippingItems.map( (_, idx) => {
  //     return Object.assign(
  //       {
  //         number: idx + 1,
  //         total: lot.shippingItems.length,
  //         weight: `${_.weight} ${_.weightUnits}`
  //       },
  //       pickingItemBoilerplateFromLot(lot)
  //     );
  //   });
  // }

  // function buildPickItemsFromLotNumBoxes(lot) {
  //   const pickItems = [];
  //   for(let i=0; i<lot.numBoxes; i++) {
  //     const item = Object.assign( { number: i+1, total: lot.numBoxes }, pickingItemBoilerplateFromLot(lot) );
  //     pickItems.push(item);
  //   }
  //   return pickItems;
  // }

  // function buildPickItemsFromLotMissingShippingData(lot) {
  //   return [
  //     pickingItemBoilerplateFromLot(lot)
  //   ];
  // }

}]);