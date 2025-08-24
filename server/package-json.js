// Make the contents of package.json available as a module
const fs = require('fs');
const packageJson = JSON.parse( fs.readFileSync( './package.json', 'utf8' ) );

module.exports = packageJson;