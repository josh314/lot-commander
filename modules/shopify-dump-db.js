const MongoClient = require('mongodb').MongoClient;

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

class DbClient {
  constructor( { host, port, dbName, user, password } ) {

    this.collections = {
      checkouts: 'shopify-checkouts',
      customers: 'shopify-customers',
      orders: 'shopify-orders',
      products: 'shopify-products',
    };

    this.location = `${host}:${ port || 27017 }/${dbName}`;
    this.url = this.connectionString( this.location , user, password );

    this.client = new MongoClient(
      this.url,
      {
        useNewUrlParser: true,
        useUnifiedTopology: true
      }
    );

    this.dbName = dbName;
  }

  connectionString( location, user, password ) {
    return `mongodb://${ user && password ? `${user}:${password}@` : ''}${location}`
  }

  async connect( ) {
    console.log(`Connecting to shopify dump DB at ${this.location}`);
    await this.client.connect();
    this.db = this.client.db( this.dbName );
  }

  close() {
    return this.client.close();
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

    // build some functions for returning components for the pipeline
    const [
      dateProject,
      dateFromParts
    ] = (binSize => [
        dateExpression => {
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
        },
        () =>  {
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
        }
    ])(dateBinSize);
    
    // Build the pipeline 

    // Start with an empty pipeline
    let pipeline = [];

    // add a match step to filter orders by date
    if( start || end ) {
      const dateLimits = [];
      if( start ) {
        dateLimits.push({ "data.created_at": { $gt: start } });
      }
      if( end ) {
        dateLimits.push({ "data.created_at": { $lt: end } });
      }

      pipeline.push({
        $match: { $and: dateLimits }
      });
    }

    // Add more pipeline steps
    pipeline = pipeline.concat([
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
        $unwind: "$product"
      },
      // project down to just the data we need in the report, doing some data transformations along the way
      {
        $project: Object.assign(
          {
            tags: { // Splits the csv tag string and trims whitespace
              $map: { 
                input: { $split: [ "$product.data.tags", ',' ]  },
                as: "tag",
                in: { $trim: { input: "$$tag" } }
              }            
            },
            units: { 
              $convert: { 
                input: "$units",
                to: "int",
                onError: 0,
                onNull: 0
              }
            },
          }, 
          dateProject( { date: "$date", timezone: 'America/New_York' } )
        )
      },
      {
        $project: {
          date: {
            $dateFromParts: dateFromParts()
          },
          units: "$units",
          tags: "$tags",
        }
      }
    ]);

    // add step to filter by tag if applicable
    if( tag ) {
      pipeline.push({
        $match: { tags: new RegExp(`${tag}`, 'i')  }
      });
    }

    // finally add the step for summing the units
    pipeline = pipeline.concat([
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
      {
        $sort: {
          date: 1
        }
      }
    ])

    // do the aggregation and return result
    return this.db.collection('shopify-orders').aggregate( pipeline ).toArray();
  }

}


module.exports = DbClient;
