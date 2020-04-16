(async function(){
  'use strict';
  //================================================
  // Global variables ==============================
  //================================================

  // App-wide variable refrencing project root 
  global.__basedir = __dirname;

  //================================================
  // Basic module requires =========================
  //================================================
  const path = require('path');
  const debug = require('debug')('lot-commander');
  const bodyParser = require('body-parser');

  //================================================
  // Load configuration & deployment options =======
  //================================================
  const configFile = path.join(__basedir, 'config');//TODO: make a global
  global.__config = require(configFile);
  // if(!config) {
  //  throw new Error(`Deployment file not found at ${deployFile}!`)
  // }

  //=================================================
  // General logging ================================
  //=================================================
  global.__logger = require(path.join(__basedir, __config.modulesPath, 'logger'));

  //=================================================
  // Database connections
  //=================================================
  global.__connections = await require('./dbs').init();

  //=================================================
  // INITIALIZE EXPRESS APP =========================
  //=================================================
  const express = require('express');
  const app = express();

  app.set('env', __config.env);

  //=================================================
  // FAVICON ========================================
  //=================================================
  try {
    const favicon = path.join(__basedir, __config.assets.root, 'img/favicon.ico');
    app.use(require('serve-favicon')(favicon));
  }
  catch(exception) {
    debug('No favicon found.');
  }

  //=================================================
  // CONFIGURE VIEW ENGINE ==========================
  //=================================================

  const viewsPath = path.join(__basedir, __config.views.root);
  const partialsPath = __config.views.partials;
  const layoutsPath = __config.views.layouts;
  const hbs = require('express-handlebars').create({
    extname: '.hbs',
    defaultLayout: path.resolve(path.join(layoutsPath, 'index')),
    partialsDir: path.resolve(partialsPath)
  });
  app.engine('hbs', hbs.engine);
  app.set('view engine', 'hbs');
  app.set('views', path.resolve(viewsPath));

  //================================================
  // Request Logging ===============================
  //================================================
  const morgan = require('morgan');
  const requestLoggingMode = app.get('env') === 'prod' ? 'combined': 'dev';

  //stderr logging skips successful requests
  app.use(morgan(requestLoggingMode, {
    skip: function (req, res) {
      return res.statusCode < 400;
    }, stream: process.stderr
  }));
  //stdout logging skips failed requests
  app.use(morgan(requestLoggingMode, {
    skip: function (req, res) {
      return res.statusCode >= 400;
    }, stream: process.stdout
  }));


  //================================================
  // Cookies & Session =============================
  //================================================
  require(path.join(__basedir, __config.modulesPath, 'app-session'))(app);

  app.use(express.json({ limit: '50mb' }));//parse json bodies
  app.use(bodyParser.urlencoded({ extended: true }));

  //=================================================
  // Initialize passport module =====================
  //=================================================
  const users = require(path.join(__basedir, __config.modulesPath, 'users'));
  app.use(users.passport.initialize());
  app.use(users.passport.session());//initializes req.user field


  // =====================================
  // BACKDOOR USER SIGNUP ==============
  // =====================================
  // TODO: COMMENT OUT IN PRODUCTION!!!!!!!!!!!
  // show the signup form
  // app.get('/sonic', function(req, res) {
  //     res.render('signup.hbs', { authFlash: req.session.flash });
  // });
  // app.post('/sonic/users/new', bodyParser.urlencoded({ extended: true }), users.api.createUser);

  // =====================================
  // LOGIN & LOGOUT ======================
  // =====================================
  // show the login form
  app.get('/login', function(req, res) {
    res.render('login.hbs', { authFlash: req.session.flash }); 
  });

  // process the login form
  app.post('/login', users.passport.authenticate('local-login', {
    successRedirect : '/', // redirect to main
    failureRedirect : '/login', // redirect back to the login page if there is an error
    failureFlash : false // allow flash messages
  }));

  app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
  });

  //=================================================
  // Static server ==================================
  //=================================================
  app.use(users.api.isLoggedIn, express.static(path.join(__basedir, __config.assets.root)));
  app.use(users.api.isLoggedIn, express.static(path.join(__basedir, __config.imgPath)));

  // //===================================================
  // // FLASH MESSAGE MIDDLEWARE =========================
  // //===================================================
  // app.use(function(req, res, next){
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
  const router = require(path.join(__basedir,'routers'))(app.get('env'));

  // Login users on all main routes
  app.use('/', users.api.isLoggedIn, router);

  //===============================================
  // Error Handling  and Logging ==================
  //===============================================

  // //If route is not handled, render custom 404 page
  // app.use(function(req, res, next) {
  //   res.render('404', layout);
  // });

  app.use(function(err, req, res, next){
    
    // __logger.error(`404: path does not exist -- ${req.originalUrl}`);
    // res.status(404).render('404', {});
    console.log('Logging error to file.');
    __logger.error(err);
    res.json({
      status: 'error',
      error: err.clientMessage ? err.clientMessage : 'Server Error.',
    });
  });

  //=================================================
  // Start the server 
  //=================================================
  const port = __config.port;
  if(!port) {
    throw new Error('No port specified.');
  }
  app.set('port', process.env.PORT || port);

  const server = app.listen(app.get('port'), function() {
    debug('Express server listening on port ' + server.address().port);
  });


  //==========================================
  // ....export and we out
  //==========================================
  module.exports = app;
})()
  .catch(e=>{
    console.log(e);
    process.exit(1);
  });