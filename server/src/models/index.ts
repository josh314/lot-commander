/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Connection } from 'mongoose';

import * as appSetting from'./app-setting'
import * as pkg from './package';
import * as incomingShipment from './incoming-shipment';
import * as inventoryPallet from './inventory-pallet';
import * as bundle from './bundle';
import * as manifest from './manifest';
import * as shopifyOrder from './shopify-order';
import * as shopifyOrderPick from './shopify-order-pick';
import * as fallbackProductData from './fallback-product-data';
import * as productData from './product-data';

import { lotSchema } from './lot'
import { counterSchema } from './counter'
import { siteAnnouncementSchema } from './announcement'

class ModelCommander {

  private conn: Connection;
  private AppSetting;
  private IncomingShipment;
  private Package;
  private Bundle;
  private InventoryPallet;
  private Manifest;
  private ShopifyOrder;
  private ShopifyOrderPick;
  private FallbackProductData;
  private InternalProductData;

  private Lot
  private Counter
  private Announcement

  constructor( mongooseConnection: Connection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.AppSetting = mongooseConnection.model( 'AppSetting', appSetting.schema );
    this.IncomingShipment = mongooseConnection.model( 'IncomingShipment', incomingShipment.schema );
    this.Package = mongooseConnection.model( 'Package', pkg.schema );
    this.Bundle = mongooseConnection.model( 'Bundle', bundle.schema );
    this.InventoryPallet = mongooseConnection.model( 'InventoryPallet', inventoryPallet.schema );
    this.Manifest = mongooseConnection.model( 'Manifest', manifest.schema );
    this.ShopifyOrder = mongooseConnection.model( 'ShopifyOrder', shopifyOrder.schema );
    this.ShopifyOrderPick = mongooseConnection.model( 'ShopifyOrderPick', shopifyOrderPick.schema );
    this.FallbackProductData = mongooseConnection.model( 'FallbackProductData', fallbackProductData.schema );
    this.InternalProductData = mongooseConnection.model( 'InternalProductData', productData.schema, "internal-product-data" );

    this.Announcement = mongooseConnection.model( 'Announcement', siteAnnouncementSchema )
    this.Counter = mongooseConnection.model( 'Counter', counterSchema )
    this.Lot = mongooseConnection.model( 'Lot', lotSchema )

  }

}

module.exports = ModelCommander;
