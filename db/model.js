// get models from the schema based on the schema name like 'user'
const path = require('path');
const fs = require('fs');

// Cache for loaded models
const modelCache = {};

/**
 * Get a model by schema name
 * @param {string} schemaName - The name of the schema (e.g., 'user')
 * @returns {mongoose.Model} The mongoose model
 */
function getModel(schemaName) {
    // Return cached model if available
    if (modelCache[schemaName]) {
        return modelCache[schemaName];
    }

    // Construct the schema file path
    const schemaPath = path.join(__dirname, 'schema', `${schemaName}.js`);
    
    // Check if schema file exists
    if (!fs.existsSync(schemaPath)) {
        throw new Error(`Schema file not found: ${schemaPath}`);
    }

    // Require and cache the model
    const model = require(schemaPath);
    modelCache[schemaName] = model;
    
    return model;
}

module.exports = getModel;
