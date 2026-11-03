#!/usr/bin/env node
'use strict';

const [, , mongoUri, handle, countArg] = process.argv;

if (!mongoUri || !handle || countArg === undefined) {
  console.error('Usage: initialize-counter.js <mongo-uri> <handle> <count>');
  process.exit(1);
}

const count = Number(countArg);

if (!Number.isInteger(count) || count < 0) {
  console.error(`Invalid count: ${countArg} (must be a non-negative integer)`);
  process.exit(1);
}

const mongoose = require('mongoose');

// Deliberately self-contained rather than importing server/src/models/counter.js's
// schema: that schema enforces `enum: counterHandles`, but this script's whole job
// is minting a handle *before* it's added to that enum -- enforcing it here would
// make the script unusable for its own purpose.
const counterSchema = new mongoose.Schema(
  {
    handle: { type: String, required: true, unique: true },
    count: { type: Number, required: true },
  },
  { collection: 'counters', timestamps: true },
);

async function run() {
  const conn = await mongoose.createConnection(mongoUri).asPromise();
  const Counter = conn.model('Counter', counterSchema);

  const existing = await Counter.findOne({ handle });
  if (existing) {
    console.error(`Counter '${handle}' already exists (count: ${existing.count}).`);
    process.exit(1);
  }

  const counter = await new Counter({ handle, count }).save();
  console.log(`Created counter '${counter.handle}' with count ${counter.count}.`);

  await conn.close();
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
