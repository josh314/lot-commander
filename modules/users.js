const path = require('path');

const bcrypt   = require('bcrypt-nodejs');

const flashMessages = require(path.join(__basedir, __config.modulesPath, 'flash-messages'));

//=======================================
//=======================================
// Initialize mongoose and connection ===
//=======================================
//=======================================

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');


//Settings for connection
const mongooseConnOpts = {
  keepAlive: 300000,
  connectTimeoutMS: 30000,
  socketTimeoutMS: 300000,
};

const userDbSettings = __config.db.passportUserDb;
const userDbAuth = userDbSettings.auth ? `${userDbSettings.auth.user}:${userDbSettings.auth.pass}@` : ''; 
const userDbUrl = `mongodb://${userDbAuth}${userDbSettings.host}:${userDbSettings.port}/${userDbSettings.db}`;

const mongooseConn = mongoose.createConnection(userDbUrl, mongooseConnOpts);

//======================================
//======================================
// User model ==========================
//======================================
//======================================

const userRolesEnum = [
    'disabled',
    'n00b',
    'basic',
    'captain',
    'manager',
    'admin',
    'owner',
  ];

const userSchema = mongoose.Schema({
	name: String,
  role: { type: String, enum: userRolesEnum },
	local: {
		username: String,
		password: String,
	},
}, {collection: 'users', timestamps: true});

// methods ======================
// generating a hash
userSchema.methods.generateHash = function(password) {
	return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

// checking if password is valid
userSchema.methods.validPassword = function(password) {
	return bcrypt.compareSync(password, this.local.password);
};

userSchema.methods.getPublicInfo = function() {
	return {
		id: this.id,
		name: this.name,
		username: this.local.username,
	};
};

const User = mongooseConn.model('User', userSchema);
exports.User = User;

//===============================================
// Passport 
//===============================================

// load all the things we need
var LocalStrategy = require('passport-local').Strategy;

const passport = require('passport');

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
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

// =========================================================================
// LOCAL LOGIN =============================================================
// =========================================================================
// we are using named strategies since we have one for login and one for signup
// by default, if there was no name, it would just be called 'local'

passport.use('local-login', new LocalStrategy({
    // // by default, local strategy uses username and password, we will override with name
    // usernameField : 'name',
    // passwordField : 'password',
    passReqToCallback : true // allows us to pass back the entire request to the callback
},
function(req, username, password, done) { // callback with name and password from our form

    // find a user whose name is the same as the forms name
    // we are checking to see if the user trying to login already exists
    User.findOne({ 'local.username' :  username }, function(err, user) {
        // if there are any errors, return the error before anything else
        if (err)
            return done(err);

        // if no valid user is found, return the message
        // if (!user || user.isDisabled()) {
        if(!user) {
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
    });

}));

//======================================================
// Express route handlers/middleware
//======================================================


// route middleware to make sure a user is logged in
function isLoggedIn(req, res, next) {
  // if user is authenticated in the session, carry on 
  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the login page
  res.redirect('/login');
}


function createUser(req,res) {
  // find a user whose name is the same as the forms name
  // we are checking to see if the user trying to login already exists
  User.findOne({ 'local.username' :  req.body.username }, function(err, user) {
    // if there are any errors, return the error
    if (err)
      throw err;
    // check to see if theres already a user with that name
    if (user) {
      req.session.flash = flashMessages.userAlreadyExists;
      return;
    }
    else {
      // if there is no user with that name
      // create the user
      var newUser = new User();
      // set the user's local credentials
      newUser.local.username = req.body.username;
      newUser.local.password = newUser.generateHash(req.body.password);
      newUser.name = req.body.name;
      newUser.role = req.body.role;

      // save the user
      newUser.save(function(err) {
        if (err)
          throw err;
        req.session.flash = flashMessages.successfulNewUser;
        return;
      });
    }
  })
  .catch(err=>{
    req.session.flash = flashMessages.errorNewUser;
  })
  .finally(()=>{
    res.redirect('/users/new');
  });
}


function changeUserPassword(req,res) {
  let status;
  User.findOneAndUpdate({ 'local.username': req.user.local.username }, { $set: { 'local.password': req.user.generateHash(req.body.password) }})
  .then(user=>{
    req.session.flash = flashMessages.successfulPasswordChange;
    status = 'success';
  })
  .catch(err=>{
    req.session.flash = flashMessages.serverError;
    status = 'failed';
    __logger.error(err);
  })
  .finally(()=>{
    console.log(status)
    res.json({status: status});
  });
}


function editUserRole(req,res) {
  let isSuccessful = false;
  User.findOneAndUpdate({ 'local.username': req.body.username }, { $set: { 'role': req.body.role }})
  .then(user=>{
    req.session.flash = flashMessages.successfulUserEdit;
    isSuccessful = true;
  })
  .catch(err=>{
    req.session.flash = flashMessages.serverError;
    __logger.error(err);
  })
  .finally(()=>{
//    res.json({success: isSuccessful});
    res.redirect('/');
  });
}

function getUserInfo(req,res) {
  if(req.user.isManager()) //Managers get who they ask for
    username = req.params.username;
  else //everybody else gets themselves
    username = req.user.local.username;
  User.findOne({ 'local.username' :  username })
  .then(user=>{
    if(user)
      res.json(user.getPublicInfo());
    else
      res.json({});
  })
  .catch(e=>{
    console.log(e);
    res.json({error: e});
  });
}

function getAllUsers(req, res) {
  User.find({})
  .sort({name:1})
  .then(users=>{
    users = users.map(user => user.getPublicInfo());
    res.json(users);
  });
}

function consoleLogUser(req,res,next) {
  console.log('user');
  console.log(req.user);
  return next();
}

// Export and we out
module.exports = {
  User: User,
  passport: passport,
  api: {
    isLoggedIn: isLoggedIn,
    createUser: createUser,
    changeUserPassword: changeUserPassword,
    getUserInfo: getUserInfo,
    editUserRole: editUserRole,
    getAllUsers: getAllUsers,
  },
  consoleLogUser: consoleLogUser,
}
