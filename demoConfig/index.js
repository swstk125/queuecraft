'use strict';

var path                 = require('path');
var ConfigurationManager = require('./ConfigurationManager').ConfigurationManager;
var configMgr;

configMgr = new ConfigurationManager({'schemaDir' : path.resolve(__dirname , './configs')});
configMgr.load();

module.exports = configMgr.config;
