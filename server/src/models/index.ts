/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Connection } from 'mongoose';

import * as appSetting from'./app-setting'
import * as pkg from './package';
import * as incomingShipment from './incoming-shipment';
import * as inventoryPallet from './inventory-pallet';
import * as bundle from './bundle';
import * as lot from './lot';
import * as manifest from './manifest';
import { counterSchema } from './counter'
import * as shopifyOrder from './shopify-order';
import * as shopifyOrderPick from './shopify-order-pick';
import * as fallbackProductData from './fallback-product-data';
import { siteAnnouncementSchema } from './announcement';

import * as productData from './product-data';


class ModelCommander {

  private conn: Connection;
  private AppSetting;
  private IncomingShipment;
  private Package;
  private Bundle;
  private InventoryPallet;
  private Lot;
  private Manifest;
  private Counter;
  private ShopifyOrder;
  private ShopifyOrderPick;
  private FallbackProductData;
  private Announcement;
  private InternalProductData;

  constructor( mongooseConnection: Connection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.AppSetting = mongooseConnection.model( 'AppSetting', appSetting.schema );
    this.IncomingShipment = mongooseConnection.model( 'IncomingShipment', incomingShipment.schema );
    this.Package = mongooseConnection.model( 'Package', pkg.schema );
    this.Bundle = mongooseConnection.model( 'Bundle', bundle.schema );
    this.InventoryPallet = mongooseConnection.model( 'InventoryPallet', inventoryPallet.schema );
    this.Lot = mongooseConnection.model( 'Lot', lot.schema );
    this.Manifest = mongooseConnection.model( 'Manifest', manifest.schema );
    this.ShopifyOrder = mongooseConnection.model( 'ShopifyOrder', shopifyOrder.schema );
    this.ShopifyOrderPick = mongooseConnection.model( 'ShopifyOrderPick', shopifyOrderPick.schema );
    this.FallbackProductData = mongooseConnection.model( 'FallbackProductData', fallbackProductData.schema );

    this.Announcement = mongooseConnection.model( 'Announcement', siteAnnouncementSchema );
    this.Counter = mongooseConnection.model( 'Counter', counterSchema )

    this.InternalProductData = mongooseConnection.model( 'InternalProductData', productData.schema, "internal-product-data" );

  }

}

module.exports = ModelCommander;
