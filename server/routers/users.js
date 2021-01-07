const express = require('express');

const auth = require('../auth');
const flashMessages = require('../modules/flash-messages');

module.exports = routes;

function routes({ users }) {
  const router = new express.Router();

  router.post('/change-password', changeUserPassword);
  router.post(
    '/create', 
    auth.isAuthorized( 'CREATE_USER' ),
    createUser
  );
  router.get(
    '/', 
    auth.isAuthorized( 'VIEW_USER' ),
    listUsers
  );
  router.get(
    '/count', 
    auth.isAuthorized( 'VIEW_USER' ),
    countUsers
  );
  router.put(
    '/:userId/roles',
    auth.isAuthorized('EDIT_USER_ROLES'),
    editUserRoles,
  );
  router.put(
    '/:userId/disabled',
    auth.isAuthorized('ENABLE_USER'),
    editUserDisabledStatus,
  );
  
  function changeUserPassword( req, res ) {
    let status;
    users.changeUserPassword( {
      user: req.user,
      password: req.body.password
    } )
      .then(user=>{
        __logger.debug(user);
        req.session.flash = flashMessages.successfulPasswordChange;
        status = 'success';
      })
      .catch(err=>{
        req.session.flash = flashMessages.serverError;
        status = 'failed';
        __logger.error(err);
      })
      .finally(()=>{
        res.json({status: status});
      });
  }
  
  function createUser(req,res) {
    // find a user whose name is the same as the forms name
    // we are checking to see if the user trying to login already exists
    users.getUserByUsername( req.body.username )
    .then( user => {
  
      if (user) {
        throw new Error('USER_EXISTS');
      }
  
      return users.createUser({
        username: req.body.username,
        password: req.body.password,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        roles: req.body.roles
      });
  
    })
      .then( user => {
        res.json({ success: true });
      })
      .catch(err=>{
        if( err.message === 'USER_EXISTS') {
          res.json({ success: false, message: err.message });
        }
        else {
          throw err;
        }
      })
  
  }
  
  function listUsers( req, res ) {
  
    const numPage = parseInt( req.query.num ) || 10;
    const page = parseInt( req.query.page ) || 1;
  
    const query = {
      skip: ( page - 1 ) * numPage,
      num: numPage,
      sort: req.query.sort,
      sortDir: parseInt(req.query.sort_dir),
    };
  
    if( req.query.disabled ) {
      query.isDisabled = !!parseInt( req.query.disabled )
    }
  
    if( req.query.superuser ) {
      query.isSuperuser = !!parseInt( req.query.superuser )
    }
  
    users.list( query ).then( users => {
      res.json(users);
    })
  }
  
  function countUsers( req, res ) {
  
    const query = {};
  
    if( req.query.disabled ) {
      query.isDisabled = !!parseInt( req.query.disabled )
    }
  
    if( req.query.superuser ) {
      query.isSuperuser = !!parseInt( req.query.superuser )
    }
  
    users.count( query ).then( _count => {
      res.json({ count: _count});
    })
  }
  
  const handleEditUserError = res => err => {
    if( err.message === 'NO_SUCH_USER' ) {
      res.json({ success: false, error: `No user with ID ${userId}.` });
    }
    else if ( err.message === 'NO_EDIT_SELF' ) {
      res.json({ success: false, error: `User can't edit self.` });
    }
    else {
      throw err;
    }
  };
  
  function editUserRoles (req, res) {
    const userId = req.params.userId;
    users.getUserById( userId ).then( user => {
  
      if (!user) {
        throw new Error('NO_SUCH_USER');
      }
  
      if( req.user.id === user.id ) {
        throw new Error('NO_EDIT_SELF');
      }
  
      // filter to only the roles the logged in user has permission for
      const newRoles = req.body.roles.filter( role => req.user.isSuperuser || req.user.roles.includes( role ) );
  
      return user.editRoles( newRoles );
  
    })
    .then( user => {
      res.json({ success: true });
    })
    .catch( handleEditUserError(res) )
  
  }
  
  function editUserDisabledStatus (req, res) {
    const userId = req.params.userId;
    users.getUserById( userId ).then( user => {
  
      if (!user) {
        throw new Error('NO_SUCH_USER');
      }
  
      if( req.user.id === user.id ) {
        throw new Error('NO_EDIT_SELF');
      }
  
      return user.editDisabledStatus( req.body.isDisabled );
  
    })
    .then( user => {
      res.json({ success: true });
    })
    .catch( handleEditUserError(res) );
  
  }

  return router;

}


