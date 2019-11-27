

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

const buildPickItemFromLot = (lot) => {

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
};


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
      this.status = statusEnum.READY;
      this.picklist = null;
    }
  }


  buildPicklist(lots) {
    const picklist = lots.filter( _ => _).map( buildPickItemFromLot );
    return this.setPicklist(picklist);
  }

  setPicklist(picklist) {
    if(picklist) {
      this.picklist = picklist;
    }
    return this;
  }

  pickItem(barcode) {
    const found = this.picklist.find( pickItem => pickItem.handle === barcode );
    if(found) {
      if(found.total > found.scanned) {
        found.scanned += 1;
        if( found.total === found.scanned ) {
          found.picked = true;
        }
        this.updatePickStatus();
        return true;
      }
    }
    return false;
  }

  markItemAsPicked(index) {
    const item = this.picklist[index];
    if(item) {
      console.log(`Manually marking item as picked: ${item.title}`);
      item.picked = true;
      this.updatePickStatus();
      return true;
    }
    else {
      return false;
    }
  }

  updatePickStatus() {
    if(this.picklist) {
      const currentStatus = this.status;
      const newStatus = this.picklist.every( item => item.picked ) ? statusEnum.DONE : ( this.picklist.some( item => item.picked ) ? statusEnum.PICKING : statusEnum.READY );
      if( currentStatus !== newStatus ) {
        this.status = newStatus;
      }
    }
    return this.status;
  }

}

Order.status = statusEnum;

