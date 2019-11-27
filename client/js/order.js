

const statusEnum = {
  READY: 'ready',
  PICKING: 'picking',
  DONE: 'done'
};

const stores = {
  374627: "Wholesale Ninjas",
  374389: "Bstock"
};
const getChannelName = (id) => stores[id];

const displayDate = (date) => (new Date(date)).toLocaleString();


export class Order {

  constructor(params) {
    if(params.fromCache) {
      Object.assign(this, params.data);
    }
    else {
      this.id = params.data.orderId;
      this.number = params.data.orderNumber;
      this.date = params.data.orderDate;
      this.displayDate = displayDate(params.data.orderDate);
      this.channel = getChannelName(params.data.advancedOptions.storeId);
      this.lineItems = params.data.items;
      this.picklist = null;
    }
  }

  setPicklist(picklist) {
    if(picklist) {
      this.picklist = picklist;
    }
    return this;
  }

  scanBarcode(barcode) {
    
  }

}


Order.status = statusEnum;
