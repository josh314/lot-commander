const express = require('express');

const router = new express.Router();
module.exports = router;

const auth = require('../auth');
const users = require('../modules/users');
const flashMessages = require('../modules/flash-messages');

router.post('/change-password', changeUserPassword);
router.put(
  '/create', 
  auth.isAuthorized( 'CREATE_USER' ),
  createUser
);
router.get(
  '/', 
  auth.isAuthorized( 'VIEW_USER' ),
  listUsers
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
      console.log(user);
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

  const query = {
    num: parseInt(req.query.num),
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

function editUserRoles (req, res) {
  const userId = req.params.userId;
  users.getUserById( userId ).then( user => {

    if (!user) {
      throw new Error('NO_SUCH_USER');
    }

    return user.editRoles( req.body.roles );

  })
  .then( user => {
    console.log(user);
    res.json({ success: true });
  })
  .catch(err=>{
    if( err.message === 'NO_SUCH_USER') {
      res.json({ success: false, message: `No user with ID ${userId}` });
    }
    else {
      throw err;
    }
  })

}

function editUserDisabledStatus (req, res) {
  const userId = req.params.userId;
  users.getUserById( userId ).then( user => {

    if (!user) {
      throw new Error('NO_SUCH_USER');
    }

    return user.editDisabledStatus( req.body.isDisabled );

  })
  .then( user => {
    console.log(user);
    res.json({ success: true });
  })
  .catch(err=>{
    if( err.message === 'NO_SUCH_USER') {
      res.json({ success: false, message: `No user with ID ${userId}` });
    }
    else {
      throw err;
    }
  })

}