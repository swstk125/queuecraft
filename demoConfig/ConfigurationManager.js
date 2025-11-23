/**
 * Configuration Manager
 * 
 * This module provides centralized configuration management for the UGC application.
 * It uses the Convict library to define configuration schemas, load configuration
 * files, handle environment variable overrides, and validate configuration values.
 * 
 * Key Features:
 * - Automatic schema discovery from JSON files
 * - Environment variable and command-line argument support
 * - Configuration validation with strict mode
 * - Override file support for environment-specific settings
 * - Recursive directory scanning for nested configurations
 * - Application root detection
 * 
 * @author Nestle UGC Server Team
 * @version 1.0.0
 */

'use strict';

// Core dependencies
var fs      = require('fs');        // File system operations
var path    = require('path');      // Path manipulation utilities
var debug   = require('debug');     // Debug logging utility
var _       = require('lodash');    // Utility library
var convict = require('convict');   // Configuration validation library

/**
 * Get Application Root Directory
 * 
 * Traverses up the directory tree from the main module to find the application
 * root directory by looking for package.json. This ensures configuration paths
 * are relative to the correct base directory.
 * 
 * @returns {string} Absolute path to the application root directory
 * @throws {Error} If no suitable root directory with package.json is found
 */
function getApplicationRoot(){
    var path0;
    var path1;

    // Start from the main module filename
    path0 = require.main.filename;

    // Traverse up the directory tree looking for package.json
    while (!fs.existsSync(path.join(path0, 'package.json'))) {
        path1 = path.dirname(path0);
        
        // Check if we've reached the filesystem root
        if (path0 === path1) {
            throw new Error('No suitable root directory was found');
        }
        
        path0 = path1;
    }
    
    return path0;
}

/**
 * ConfigurationManager Constructor
 * 
 * Initializes the configuration manager with options for schema directory,
 * validation settings, and debug logging.
 * 
 * @param {Object} options - Configuration options
 * @param {string} options.schemaDir - Directory containing configuration schema files
 * @param {Object} options.validate - Validation options for Convict
 * @param {string} options.name - Name for debug logging
 */
function ConfigurationManager(options){
    this.options          = options;
    this.schemaDir        = this.options.schemaDir;
    this.options.validate = this.options.validate || {allowed: 'strict'};

    this.debug            = debug(this.options.name || 'configurationmanager');
}

/**
 * Read Configuration Schema
 * 
 * Recursively reads JSON configuration files from the specified directory
 * and builds a complete configuration schema. Supports nested directories
 * and inline schema merging.
 * 
 * @param {string} dir - Directory to read schemas from (defaults to schemaDir)
 * @returns {Object} Complete configuration schema object
 */
ConfigurationManager.prototype.readSchema = function(dir){
    var self;
    var files;
    var jsonSchema;

    self       = this;
    jsonSchema = {};
    dir        = dir || this.schemaDir;
    files      = fs.readdirSync(dir);

    this.debug("files ", files);
    
    // Process each file/directory in the schema directory
    _
        .chain(files)
        .each(function(file){
            var filePath;
            var propName;
            var stats;
            var json;

            filePath = dir + '/' + file;
            stats    = fs.statSync(filePath);

            if(stats.isDirectory()){
                // Recursively process subdirectories
                jsonSchema[file] = self.readSchema(filePath);
            }
            else {
                // Process JSON configuration files
                propName = path.basename(file, ".json");
                json     = require(dir + '/' + file);
                
                if(json.inline){
                    // Inline schemas are merged directly into the parent schema
                    delete json.inline;
                    jsonSchema = _.assign(jsonSchema, json);
                }
                else {
                    // Regular schemas are added as properties
                    jsonSchema[propName] = json;
                }
            }
            return jsonSchema;
        })
        .value();

    return jsonSchema;
};

/**
 * Apply Configuration Overrides
 * 
 * Loads an override configuration file if it exists. Override files allow
 * environment-specific configuration values to be applied on top of the
 * base configuration schema.
 */
ConfigurationManager.prototype.override = function(){
    var appRoot;
    var override;

    appRoot  = this.config.get('app.root');
    override = this.config.get('app.override');

    this.debug('override file %s', override);

    // Check if override file exists
    if( !fs.existsSync(path.resolve(appRoot, override))){
        console.warn("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
        console.warn("X                              X");
        console.warn("X override file does not exist X");
        console.warn("X                              X");
        console.warn("XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX");
        return;
    }

    // Load the override file
    this.config.set('app.override', path.resolve(appRoot, override));
    this.config.loadFile(this.config.get('app.override'));
};

/**
 * Load Complete Configuration
 * 
 * Loads the complete configuration by reading schemas, setting up the
 * application root, applying overrides, and validating the final configuration.
 * This is the main method to initialize the configuration system.
 */
ConfigurationManager.prototype.load = function(){
    // Read all configuration schemas
    this.schema = this.readSchema();

    // Add application root to the schema
    this.schema.app.root = {
        'doc'    : 'Application root directory',
        'default': getApplicationRoot(),
        'env'    : 'APP_ROOT',
        'arg'    : 'app-root'
    };

    // Create Convict configuration instance
    this.config = convict(this.schema);
    
    // Apply any override files
    this.override();
    
    // Validate the final configuration
    this.config.validate(this.options.validate);
};

/**
 * Generate Sample Configuration
 * 
 * Generates and prints a sample configuration file with all default values.
 * Useful for creating initial configuration files or documentation.
 */
ConfigurationManager.prototype.sample = function(){
    var properties;

    // Read schemas and set up application root
    this.schema = this.readSchema();
    this.schema.app.root = {
        'doc'    : 'Application root directory',
        'default': getApplicationRoot(),
        'env'    : 'APP_ROOT',
        'arg'    : 'app-root'
    };

    // Create configuration and get sample properties
    this.config = convict(this.schema);
    properties  = this.config.getProperties();
    properties  = JSON.stringify(properties, null, 4);
    console.log(properties);
};

// Export the ConfigurationManager class
module.exports.ConfigurationManager = ConfigurationManager;

/**
 * Command Line Interface
 * 
 * When run directly (not as a module), provides CLI commands for
 * generating sample configurations and dumping current configuration.
 */
if(!module.parent){
    var configMgr;
    var properties;
    var action;

    action    = process.argv[2];
    configMgr = new ConfigurationManager({schemaDir : "./configs"});

    // Generate sample configuration
    if(action === "sample")
        configMgr.sample();

    // Dump current configuration
    if(action === "dump"){
        configMgr.load();
        properties  = configMgr.config.getProperties();
        properties  = JSON.stringify(properties, null, 4);
        console.log(properties);
    }
}
