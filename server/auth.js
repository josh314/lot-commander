const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;

const flashMessages = require('./modules/flash-messages');
const { AuthorizationError } = require('./errors');

let users;

// =========================================================================
// passport session setup ==================================================
// =========================================================================
// required for persistent login sessions
// passport needs ability to serialize and unserialize users out of session

// used to serialize the user for the session
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

// used to deserialize the user
passport.deserializeUser(function(id, done) {
  users.getUserById(id).then( user => done(null, user) ).catch( e => {
    console.error(e);
    done(e);
  });
});

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use('local-login',
  new LocalStrategy(
    {
      // // by default, local strategy uses username and password, we will override with name
      // usernameField : 'name',
      // passwordField : 'password',
      passReqToCallback : true // allows us to pass back the entire request to the callback
    },
    function(req, username, password, done) { // callback with name and password from our form

      // find a user whose name is the same as the forms name
      // we are checking to see if the user trying to login already exists
      users.getUserByUsername( username ).then( user => {

        // if no valid user is found, return the message
        if( !user || user.isDisabled ) {
          req.session.flash = flashMessages.userNotFound;
          return done(null, false);
        }

        // if the user is found but the password is wrong
        if (!user.validPassword(password)) {
          req.session.flash = flashMessages.wrongPassword;
          return done(null, false);
        }

        // all is well, return successful user
        return done(null, user);
      })
        .catch( e => {
          console.error(e);
          done(e);
        });
    }
  )
);

/****************************************************
 * Exports
 * =======
 *
 *****************************************************/

function init( userDbClient ) {
  users = userDbClient;
  return [
    passport.initialize(),
    passport.session()
  ];
}

function authenticate() {
  return passport.authenticate('local-login', {
    failureRedirect : '/login', // redirect back to the login page if there is an error
    failureFlash : false // allow flash messages
  });
}

// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on
  if ( __config.skipAuth || req.isAuthenticated() )
    return next();

  // if they aren't redirect them to the login page
  res.redirect('/login');
}

function isAuthorized( permission ) {
  return ( req, _res, next ) => {
    if( __config.skipAuth || req.user.isAuthorized( permission ) ) {
      return next();
    }
    return next( new AuthorizationError( req.originalUrl ) );
  };
}

function isAuthorizedForAll( ...permissions ) {
  return ( req, _res, next ) => {
    if( __config.skipAuth || !permissions || permissions.reduce( ( isAllowed, _permission ) => isAllowed && req.user.isAuthorized( _permission ), true ) ) {
      return next();
    }
    return next( new AuthorizationError( req.originalUrl ) );
  };
}

function isAuthorizedForAny( ...permissions ) {
  return ( req, _res, next ) => {
    if( __config.skipAuth || !permissions || !permissions.length || permissions.reduce( ( isAllowed, _permission ) => isAllowed || req.user.isAuthorized( _permission ), false ) ) {
      return next();
    }
    return next( new AuthorizationError( req.originalUrl ) );
  };
}

function isSuperuser( req, _res, next ) {
  if( __config.skipAuth || req.user.isSuperuser ) {
    return next();
  }
  return next( new AuthorizationError( req.originalUrl ) );
}

module.exports = {
  init,
  authenticate,
  isLoggedIn,
  isAuthorized,
  isAuthorizedForAll,
  isAuthorizedForAny,
  isSuperuser
};