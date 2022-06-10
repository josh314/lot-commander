const mongoose = require('mongoose');

const counterSchema = mongoose.Schema({
  handle: { type: String, required: true, unique: true },
  count: { type: Number, required: true },
}, { collection: 'counters', timestamps: true });

counterSchema.methods.increment = function(  ) {
  this.count += 1;
  return this.save();
};

module.exports = {
  schema: counterSchema
};