// This is used to extend a mongoose schema.
// Shamelessly cribbed from https://www.npmjs.com/package/mongoose-extend-schema

// Example usage:
//
// const mongoose = require('mongoose');
// const { extendSchema } = require('./mongoose-extend-schema');

// const UserSchema = new mongoose.Schema({
//   email: {type: String, unique: true, required: true},
//   passwordHash: {type: String, required: true},

//   firstname: {type: String},
//   lastname: {type: String},
//   phone: {type: String}
// });

// // Extend UserSchema
// const AdminUserSchema = extendSchema(UserSchema, {
//   firstname: {type: String, required: true},
//   lastname: {type: String, required: true},
//   phone: {type: String, required: true}
// });

// Will use different collections for the schemas


const mongoose = require('mongoose');

function extendSchema (Schema, definition, options) {
  return new mongoose.Schema(
    Object.assign({}, Schema.obj, definition),
    options
  );
}

module.exports = {
  extendSchema
};