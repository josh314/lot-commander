const path = require('path');

const bstockWeb = require(path.join(__config.libDir.bstock, 'bstock-web'));

module.exports ={
	constants: bstockWeb.codeMaps,
}