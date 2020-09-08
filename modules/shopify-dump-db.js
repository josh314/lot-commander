const util = require('util')
const stream = require('stream')
const Transform = stream.Transform

util.inherits(Stringer, Transform)

function Stringer() {
  Transform.call(this, { objectMode: true } )
  // 'object mode allows us to consume one object at a time
}

Stringer.prototype._transform = function(chunk, encoding, cb) {
  const pretty = JSON.stringify(chunk, null, 2);
  this.push(pretty); // 'push' method sends data down the pike.
  cb(); // callback tells the incoming stream we're done processing 
};

// Pipeline object for ranged search on a field
const rangeFilterObject = ( field, start, end ) => {
  const rangeLimits = [];
  if( start ) {
    rangeLimits.push({ [field]: { $gt: start } });
  }
  if( end ) {
    rangeLimits.push({ [field]: { $lt: end } });
  }

  return {
    $match: { $and: rangeLimits }
  }
}

// Pipeline functions for date parsing and assembling
const dateProject = ( dateExpression, binSize ) => {
  const o = {};
  if( binSize == 'month' || binSize == 'day' ) {
    o.year = {
      $year: dateExpression
    };
    o.month = {
      $month: dateExpression
    };
  }
  else if( binSize == 'week' ) {
    o.isoWeekYear = {
      $isoWeekYear: dateExpression
    };
    o.isoWeek = {
      $isoWeek: dateExpression
    }
  }

  if( binSize == 'day' ) {
    o.day = {
      $dayOfMonth: dateExpression
    };
  }
  return o;
};

const dateFromParts = ( binSize ) =>  {
  const o = {
    timezone: 'America/New_York'
  };
  if( binSize == 'month' || binSize == 'day' ) {
    o.year = "$year";
    o.month = "$month";
  }
  else if( binSize == 'week' ) {
    o.isoWeekYear = "$isoWeekYear";
    o.isoWeek = "$isoWeek";
  }

  if( binSize == 'day' ) {
    o.day = "$day"
  }
  return o;
};

const tagParseObject = ( tagField ) => ({
  tags: { // Splits the csv tag string and trims whitespace
    $map: { 
      input: { $split: [ "$product.data.tags", ',' ]  },
      as: "tag",
      in: { $trim: { input: "$$tag" } }
    }            
  }
});

const tagFilterObject = tag => ({
  $match: { tags: new RegExp(`${tag}`, 'i')  }
});

class DbClient {
  
  constructor( mongoDb ) {
    this.collections = {
      checkouts: 'shopify-checkouts',
      customers: 'shopify-customers',
      orders: 'shopify-orders',
      products: 'shopify-products',
    };

    this.db = mongoDb;
  }

  getOrderHistory({ start, end, query, limit, skip }) {

    const findOpts = {

    };

    if( start ) {
      findOpts["data.created_at"] = { $gt: start };
    }
    if( end ) {
      findOpts["data.created_at"] = { $lt: end };
    }

    let cursor = this.db.collection( this.collections.orders ).find( findOpts )

    if(limit) {
      cursor = cursor.limit(limit);
    }
    if(skip) {
      cursor = cursor.skip(skip);
    }

    return cursor.pipe( new Stringer() );

  }

  unitsSold( { start, end, tag, dateBinSize } ) {

    const pipeline = [
      // Start a pipeline with a date range search
      ... ( start || end ) ? [ rangeFilterObject( "data.created_at", start, end ) ] : [],
      // flatten the line_items array to create one document for each line_item
      {
        $unwind: "$data.line_items"
      },
      // keep only the number of units and reference to the product
      {
        $project: {
          _id: false,
          product_id: "$data.line_items.product_id",
          units: "$data.line_items.variant_title",
          quantity: "$data.line_items.quantity",
          date: "$data.created_at"
        }
      },
      // add product data from the products collection
      {
        $lookup: {
          from: "shopify-products",
          localField: "product_id",
          foreignField: "data.id",
          as: "product"
        }
      },
      // it comes as an array so flatten that
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true
        }
      },
      // project down to just the data we need in the report, doing some data transformations along the way
      {
        $project: {
          ...tagParseObject("$product.data.tags"),
          units: { 
            $multiply: [
              {
                $convert: { 
                  input: "$units",
                  to: "int",
                  onError: 0,
                  onNull: 0
                },
              },
              "$quantity"
            ]
          },
          ...dateProject( { date: "$date", timezone: 'America/New_York' }, dateBinSize )
        }
      },
      {
        $project: {
          date: {
            $dateFromParts: dateFromParts( dateBinSize )
          },
          units: "$units",
          tags: "$tags",
        }
      },
      // add step to filter by tag if applicable
      ... tag ? [ tagFilterObject(tag) ] : [],
      // finally add the step for summing the units
      {
        $group: {
          _id: "$date",
          units: { $sum: "$units" }
        },
      },
      { // rename the _id field to date
        $project: {
          _id: false,
          date: "$_id",
          units: "$units"
        }
      },
      // and sort bins and done
      {
        $sort: {
          date: 1
        }
      }
    ];

    // do the aggregation and return result
    return this.db.collection('shopify-orders').aggregate( pipeline ).toArray();
  }

  palletsSold( { start, end, tag, dateBinSize } ) {

    // Add more pipeline steps
    const pipeline = [
      // Start a pipeline with a date range search
      ... ( start || end ) ? [ rangeFilterObject( "data.created_at", start, end ) ] : [],
      // flatten the line_items array to create one document for each line_item
      {
        $unwind: "$data.line_items"
      },
      // keep only the date, quantity of line item, and references to the product and variant
      {
        $project: {
          _id: false,
          product_id: "$data.line_items.product_id",
          variant_id: "$data.line_items.variant_id",
          quantity: "$data.line_items.quantity",
          date: "$data.created_at"
        }
      },
      // add product data from the products collection
      {
        $lookup: {
          from: "shopify-products",
          localField: "product_id",
          foreignField: "data.id",
          as: "product"
        }
      },
      // it comes as an array so flatten that
      {
        $unwind: {
          path: "$product",
          preserveNullAndEmptyArrays: true
        }
      },
      // project down to just the data we need in the report, doing some data transformations along the way
      {
        $project: {
          ...tagParseObject("$product.data.tags"),
          variant_id: "$variant_id",
          quantity: "$quantity",
          ...dateProject( { date: "$date", timezone: 'America/New_York' }, dateBinSize )
        }
      },
      // Filter down to pallets
      tagFilterObject( 'pallet' ),
      // add step to filter by tag if applicable
      ... tag ? [ tagFilterObject(tag) ] : [],
      // get the shipping items data from product variants metafield dump DB
      { 
        $lookup: { // This is a more complex $lookup than the product one.
          from: "shopify-metafields-product-variants",
          let: { variant_id: "$variant_id" }, 
          pipeline: [ 
            { $match:
              { $expr:
                { $and:
                  [
                    { $eq: [ "$data.ownerId",  "$$variant_id" ] },
                    { $eq: [ "$data.namespace", "shipping" ] }, // just get shipping items metafields
                    { $eq: [ "$data.key", "shippingItems" ] },
                  ]
                }
              }
            },
            { $project: { _id: false, shippingItems: "$data.value" } } // we only need the metafield value
          ],
          as: "product_variant_metafield"
        }
      },
      // it comes as an array so flatten that
      {
        $unwind: {
          path: "$product_variant_metafield",
          preserveNullAndEmptyArrays: true
        }
      },
      // project down to only the necessary data with some transformations
      {
        $project: {
          date: { //collate date data
            $dateFromParts: dateFromParts( dateBinSize )
          },
          pallets: { //total number of pallets for the line item is quantity * ( number of pallet shipping items in the listing ) 
            $multiply: [ 
              "$quantity",
              { // we only care about the number of shipping items. If the field is absent, assume 1 shippingItem
                $cond: {
                  if: { $isArray: "$product_variant_metafield.shippingItems" },
                  then: { $size: "$product_variant_metafield.shippingItems" },
                  else: 1
                }
              }
            ]
          }
        }
      },
      // finally do the grouping and aggregation
      {
        $group: {
          _id: "$date",
          pallets: { $sum: "$pallets" }
        },
      },
      { // rename the _id field to date
        $project: {
          _id: false,
          date: "$_id",
          pallets: 1,
        }
      },
      // and sort bins and done
      {
        $sort: {
          date: 1
        }
      }
    ];

    // do the aggregation and return result
    return this.db.collection('shopify-orders').aggregate( pipeline ).toArray();
  }

}


module.exports = DbClient;
