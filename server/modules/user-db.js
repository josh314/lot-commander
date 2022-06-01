const bcrypt   = require('bcrypt-nodejs');

//=======================================
//=======================================
// Constants & helpers ==================
//=======================================
//=======================================

const __USER_ROLE_PERMISSIONS__ = {
  __AUCTIONS__: [ 'LIST_AUCTIONS', 'SUBMIT_AUCTION'],
  __DEVELOPER__: [ 'DEVELOPER' ],
  __EVENTS__: [ 'VIEW_EVENTS' ],
  __FULFILLMENT__: [ 'LIST_ORDERS', 'VIEW_ORDER'],
  __LOTS__: [ 'VIEW_LOT', 'EDIT_LOT', 'CREATE_LOT', 'DELETE_LOT' ],
  __MANUAL_INVENTORY__: [ 'VIEW_MANUAL_INVENTORY', 'CREATE_MANUAL_INVENTORY', 'DELETE_MANUAL_INVENTORY'],
  __PRECEIVING__: [ 'CREATE_INCOMING_SHIPMENT', 'EDIT_INCOMING_SHIPMENT' ],
  __PURCHASING__: [ 'VIEW_PURCHASING_DATA' ],
  __RECEIVING__: [ 'VIEW_INCOMING_SHIPMENT', 'RECEIVE_INCOMING_SHIPMENT', 'VIEW_INVENTORY_PALLET', 'EDIT_INVENTORY_PALLET', 'CREATE_INVENTORY_PALLET' ],
  __REPORTS__: [ 'VIEW_REPORT' ],
  __SHIPPING_RATES__: [ 'EDIT_STORE_SHIPPING_RATES', 'VIEW_STORE_SHIPPING_RATES' ],
  __SHOPIFY__: [ 'SUBMIT_SHOPIFY_LISTING' ],
  __TOOLS__: [ 'COUNTER_TOOL' ],
  __TRANSPORTATION__: [ 'VIEW_TRANSPORTATION_COST' ],
  __USERS__: [ 'CREATE_USER', 'EDIT_USER_ROLES', 'ENABLE_USER', 'VIEW_USER' ],
};

const superuserRoles = () => Object.keys( __USER_ROLE_PERMISSIONS__ );

const userRoleHasPermission = permission => role => {

  if( !permission ) {
    return true;
  }

  return __USER_ROLE_PERMISSIONS__[ role ] ? __USER_ROLE_PERMISSIONS__[ role ].includes( permission ) : false;

};

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
  firstName: String,
  lastName: String,
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
};

userSchema.methods.getPermissionSet = function() {
  const roles = this.isSuperuser ? superuserRoles() : this.roles;
  return roles.reduce( (permissions, role) => {

    if( Array.isArray( __USER_ROLE_PERMISSIONS__[ role ] ) ) {

      for( let p of __USER_ROLE_PERMISSIONS__[ role ] ) {
        permissions.add(p);
      }

    }

    return permissions;
  }, new Set());
};

userSchema.methods.getPublicInfo = function() {
  return {
    id: this.id,
    firstName: this.firstName,
    lastName: this.lastName,
    username: this.local.username,
    roles: this.isSuperuser ? superuserRoles() : this.roles,
    permissions: [...this.getPermissionSet()],
    isDisabled: this.isDisabled
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

//======================================================
// Client class
//======================================================

class Client {
  constructor( mongooseConnection ) {
    this.User = mongooseConnection.model('User', userSchema);
  }

  changeUserPassword( { user, password } ) {
    // Note that we are passing in a user instance
    return this.User.findOneAndUpdate(
      // search users by username
      {
        'local.username': user.local.username
      },
      // update the found user's password
      {
        $set: { 'local.password': user.generateHash(password) }
      }
    );
  }

  createUser( { username, password, firstName, lastName, roles } ) {
    const newUser = new this.User();
    // set the user's local credentials
    newUser.local.username = username;
    newUser.local.password = newUser.generateHash(password);
    newUser.firstName = firstName;
    newUser.lastName = lastName;
    newUser.roles = roles;
    newUser.isSuperuser = false;
    newUser.isDisabled = false;
  
    // save the user
    return newUser.save();
  }

  count( { isDisabled, isSuperuser } ) {

    const query = {};
  
    if( isDisabled !== undefined ) {
      query.isDisabled = isDisabled;
    }
  
    if( isSuperuser !== undefined ) {
      query.isSuperuser = isSuperuser;
    }
  
    const q = this.User.countDocuments( query );
  
    return q;
  }

  getUserByUsername(username) {
    return this.User.findOne( { 'local.username' :  username } );
  }

  getUserById( userId ) {
    return this.User.findById(userId);
  }

  list( { num, skip, sort, sortDir, isDisabled, isSuperuser } ) {

    const query = {};
  
    if( isDisabled !== undefined ) {
      query.isDisabled = isDisabled;
    }
  
    if( isSuperuser !== undefined ) {
      query.isSuperuser = isSuperuser;
    }
  
    let sortField;
    if ( sort == 'username' ) {
      sortField = 'local.username';
    }
    else {
      sortField = 'lastName';
    } 
  
    const sortParams = {
      [ sortField ] : sortDir || 1
    };
    
    const q = this.User.find( query ).skip( skip || 0 ).limit( num || 20 ).sort( sortParams );
  
    return q.then( users => users.map( user => user.getPublicInfo() ) );
  }
}

module.exports = {
  Client: Client
};