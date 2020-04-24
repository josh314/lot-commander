const express = require('express');

const router = new express.Router();
module.exports = router;

const users = require('../modules/users');
const flashMessages = require('../modules/flash-messages');

router.post('/change-password', changeUserPassword);

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