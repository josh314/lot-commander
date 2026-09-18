const fs = require('fs');
const path = require('path');

const LOCAL_CONFIG_PATH = path.join(__dirname, '../config.local.json');

function isLocal() {
  return fs.existsSync(LOCAL_CONFIG_PATH);
}

async function loadConfig() {
  if (isLocal()) {
    console.log('Loading config from config.local.json');
    return JSON.parse(fs.readFileSync(LOCAL_CONFIG_PATH, 'utf8'));
  }

  const appEnv = process.env.APP_ENV;
  if (!appEnv) {
    throw new Error('APP_ENV must be set when no config.local.json is present');
  }

  const parameterName = `/lot-commander/${appEnv}/config`;
  console.log(`Loading config from SSM: ${parameterName}`);

  const { SSMClient, GetParameterCommand } = require('@aws-sdk/client-ssm');
  const client = new SSMClient({});
  const response = await client.send(new GetParameterCommand({
    Name: parameterName,
    WithDecryption: true,
  }));

  return JSON.parse(response.Parameter.Value);
}

module.exports = loadConfig;
module.exports.isLocal = isLocal;
