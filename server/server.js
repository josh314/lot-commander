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

    this.mongooseConnection = mongoose.createConnection().setClient( this.mongoClient );
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
    // Main app routes =====================================
    //======================================================

    // Initialize database and APi clients to serve as dependencies for the routers

    const EventsDb = require('./modules/events-db');
    const eventsDbClient = new EventsDb.Client( this.mongooseConnection );

    const ModelCommander = require('./models');
    const models = new ModelCommander( this.mongooseConnection );


    const LotDbClient = require('./modules/lot-db-client').Client;
    const lotdb = require(path.join(__basedir, __config.modulesPath, 'lot-db'))( new LotDbClient( models ) );

    const InventoryCommander = require('./modules/inventory-commander');
    const inventoryCommander = new InventoryCommander( models );

    const ShopifyOrders = require('./modules/shopify-orders');
    const shopifyOrders = new ShopifyOrders( models );

    const CountCommander = require('./modules/count-commander');
    const countCommander = new CountCommander( models.Counter );

    const ManualInventoryDb = require('./modules/manual-inventory-db');
    const manualInventoryDbClient = new ManualInventoryDb.Client( { mongooseConnection: this.mongooseConnection } );

    const manifests = require('./modules/manifests')( { lotdb } );

    const bstock = require( './modules/bstock' );


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
      storeUrl: shopifyStoreConfig['prod'].url,
      apiKey: shopifyStoreConfig['prod'].auth.apiKey,
      accessToken: shopifyStoreConfig['prod'].auth.accessToken || shopifyStoreConfig['prod'].auth.password,
      shopifyGql: shopifyGqlClient['prod'],
      manifests
    } );

    const ListingsSubmitter = require( './modules/listings-submitter' );
    const listingsSubmitter = new ListingsSubmitter( { bstock, shopifyAdminClient, manifests } );

    const routerOpts = {
      bstock,
      countCommander,
      eventsDbClient,
      inventoryCommander,
      listings: listingsSubmitter,
      lotdb,
      manifests,
      manualInventoryDbClient,
      shopifyGql: shopifyGqlClient,
      shopifyOrders,
      userDbClient: this.users,
    };

    // Load routes based on layout
    const router = require(path.join(__basedir,'routers'))(routerOpts);

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
      // console.error(err);

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

  listen() {
    //=================================================
    // Start the server
    //=================================================
    const server = this.app.listen(this.app.get('port'), function() {
      const address = server.address();
      if(typeof address === 'string') {
        debug('Express server listening at address ' + address);
      }
      else if( address !== null ) {
        debug('Express server listening on port ' + address.port);
      }
    });
    return server;
  }
}

module.exports = Server;