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

class Server {
  constructor(config) {

    //================================================
    // Global variables ==============================
    //================================================

    this.config = config;
    global.__config = this.config;

    //=================================================
    // General logging ================================
    //=================================================
    global.__logger = require(path.join(__basedir, this.config.modulesPath, 'logger'));

    //=================================================
    // INITIALIZE EXPRESS APP =========================
    //=================================================

    this.app = express();

    this.app.set('env', this.config.env);

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
    const partialsPath = this.config.views.partials;
    const layoutsPath = this.config.views.layouts;
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
    global.__connections = await require('./dbs').init();

    //================================================
    // Request Logging ===============================
    //================================================
    const requestLoggingMode = this.app.get('env') === 'prod' ? 'combined': 'dev';

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

    //=================================================
    // Initialize passport module =====================
    //=================================================
    const users = require(path.join(__basedir, this.config.modulesPath, 'users'));
    this.app.use(users.passport.initialize());
    this.app.use(users.passport.session());//initializes req.user field


    // =====================================
    // BACKDOOR USER SIGNUP ==============
    // =====================================
    // TODO: COMMENT OUT IN PRODUCTION!!!!!!!!!!!
    // show the signup form
    // this.app.get('/sonic', function(req, res) {
    //     res.render('signup.hbs', { authFlash: req.session.flash });
    // });
    // this.app.post('/sonic/users/new', bodyParser.urlencoded({ extended: true }), users.api.createUser);

    // =====================================
    // LOGIN & LOGOUT ======================
    // =====================================
    // show the login form
    this.app.get('/login', function(req, res) {
      res.render('login.hbs', { authFlash: req.session.flash }); 
    });

    // process the login form
    this.app.post('/login', users.passport.authenticate('local-login', {
      successRedirect : '/', // redirect to main
      failureRedirect : '/login', // redirect back to the login page if there is an error
      failureFlash : false // allow flash messages
    }));

    this.app.get('/logout', function(req, res) {
      req.logout();
      res.redirect('/');
    });

    //=================================================
    // Static server ==================================
    //=================================================
    this.app.use(users.api.isLoggedIn, express.static(path.join(__basedir, this.config.assets.root)));
    this.app.use(users.api.isLoggedIn, express.static(path.join(__basedir, this.config.imgPath)));

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
    // Load routes based on layout
    const router = require(path.join(__basedir,'routers'))(this.app.get('env'));

    // Login users on all main routes
    this.app.use('/', users.api.isLoggedIn, router);

    //===============================================
    // Error Handling  and Logging ==================
    //===============================================

    // //If route is not handled, render custom 404 page
    // this.app.use(function(req, res, next) {
    //   res.render('404', layout);
    // });

    this.app.use(function(err, req, res, next){
      
      // __logger.error(`404: path does not exist -- ${req.originalUrl}`);
      // res.status(404).render('404', {});
      console.log('Logging error to file.');
      __logger.error(err);
      res.json({
        status: 'error',
        error: err.clientMessage ? err.clientMessage : 'Server Error.',
      });
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