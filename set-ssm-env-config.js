#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const [, , appEnv, filePath] = process.argv;

if (!filePath || !appEnv) {
  console.error('Usage: set-ssm-config.js <app-env> <config-file>');
  process.exit(1);
}

const absolutePath = path.resolve(filePath);

if (!fs.existsSync(absolutePath)) {
  console.error(`File not found: ${absolutePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(absolutePath, 'utf8');

try {
  JSON.parse(raw);
} catch (e) {
  console.error(`Invalid JSON: ${e.message}`);
  process.exit(1);
}

const parameterName = `/lot-commander/${appEnv}/config`;

const { SSMClient, PutParameterCommand } = require('@aws-sdk/client-ssm');
const client = new SSMClient({});

client.send(new PutParameterCommand({
  Name: parameterName,
  Value: raw,
  Type: 'SecureString',
  Overwrite: true,
}))
.then(() => {
  console.log(`Config written to SSM: ${parameterName}`);
})
.catch(err => {
  console.error(`Failed to write to SSM: ${err.message}`);
  process.exit(1);
});
