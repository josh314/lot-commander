const bcrypt   = require('bcrypt-nodejs');

//=======================================
//=======================================
// Constants & helpers ==================
//=======================================
//=======================================

const __USER_ROLE_PERMISSIONS__ = {
  __AUCTIONS__: [ 'LIST_AUCTIONS', 'SUBMIT_AUCTION'],
  __FULFILLMENT__: [ 'LIST_ORDERS', 'VIEW_ORDER'],
  __RECEIVING__: [],
  __REPORTS__: [ 'VIEW_REPORT' ],
  __SHOPIFY__: [ 'SUBMIT_SHOPIFY_LISTING' ],
  __TOOLS__: [ 'COUNTER_TOOL' ],
  __USERS__: [ 'CREATE_USER', 'EDIT_USER_ROLES', 'ENABLE_USER' ],
};

const superuserRoles = () => Object.keys( __USER_ROLE_PERMISSIONS__ );

const userRoleHasPermission = permission => role => __USER_ROLE_PERMISSIONS__[ role ].includes( permission );

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

const userSchema = mongoose.Schema({
  name: String,
  roles: [{ type: String, enum: Object.keys( __USER_ROLE_PERMISSIONS__ ) }],
  local: {
    username: String,
    password: String,
  },
  isSuperuser: Boolean,
  isDisabled: Boolean,
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

userSchema.methods.isAuthorized = function( permission ) {
  if ( this.isDisabled ) {
    return false;
  }
  else if( this.isSuperuser ) {
    return true;
  }
  else if ( this.roles ) {
    return this.roles.some( userRoleHasPermission( permission ) );
  }
  else {
    return false;
  }
}

userSchema.methods.getPermissionSet = function() {
  const roles = this.isSuperuser ? superuserRoles() : this.roles;
  return roles.reduce( (permissions, role) => {
    for( let p of __USER_ROLE_PERMISSIONS__[ role ] ) {
      permissions.add(p);
    }
    return permissions;
  }, new Set());
}

userSchema.methods.getPublicInfo = function() {
  return {
    id: this.id,
    name: this.name,
    username: this.local.username,
    roles: this.isSuperuser ? superuserRoles() : this.roles,
    permissions: [...this.getPermissionSet()]
  };
};

userSchema.methods.editRoles = function( _roles ) {
  this.roles = _roles;
  return this.save();
};

userSchema.methods.editDisabledStatus = function( _isDisabled ) {
  this.isDisabled = _isDisabled;
  return this.save();
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

const editRoles = ( { user, newRoles } ) => {
  user.roles = newRoles;
  return user.save();
}

const createUser = ( { username, password, name, roles } ) => {
  const newUser = new User();
  // set the user's local credentials
  newUser.local.username = username;
  newUser.local.password = newUser.generateHash(password);
  newUser.name = name;
  newUser.roles = roles;

  // save the user
  return newUser.save();
};

// Export and we out
module.exports = {
  changeUserPassword: changeUserPassword,
  createUser: createUser,
  editRoles: editRoles,
  getUserByUsername: getUserByUsername,
  getUserById: getUserById,
};
