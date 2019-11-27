import 'angular';
import * as Promise from "bluebird";

import { Order } from '../order';


angular.module('myApp').factory('OrderSvc', [ '$stateParams', 'api', 'OrderCache',
  function( $stateParams , api, OrderCache ) { 

    return {
      getOrder: getOrder,
      getPendingOrdersList: getPendingOrdersList
    };

    function getPendingOrdersList(page) {
      return api.getOrders(page).then(ordersResponse => {
        if(ordersResponse) {
          const ordersP = ordersResponse.map( o => getOrder( { orderId: o.orderId, buildPicklist: false } ) );
          return Promise.all(ordersP);
        }
      });
    }


    function getOrder( params = {} ) {

      let orderId = params.orderId;

      if(!orderId) {
        orderId = $stateParams.orderId;
      }

      const cachedOrder = OrderCache.get(orderId);

      let orderP;
      if(cachedOrder) {
        orderP = Promise.resolve(new Order( { data: cachedOrder, fromCache: true } ) );
      }
      else {
        orderP = api.getOrderById(orderId).then(apiOrderResp => {
          if(!apiOrderResp) {
            throw new Error(`Can't find Shipstation Order for id ${orderId}.`);
          }

          const order = new Order( { data: apiOrderResp } );

          OrderCache.store(orderId, order);

          return order;
        });
      }

      return orderP
        .then( order => params.buildPicklist ? buildPicklist(order) : Promise.resolve(order) )
        .then( order => OrderCache.store(orderId, order) /* store */ )
    }


    // Note: something about the Promise.all in this function requires a manual $digest cycle downstream. 
    function buildPicklist(order) { 

      const lotReqs = order.lineItems.map(getOrderItemLot);
  
      return Promise.all(lotReqs).then(lots => {
        // TODO: handle rejected lot requests?
  
        const picklist = lots.filter( _ => _).map( lot => {

          if(lot.error) {
            throw new Error('fuck');
          }
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
            total: num,
            scanned: 0,
            picked: false
          };
        });

        return order.setPicklist(picklist);
        // return order;
      });
    }
  
    function getOrderItemLot(linItem) {
      if( linItem.lineItemKey === 'discount' ) {
        return null;
      }
      //TODO: Everday bargains won't be in lot-db
      const lotHandle = linItem.sku;
      return api.getLotByHandle(lotHandle);
    }

    // function refreshPicklist(orderId) {
    //   return getOrder(orderId, true);
    // }

  }
]);
