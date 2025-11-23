'use strict';

const path                 = require('path');
const ConfigurationManager = require('./ConfigurationManager').ConfigurationManager;

const configMgr = new ConfigurationManager({
    'schemaDir' : path.resolve(__dirname, './configs')
});

configMgr.load();

module.exports = configMgr.config;

