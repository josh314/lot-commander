
const appSetting = require('./app-setting');
const pkg = require('./package');
const incomingShipment = require('./incoming-shipment');
const inventoryPallet = require('./inventory-pallet');
const bundle = require('./bundle');
const lot = require('./lot');
const manifest = require('./manifest');
const counter = require('./counter');
const shopifyOrder = require('./shopify-order');
const shopifyOrderPick = require( './shopify-order-pick' );
const fallbackProductData = require( './fallback-product-data' );


class ModelCommander {

  constructor( mongooseConnection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.AppSetting = mongooseConnection.model( 'AppSetting', appSetting.schema );
    this.IncomingShipment = mongooseConnection.model( 'IncomingShipment', incomingShipment.schema );
    this.Package = mongooseConnection.model( 'Package', pkg.schema );
    this.Bundle = mongooseConnection.model( 'Bundle', bundle.schema );
    this.InventoryPallet = mongooseConnection.model( 'InventoryPallet', inventoryPallet.schema );
    this.Lot = mongooseConnection.model( 'Lot', lot.schema );
    this.Manifest = mongooseConnection.model( 'Manifest', manifest.schema );
    this.Counter = mongooseConnection.model( 'Counter', counter.schema );
    this.ShopifyOrder = mongooseConnection.model( 'ShopifyOrder', shopifyOrder.schema );
    this.ShopifyOrderPick = mongooseConnection.model( 'ShopifyOrderPick', shopifyOrderPick.schema );
    this.FallbackProductData = mongooseConnection.model( 'FallbackProductData', fallbackProductData.schema );

  }

}

module.exports = ModelCommander;
