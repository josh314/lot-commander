
  
const pkg = require('./package');
const incomingShipment = require('./incoming-shipment');
const inventoryPallet = require('./inventory-pallet');
const bundle = require('./bundle');
const lot = require('./lot');
const counter = require('./counter');
const shopifyOrder = require('./shopify-order');


class ModelCommander {

  constructor( mongooseConnection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.IncomingShipment = mongooseConnection.model('IncomingShipment', incomingShipment.schema);
    this.Package = mongooseConnection.model('Package', pkg.schema);
    this.Bundle = mongooseConnection.model('Bundle', bundle.schema);
    this.InventoryPallet = mongooseConnection.model('InventoryPallet', inventoryPallet.schema);
    this.Lot = mongooseConnection.model( 'Lot', lot.schema );
    this.Lot.enums = lot.enums;
    this.Counter = mongooseConnection.model( 'Counter', counter.schema );
    this.ShopifyOrder = mongooseConnection.model( 'ShopifyOrder', shopifyOrder.schema );

  }

}

module.exports = ModelCommander;
