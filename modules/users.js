const bcrypt   = require('bcrypt-nodejs');

//=======================================
//=======================================
// Initialize mongoose and connection ===
//=======================================
//=======================================

const mongoose = require('mongoose');
mongoose.Promise = require('bluebird');

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

const User = __connections.users.model('User', userSchema);



//======================================================
// Exports
//======================================================

const getUserByUsername = username => User.findOne( { 'local.username' :  username } );

const getUserById = userId => User.findById(userId);

const changeUserPassword = ( { user, password } ) => {
  // Note that we are passing in a user instance
  return User.findOneAndUpdate(
    // search users by username
    {
      'local.username': user.local.username
    },
    // update the found user's password
    {
      $set: { 'local.password': user.generateHash(password) }
    }
  )
};

// Export and we out
module.exports = {
  changeUserPassword: changeUserPassword,
  getUserByUsername: getUserByUsername,
  getUserById: getUserById,
};
