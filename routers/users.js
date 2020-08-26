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
      name: req.body.name,
      roles: req.body.roles,
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