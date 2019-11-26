import 'angular';


const stores = {
  374627: "Wholesale Ninjas",
  374389: "Bstock"
};
const getChannelName = (id) => stores[id];

const readableDate = (date) => (new Date(date)).toLocaleString();


angular.module('myApp').factory('OrderSvc', [ '$stateParams', 'api', 'PicklistSvc',
  function( $stateParams , api , PicklistSvc ) { 

    return {
      getOrder: getOrder,
      getPendingOrdersList: getPendingOrdersList,
      refreshPicklist: refreshPicklist,
    };

    function getOrder(orderId, refreshPicklist=false) {

      if(!orderId) {
        orderId = $stateParams.orderId;
      }

      return api.getOrderById(orderId).then(order => {
        if(!order) {
          throw new Error(`Can't find Shipstation Order for id ${orderId}.`);
        }
        return PicklistSvc.getOrderPicklist(order, refreshPicklist).then( picklist => {
          return {
            id: order.orderId,
            number: order.orderNumber,
            channel: getChannelName(order.advancedOptions.storeId),
            date: readableDate(order.orderDate),
            picklist: picklist,
          };

        });
      });

    }

    function getPendingOrdersList(page) {
      return api.getOrders(page).then(orders => {
        if(orders) {
          return orders.map( o => {
            return {
              id: o.orderId,
              number: o.orderNumber,
              date: readableDate(o.orderDate),
              status: PicklistSvc.getPickStatus(o.orderId),
              channel: getChannelName(o.advancedOptions.storeId)
            };
          });
        }
      });
    }

    function refreshPicklist(orderId) {
      return getOrder(orderId, true);
    }

  }
]);
