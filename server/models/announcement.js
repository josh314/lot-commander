const mongoose = require('mongoose');

/*******************************
 * Site Notification schema
 * =============================
 *
 ******/

const siteNotificationSchema = mongoose.Schema({
  header: String,
  body: String,
  isActive: Boolean,
}, { collection: 'site-announcements', timestamps: true });

// pre-save hook
siteNotificationSchema.pre('save', function( next ) {

  if ( !(typeof this.isActive === 'boolean') ) {
    this.isActive = false;
  }

  next();

});

module.exports = {
  schema: siteNotificationSchema
};