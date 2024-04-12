// App-wide variable refrencing project root
global.__basedir = __dirname;

//================================================
// Basic module requires =========================
//================================================
const path = require('path');
const debug = require('debug')('lot-commander');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const express = require('express');

// dayjs and configuration
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc.js');
const timezone = require('dayjs/plugin/timezone.js');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault( process.env.TIMEZONE );


const { ClientError, AuthorizationError } = require('./errors');

//====================================================
// Server class
//====================================================

class Server {
  constructor(config) {

    //================================================
    // Global variables ==============================
    //================================================

    this.config = config;
    global.__config = this.config;

    //=================================================
    // INITIALIZE EXPRESS APP =========================
    //=================================================

    this.app = express();

    this.app.set('env', this.config.env || 'production' );

    const port = this.config.port;
    if(!port) {
      throw new Error('No port specified.');
    }
    this.app.set('port', process.env.PORT || port);


    //=================================================
    // FAVICON ========================================
    //=================================================
    try {
      const favicon = path.join(__basedir, this.config.assets.root, 'img/favicon.ico');
      this.app.use(require('serve-favicon')(favicon));
    }
    catch(exception) {
      debug('No favicon found.');
    }

    //=================================================
    // CONFIGURE VIEW ENGINE ==========================
    //=================================================

    const viewsPath = path.join(__basedir, this.config.views.root);
    const partialsPath = path.join(__basedir, this.config.views.partials);
    const layoutsPath = path.join(__basedir, this.config.views.layouts);
    const hbs = require('express-handlebars').create({
      extname: '.hbs',
      defaultLayout: path.resolve(path.join(layoutsPath, 'index')),
      partialsDir: path.resolve(partialsPath)
    });
    this.app.engine('hbs', hbs.engine);
    this.app.set('view engine', 'hbs');
    this.app.set('views', path.resolve(viewsPath));

  }

  async init() {
    //=================================================
    // Database connections
    //=================================================

    const mongoSettings = this.config.dbHosts.mongo;

    const mongoose = require('mongoose');

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

    this.mongooseConnection = await mongoose.createConnection().setClient( this.mongoClient );
    global.__mongooseConnection = this.mongooseConnection;

    //================================================
    // Request Logging ===============================
    //================================================
    const requestLoggingMode = this.app.get('env') === 'production' ? 'combined': 'dev';

    //stderr logging skips successful requests
    this.app.use(morgan(requestLoggingMode, {
      skip: function (req, res) {
        return res.statusCode < 400;
      }, stream: process.stderr
    }));
    //stdout logging skips failed requests
    this.app.use(morgan(requestLoggingMode, {
      skip: function (req, res) {
        return res.statusCode >= 400;
      }, stream: process.stdout
    }));


    //================================================
    // Cookies & Session =============================
    //================================================
    require(path.join(__basedir, this.config.modulesPath, 'app-session'))(this.app);

    this.app.use(express.json({ limit: '50mb' }));//parse json bodies
    this.app.use(bodyParser.urlencoded({ extended: true }));

    // =====================================
    // BACKDOOR USER SIGNUP ==============
    // =====================================
    // TODO: COMMENT OUT IN PRODUCTION!!!!!!!!!!!
    // show the signup form
    // if( this.app.get('env') === 'development' ) {
    //   this.app.get('/sonic', function(req, res) {
    //       res.render('signup.hbs', { authFlash: req.session.flash });
    //   });
    //   this.app.post('/sonic/users/new', bodyParser.urlencoded({ extended: true }), users.api.createUser);
    // }

    // =====================================
    // Authentication ======================
    // =====================================

    const UserDbClient = require('./modules/user-db').Client;
    this.users = new UserDbClient( this.mongooseConnection );

    const auth = require('./auth');
    this.app.use( auth.init( this.users ) );

    // show the login form
    this.app.get('/login', function(req, res) {
      res.render('login.hbs', { authFlash: req.session.flash });
    });

    this.app.post('/login', auth.authenticate({ success: '/', failure: '/login' }) );

    this.app.get('/logout', function( req, res, next ) {
      req.logout( err => {

        if (err) { return next(err); }
        res.redirect('/');

      });

    });

    const cookieParser = require('cookie-parser');
    this.app.use(cookieParser());

    // set a cookie
    this.app.use(function (req, res, next) {
      // check if client sent cookie
      const cookie = req.cookies.user;
      if ( cookie === undefined && req.user  ) {

        res.cookie(
          'user',
          JSON.stringify( req.user.getPublicInfo() ),
          {
            // maxAge: 900000,
            httpOnly: false
          }
        );

      }
      next();
    });

    // //===================================================
    // // FLASH MESSAGE MIDDLEWARE =========================
    // //===================================================
    // this.app.use(function(req, res, next){
    //   // if there's a flash message, transfer
    //   // it to the context, then clear it
    //   res.locals.flash = req.session.flash;
    //   delete req.session.flash;
    //   next();
    // });

    //======================================================
    // Module initialization ===============================
    //======================================================

    // Initialize database module(s) and API clients to serve as dependencies for the routers

    // events and history
    const EventsDb = require('./modules/events-db');
    const eventsDbClient = new EventsDb.Client( this.mongooseConnection );

    // Mongoose model manager
    const ModelCommander = require('./models');
    const models = new ModelCommander( this.mongooseConnection );
    this.models = models;

    // app settings
    const AppSettingsCommander = require('./modules/app-settings');
    const appSettings = new AppSettingsCommander( models.AppSetting );

    // Counter
    const CountCommander = require('./modules/count-commander');
    const countCommander = new CountCommander( models.Counter );

    // Lot DB
    const LotDbClient = require('./modules/lot-db-client').Client;
    const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'))( new LotDbClient( Object.assign( { countCommander }, models ) ) );

    // Managing scanned inventory manifest db entries
    const ManifestDbClient = require('./modules/manifest-db-client');
    const manifestDb = new ManifestDbClient( models.Manifest );

    // Inventory commander - pallets, shipments
    const InventoryCommander = require('./modules/inventory-commander');
    const inventoryCommander = new InventoryCommander( Object.assign( { countCommander } , models ) );

    // Shopify order cache
    const ShopifyOrders = require('./modules/shopify-orders');
    const shopifyOrders = new ShopifyOrders( models );

    // Ad-hoc inventory manager
    const ManualInventoryDb = require('./modules/manual-inventory-db');
    const manualInventoryDbClient = new ManualInventoryDb.Client( { mongooseConnection: this.mongooseConnection } );

    // Store metafield schema db
    const StoreMetafieldSchemaDb = require('./modules/store-metafield-schema-db');
    const storeMetafieldSchemaDb = new StoreMetafieldSchemaDb.Client( { mongooseConnection: this.mongooseConnection } );


    // scanned invnetory lot manifests functionality
    const manifests = require('./modules/manifests')( { lotdb, manifestDb } );

    // Bstock module
    // const bstock = require( './modules/bstock' );

    // Shopify client(s)
    const shopifyStoreConfig = __config.shopify.stores;

    const ShopifyGql = require( './modules/shopify-gql' );
    const shopifyGqlClient = {
      prod: new ShopifyGql({
        storeId: shopifyStoreConfig['prod'].id,
        storeName: shopifyStoreConfig['prod'].name,
        accessToken: shopifyStoreConfig['prod'].auth.accessToken || shopifyStoreConfig['prod'].auth.password
      }),
      staging: new ShopifyGql({
        storeId: shopifyStoreConfig['staging'].id,
        storeName: shopifyStoreConfig['staging'].name,
        accessToken: shopifyStoreConfig['staging'].auth.accessToken || shopifyStoreConfig['staging'].auth.password
      }),
    };

    const ShopifyAdminClient = require( './modules/shopify-admin-client' );
    const shopifyAdminClient = new ShopifyAdminClient( {
      storeName: shopifyStoreConfig['prod'].name,
      storeUrl: shopifyStoreConfig['prod'].url,
      apiKey: shopifyStoreConfig['prod'].auth.apiKey,
      accessToken: shopifyStoreConfig['prod'].auth.accessToken || shopifyStoreConfig['prod'].auth.password,
      shopifyGql: shopifyGqlClient['prod'],
      manifests
    } );

    const ListingsSubmitter = require( './modules/listings-submitter' );
    const listingsSubmitter = new ListingsSubmitter( {
      // bstock,
      shopifyAdminClient,
      manifests
    } );

    // Product data

    const UpcItemDbClient = require( './modules/upc-item-db' );
    const upcItemDb = new UpcItemDbClient( {
      connection: this.mongooseConnection,
      settings: this.config.upcItemDb
    } );

    const ProductData = require( './modules/product-data' );
    const productData = new ProductData( { upcItemDb, mongo: this.mongooseConnection.db } );

    const FulfillmentCommander = require( './modules/fulfillment-commander' );
    const fulfillmentCommander = new FulfillmentCommander( Object.assign( { inventoryCommander, lotdb, shopifyOrders, shopifyAdminClient } , models ) );

    //======================================================
    // Main app routes =====================================
    //======================================================

    const modules = {
      appSettings,
      // bstock,
      countCommander,
      eventsDbClient,
      fulfillmentCommander,
      inventoryCommander,
      listings: listingsSubmitter,
      lotdb,
      manifests,
      manualInventoryDbClient,
      productData,
      shopifyGql: shopifyGqlClient,
      shopifyOrders,
      storeMetafieldSchemaDb,
      userDbClient: this.users,
    };

    this.modules = modules;

    // Load routes based on layout
    const router = require(path.join(__basedir,'routers'))( modules );

    // Login users on all main routes
    this.app.use(
      '/',
      auth.isLoggedIn,
      router
    );

    //===============================================
    // Error Handling  and Logging ==================
    //===============================================

    // //If route is not handled, render custom 404 page
    // this.app.use(function(req, res, next) {
    //   res.render('404', layout);
    // });

    this.app.use( function( err, req, res, _next ){

      // console.error(`404: path does not exist -- ${req.originalUrl}`);
      // res.status(404).render('404', {});
      // console.error(req.originalUrl)
      console.error(err);

      const response = {
        error: true,
        code: err.code
      };

      if( err instanceof ClientError ) {
        response.message = err.message;
      }
      else if ( err instanceof AuthorizationError ) {
        response.message = `UNAUTHORIZED`;
      }
      else {
        response.message = 'Server Error.';
      }

      res.json( response );
    });

    return this;
  }

  async listen() {
    //=================================================
    // Start the server
    //=================================================
    const _server = await this.app.listen( this.app.get('port') );

    const address = _server.address();
    if(typeof address === 'string') {
      debug('Express server listening at address ' + address);
    }
    else if( address !== null ) {
      debug('Express server listening on port ' + address.port);
    }

    return this;
  }
}

module.exports = Server;