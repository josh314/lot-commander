const mongoose = require('mongoose');

const { Mixed } = mongoose.Schema.Types;

/*******************************
 * App Setting schema
 * =============================
 *
 ******/

const appSettingSchema = mongoose.Schema({
  name: String,
  displayName: String,
  value: Mixed,
  type: String
}, { collection: 'app-settings', timestamps: true });

appSettingSchema.methods.setValue = function( newValue ) {
  this.value = newValue;
  return this.save();
};

module.exports = {
  schema: appSettingSchema
};