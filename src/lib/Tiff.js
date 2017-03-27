/**
 * Node.JS module for external tiff.js library usage.
 * Source: http://seikichi.github.io/tiff.js
 */
const path = require('path');
const Tiff = require(path.join(__dirname, "tiff", "tiff.min.js"));
Tiff.initialize({TOTAL_MEMORY: 16777216 * 10});
module.exports = Tiff;