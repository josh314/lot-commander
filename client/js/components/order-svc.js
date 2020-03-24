// TODO: handle all cases:
//  [] everyday bargains
//  [] cancelled orders
//  [] draft orders (no line items)
//  [] modified orders
//  [] bstock orders

import 'angular';
import * as Promise from "bluebird";

import { Order } from '../order';

import * as api from '../api';


angular.module('myApp').factory('OrderSvc', [ '$q', '$stateParams', 'OrderCache',
  function( $q, $stateParams , OrderCache ) { 

    return {
      cache: OrderCache,
      getOrder: getOrder,
      getPendingOrdersList: getPendingOrdersList,
      refreshOrder: refreshOrder,
    };

    function getPendingOrdersList(page) {
      return $q.when( api.getOrders(page) ).then(ordersResponse => {
        if(ordersResponse) {
          const ordersP = ordersResponse.map( o => getOrder( { orderId: o.orderId, buildPicklist: false } ) );
          return Promise.all(ordersP);
        }
      });
    }

    //
    function getOrder( params = {} ) {

      let orderId = params.orderId;

      if(!orderId) {
        orderId = $stateParams.orderId;
      }

      const cachedOrder = params.ignoreCache ? null : OrderCache.get(orderId) ;

      let orderP;
      if(cachedOrder) {
        console.log(`retrieving orderId ${orderId} from cache`);
        orderP = Promise.resolve(new Order( { data: cachedOrder, fromCache: true } ) );
      }
      else {
        orderP = $q.when( api.getOrderById(orderId) ).then(apiOrderResp => {
          if(!apiOrderResp) {
            throw new Error(`Can't find Shipstation Order for id ${orderId}.`);
          }

          const order = new Order( { data: apiOrderResp } );

          OrderCache.store(order);
          return order;
        });
      }

      return orderP
        .then( order => !order.picklist && params.buildPicklist ? buildPicklist(order) : Promise.resolve(order) )
        .then( order => OrderCache.store(order) );
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
      if(lotHandle) {
        return $q.when( api.getLotByHandle(lotHandle) );
      }
      else {
        return Promise.resolve({ listingData: { title: lineItem.name } });
      }
    }

    function refreshOrder(orderId) {
      return getOrder({
        orderId: orderId,
        ignoreCache: true,
        buildPicklist: true,
      });
    }

  }
]);
