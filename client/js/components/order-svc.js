import 'angular';
import * as Promise from "bluebird";

import { Order } from '../order';


angular.module('myApp').factory('OrderSvc', [ '$stateParams', 'api', 'OrderCache',
  function( $stateParams , api, OrderCache ) { 

    return {
      cache: OrderCache,
      getOrder: getOrder,
      getPendingOrdersList: getPendingOrdersList,
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
        console.log(`retrieving orderId ${orderId} from cache`)
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

      // TODO: the below sequesnce is overwriting active cash on every page reload
      return orderP
        .then( order => !order.picklist && params.buildPicklist ? buildPicklist(order) : Promise.resolve(order) )
        .then( order => OrderCache.store(orderId, order) /* store */ )
    }


    // Note: something about the Promise.all in this function requires a manual $digest cycle downstream. 
    function buildPicklist(order) { 

      const lotReqs = order.lineItems.map(getOrderItemLot);
  
      return Promise.all(lotReqs).then(lots => {
        // TODO: handle rejected lot requests?
        return order.buildPicklist(lots);
      });
    }
  
    function getOrderItemLot(lineItem) {
      if( lineItem.lineItemKey === 'discount' ) {
        return null;
      }
      //TODO: Everday bargains won't be in lot-db
      const lotHandle = lineItem.sku;
      return api.getLotByHandle(lotHandle);
    }

    // function refreshPicklist(orderId) {
    //   return getOrder(orderId, true);
    // }

  }
]);
