/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import type { Connection } from 'mongoose';

import * as appSetting from'./app-setting'
import * as incomingShipment from './incoming-shipment';
import * as inventoryPallet from './inventory-pallet';
import * as shopifyOrder from './shopify-order';
import * as shopifyOrderPick from './shopify-order-pick';

import { lotSchema, type LotData, type LotModel } from './lot'
import { counterSchema, type CounterData,type CounterModel } from './counter'
import { announcementSchema, type AnnouncementData, type AnnouncementModel } from './announcement'
import { packageSchema, type PackageData, type PackageModel } from './package'
import { bundleSchema, type BundleData, type BundleModel } from './bundle'
import { productSchema, type ProductData, type ProductModel } from './product'
import { fallbackProductSchema, type FallbackProductData, type FallbackProductModel } from './fallback-product'
import { manifestSchema, type ManifestData, type ManifestModel } from './manifest'

class ModelCommander {

  private AppSetting;
  private IncomingShipment;
  private InventoryPallet;
  private ShopifyOrder;
  private ShopifyOrderPick;

  private conn: Connection
  private Lot: LotModel
  private Counter: CounterModel
  private Announcement: AnnouncementModel
  private Package: PackageModel
  private Bundle: BundleModel
  private InternalProductData: ProductModel
  private FallbackProductData: FallbackProductModel
  private Manifest: ManifestModel

  constructor( mongooseConnection: Connection ) {
    this.conn = mongooseConnection;

    // initialize models
    this.AppSetting = mongooseConnection.model( 'AppSetting', appSetting.schema );
    this.IncomingShipment = mongooseConnection.model( 'IncomingShipment', incomingShipment.schema );
    this.InventoryPallet = mongooseConnection.model( 'InventoryPallet', inventoryPallet.schema );
    this.ShopifyOrder = mongooseConnection.model( 'ShopifyOrder', shopifyOrder.schema );
    this.ShopifyOrderPick = mongooseConnection.model( 'ShopifyOrderPick', shopifyOrderPick.schema );

    this.Announcement = mongooseConnection.model<AnnouncementData, AnnouncementModel>( 'Announcement', announcementSchema )
    this.Counter = mongooseConnection.model<CounterData, CounterModel>( 'Counter', counterSchema )
    this.Lot = mongooseConnection.model<LotData, LotModel>( 'Lot', lotSchema )
    this.Package = mongooseConnection.model<PackageData, PackageModel>( 'Package', packageSchema )
    this.Bundle = mongooseConnection.model<BundleData, BundleModel>( 'Bundle', bundleSchema )
    this.InternalProductData = mongooseConnection.model<ProductData, ProductModel>( 'InternalProductData', productSchema, "internal-product-data" )
    this.FallbackProductData = mongooseConnection.model<FallbackProductData, FallbackProductModel>( 'FallbackProductData', fallbackProductSchema )
    this.Manifest = mongooseConnection.model<ManifestData, ManifestModel>( 'Manifest', manifestSchema )

  }

}

module.exports = ModelCommander;
