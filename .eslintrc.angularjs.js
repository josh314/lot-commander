const clientSettings = require('./.eslintrc.client');

// deep copy the general config object
const exportObject = JSON.parse( JSON.stringify( clientSettings ) );

// Add the angular extension
if( Array.isArray( exportObject.extends ) ) {
  exportObject.extends.push( 'angular' );
}
else {
  exportObject.extends = [ 'angular' ];
}

// add the angular plugin
if( Array.isArray( exportObject.plugins ) ) {
  exportObject.plugins.push( 'angular' );
}
else {
  exportObject.plugins = [ 'angular' ];
}

// add angular rules settings
const angularLintingRules = {
  // Angular plugin rules
  "angular/controller-as": "off",
  "angular/controller-name": "off",
  "angular/di": [2, "array"],
  "angular/di-unused": "warn",
  "angular/json-functions": "off",
  "angular/log": "off",
  "angular/no-service-method": "off",
  "angular/on-watch": "off",
  "angular/typecheck-array": "off",
  "angular/typecheck-number": "off",
  "angular/typecheck-object": "off",
  "angular/typecheck-string": "off",
};
exportObject.rules = exportObject.rules ? Object.assign( exportObject.rules, angularLintingRules ) : angularLintingRules;

// export
module.exports = exportObject;

