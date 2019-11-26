import 'angular';

angular.module('myApp').factory('PicklistSvc', [ '$localStorage', 'api', function($localStorage, api) {

  const statusEnum = {
    READY: 'ready',
    PICKING: 'picking',
    DONE: 'done'
  };

  const key = orderId => `picklist-${orderId}`;

  const svc = {
    statuses: statusEnum,
    getOrderPicklist: getOrderPicklist,
    getPickStatus: getPickStatus,
    updatePickStatus: updatePickStatus,
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
      return Promise.resolve(cached);
    }
    return newPicklist(order);
  }

  function newPicklist(order) {
    const picklist = {
      status: statusEnum.READY
    };
    const lotReqs = order.items.map(getOrderItemLot);

    return Promise.all(lotReqs).then(lots => {
      // TODO: handle rejected lot requests?


      // TODO: Make separate barcodes for each shipping item and create individual pick item for each:
      // picklist.items = lots.filter( _ => _ ).reduce( (items, lot) => items.concat(buildPickItemsFromLot(lot)) , []);

      // For now, we just use a single pick item for each lot
      picklist.items = lots.filter( _ => _).map( lot => {
        let num;

        if( lot.shippingItems && lot.shippingItems.length ) {
          num = lot.shippingItems.length;
        }
        else if ( lot.numBoxes ) {
          num = lot.numBoxes;
        }
        else {
          num = null;
        }

        return {
          handle: lot.handle,
          title: lot.listingData.title,
          quantity: num
        };
      });

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
      return statusEnum.READY;
    }
  }

  function updatePickStatus(orderId) {
    const cached = getCache(orderId);
    if(cached) {

      const currentStatus = cached.status;
      const newStatus = cached.items.every( item => item.picked ) ? statusEnum.DONE : ( cached.items.some( item => item.picked ) ? statusEnum.PICKING : statusEnum.READY );

      if( currentStatus !== newStatus ) {
        cached.status = newStatus;
        store(orderId, cached);
      }

    }
  }

  function scanBarcode(barcode) {

  }

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