#!/usr/bin/env node
'use strict';

const MAX_SECRETS = 3;

const [, , appEnv, newSecret] = process.argv;

if (!appEnv || !newSecret) {
  console.error('Usage: rotate-session-secret.js <app-env> <new-secret>');
  process.exit(1);
}

const parameterName = `/lot-commander/${appEnv}/session-secrets`;

const { SSMClient, GetParameterCommand, PutParameterCommand } = require('@aws-sdk/client-ssm');
const client = new SSMClient({});

async function run() {
  let existing = [];

  try {
    const response = await client.send(new GetParameterCommand({
      Name: parameterName,
      WithDecryption: true,
    }));
    existing = response.Parameter.Value.split(',').map(s => s.trim()).filter(Boolean);
    console.log(`Fetched ${existing.length} existing secret(s) from SSM: ${parameterName}`);
  } catch (err) {
    if (err.name === 'ParameterNotFound') {
      console.log(`No existing parameter found at ${parameterName}, will create it.`);
    } else {
      console.error(`Failed to fetch parameter: ${err.message}`);
      process.exit(1);
    }
  }

  const existingNumSecrets = existing.length;

  if( existingNumSecrets < MAX_SECRETS ) {
    console.log(`Adding new secret to existing ${existingNumSecrets} secrets.`);
  }
  else if ( existingNumSecrets === MAX_SECRETS ) {
    console.log(`Max secrets reached (${MAX_SECRETS}). Rotating oldest secret.`);
  }

  const updated = [newSecret, ...existing].slice(0, MAX_SECRETS);
  const value = updated.join(',');

  await client.send(new PutParameterCommand({
    Name: parameterName,
    Value: value,
    Type: 'SecureString',
    Overwrite: true,
  }));

  console.log(`Updated ${parameterName} with ${updated.length} secret(s) (max ${MAX_SECRETS}).`);
}

run().catch(err => {
  console.error(err.message);
  process.exit(1);
});
