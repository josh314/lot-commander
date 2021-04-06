const config = require('../server/config');

const mongoSettings = config.dbHosts.mongo;

const mongoose = require('mongoose');
const Promise = require('bluebird');
mongoose.promise = Promise;

class DbClient {

  constructor(){}

  async init() {

    this.mongoClient = await (async ( { host, port, dbName, user, password } ) => {

      const location = `${host}:${ port || 27017 }/${dbName}`;
      
      const MongoClient = mongoose.mongo.MongoClient;
      const client = new MongoClient(
        `mongodb://${ user && password ? `${user}:${password}@` : ''}${location}`,
        {
          useNewUrlParser: true,
          useUnifiedTopology: true
        }
      );
    
      console.log(`Connecting to MongoDb at ${location}`);
      await client.connect();

      return client;

    })({
      host: mongoSettings.host,
      port: mongoSettings.port,
      dbName: mongoSettings.db,
      user: mongoSettings.auth && mongoSettings.auth.user,
      password: mongoSettings.auth && mongoSettings.auth.pwd,
    });

    this.db = this.mongoClient.db('ehdb');

  }

  close() {
    this.mongoClient.close();
  }

  getVariantShippingMetafields( variantId ) {

    const searchDoc = {
      'data.namespace': 'shipping',
      'data.ownerType': 'product-variant',
      'data.ownerId': variantId
    };

    return this.db.collection('shopify-metafields-product-variants').findOne( searchDoc );
  }

  async dumpShopifyOrders() { 

    const orders = (await this.db.collection('shopify-orders').find({}).toArray()).map( _ => _.data );

    await Promise.each( orders, async (order) => {

      const metafield = await getVariantShippingMetafields( order );

      if( metafield ) {
        // TODO: check which kind of metafield (numBoxes, shippingItems)

        // TODO: store relevant shipping metafield data directly on `order`

      }

    });

    return orders;

  }

  saveLocalOrder( order ) {
    return this.db.collection('orders').insertOne( order );
  }

}

function processShopifyLineItem( shopifyLineItem ) {

  // TODO: numBoxes, numPallets, numShippingItems

  const li = {
    title: shopifyLineItem.title,
    sku: shopifyLineItem.sku,
    isPicked: false,
  };

  const units = parseInt( shopifyLineItem.variant_title );
  if( units ) {
    li.units = units;
  }

  return li;
}

function getName( obj ) {

  if( !obj ) {
    return '';
  }

  if( obj.first_name && obj.last_name ) {
    return `${obj.first_name} ${obj.last_name}`;
  }
  else if ( obj.first_name ) {
    return obj.first_name;
  }
  else if ( obj.last_name ) {
    return obj.last_name;
  }

}

function shopifyOrder2LocalOrder( shopifyOrder ) {

  const order = {

    handle: shopifyOrder.name,

    source: 'shopify', // The discriminator key

    shopifyOrderId: shopifyOrder.id,

    orderDate: new Date ( shopifyOrder.processed_at ),

    customer: {},
    shopifyCustomerId: null,

    address: {},
    shippingType: shopifyOrder.shipping_lines[0] ? 
                    shopifyOrder.shipping_lines[0].title :
                    '',

    lineItems: shopifyOrder.line_items
                .reduce( (acc,li)=> acc.concat( Array( li.quantity ).fill( li ) ), []) // unwind based on line_item quantity 
                .map( processShopifyLineItem ), 

    fulfillments: [],

    isShipped: false,
    isDeleted: false,

  };

  if( shopifyOrder.customer ) {

    order.shopifyCustomerId = shopifyOrder.customer.id;

    order.customer.name = getName( shopifyOrder.customer );
    order.customer.email = shopifyOrder.customer.email

  }

  if( shopifyOrder.shipping_address ) {

    order.customer.phone = shopifyOrder.shipping_address.phone;

    order.address.name = getName( shopifyOrder.shipping_address ); // Can differ from customer.name
    order.address.street1 = shopifyOrder.shipping_address.address1;
    order.address.street2 = shopifyOrder.shipping_address.address2;
    order.address.state = shopifyOrder.shipping_address.province_code;
    order.address.zip = shopifyOrder.shipping_address.zip;

  }

  if( shopifyOrder.closed_at ) {

    order.isShipped = true;
    order.shippedDate = new Date( shopifyOrder.closed_at ); 
    order.lineItems.forEach( li => li.isPicked = true );

  }

  return order;

}

const run = async ( client ) => {

  await client.init();
  
  const shopifyOrders = await client.dumpShopifyOrders();

  const localOrders = shopifyOrders.map( shopifyOrder2LocalOrder );

  await Promise.map( localOrders, client.saveLocalOrder.bind(client) );

}


const client = new DbClient();

run( client )
  .then( resp => resp && console.log(resp) )
  .catch( console.err )
  .finally( () => {
    console.log('Closing mongo connection...')
    client.close();
  });