// Shared constants to avoid circular dependencies
  var JS_VERSION = "V3.0.2 -- 15th Novemeber 2025";
// V3.0.2 disable refresh in chart mode fixed value scaling
// V3.0.1 auto chart option on startup
// V3.0.0 added initial charting support
// V2.0.4 fixed scaling for nested dwgs
// V2.0.3 fixed transform for nested dwgs
// V2.0.2 fixed transform pushZero for nested dwgs
// V2.0.1 edit to .ino files
// V2.0.0 removed nodejs server, bundled all files in single htmls
// V1.1.5 added init() of drawings
// V1.1.4 added pfodMainDrawing.h generated file
// V1.1.3 dwg updates as response received

// Make available globally for browser use
if (typeof window !== 'undefined') {
    window.JS_VERSION = JS_VERSION;
}

// Export for Node.js use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { JS_VERSION };
}