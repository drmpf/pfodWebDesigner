/*
   csvCollector.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

/**
 * CSVCollector - Processes raw character stream to extract CSV data
 * Operates independently from message fragmentation
 *
 * CSV Data Detection:
 * - Starts after } (closing brace of pfod command) or after line terminator
 * - Ends at line terminator (\r, \n, or \r\n)
 * - Ignored inside {} (pfod commands)
 *
 * Organization:
 * - Separated into files by field count (# of commas + 1)
 * - Each file contains only CSV lines, no timestamps or headers
 */
class CSVCollector {
  constructor() {
    this.csvByFieldCount = {}; // { fieldCount: [lines...], ... }
    this.currentLine = '';     // Buffer for current CSV line being built
    this.inCSVMode = false;    // Are we collecting CSV (after } or line break)?
    this.braceDepth = 0;       // Track { } nesting depth
    // console.log('[CSV_COLLECTOR Created - character-stream CSV extraction');
  }

  /**
   * Process a string character-by-character from raw device data
   * Called from SerialConnection.startReading() and BLEConnection.handleCharacteristicChange()
   * BEFORE message fragmentation for { } extraction
   * @param {string} text - Raw text from device
   */
  processCharacters(text) {
    for (let i = 0; i < text.length; i++) {
      this.processChar(text[i]);
    }
  }

  /**
   * Process a single character from the raw stream
   * @param {string} char - Single character
   */
  processChar(char) {
    // Track brace depth for pfod commands { ... }
    if (char === '{') {
      this.braceDepth++;
      // When entering braces, we're not in CSV mode
      this.inCSVMode = false;
      return;
    }

    if (char === '}') {
      this.braceDepth--;
      if (this.braceDepth < 0) {
        this.braceDepth = 0;
      }
      // After closing brace, CSV mode is ready to start on next char
      if (this.braceDepth === 0) {
        this.inCSVMode = true; // Next char (if not line break) starts CSV
      }
      return;
    }

    // Inside braces: skip (don't collect as CSV)
    if (this.braceDepth > 0) {
      return;
    }

    // Outside braces: check for CSV or line terminators
    if (char === '\r' || char === '\n') {
      // Line terminator: save current line if we were in CSV mode
      if (this.inCSVMode && this.currentLine.trim().length > 0) {
        this.addCSVLine(this.currentLine.trim());
      }
      this.currentLine = '';
      this.inCSVMode = true; // After line break, ready for more CSV
      return;
    }

    // Regular character: collect if in CSV mode
    if (this.inCSVMode) {
      this.currentLine += char;
    }
  }

  /**
   * Add a complete CSV line to the appropriate bucket based on field count
   * @param {string} line - The complete CSV line (trimmed)
   */
  addCSVLine(line) {
    // Count fields: # of commas + 1
    const fieldCount = line.split(',').length;

    // Initialize bucket if needed
    if (!this.csvByFieldCount[fieldCount]) {
      this.csvByFieldCount[fieldCount] = [];
      // console.log('[CSV_COLLECTOR New CSV format detected: ${fieldCount} fields`);
    }

    // Add line to bucket
    this.csvByFieldCount[fieldCount].push(line);
    // console.log('[CSV_COLLECTOR Added line (${fieldCount} fields): ${line.substring(0, 60)}${line.length > 60 ? '...' : ''}`);
  }

  /**
   * Get all field counts that have been collected
   * @returns {array} - Sorted array of field counts
   */
  getFieldCounts() {
    return Object.keys(this.csvByFieldCount)
      .map(k => parseInt(k))
      .sort((a, b) => a - b);
  }

  /**
   * Get CSV lines for a specific field count
   * @param {number} fieldCount - Number of fields
   * @returns {array} - Array of CSV lines
   */
  getCSVLines(fieldCount) {
    return this.csvByFieldCount[fieldCount] || [];
  }

  /**
   * Get number of lines for a specific field count
   * @param {number} fieldCount - Number of fields
   * @returns {number} - Line count
   */
  getLineCount(fieldCount) {
    return this.getCSVLines(fieldCount).length;
  }

  /**
   * Export CSV data for a specific field count as plain text
   * Format: Line1\nLine2\nLine3...
   * NO timestamps, headers, or other metadata - just CSV lines
   * @param {number} fieldCount - Number of fields
   * @returns {string} - Plain text CSV data
   */
  exportAsText(fieldCount) {
    const lines = this.getCSVLines(fieldCount);
    return lines.length > 0 ? lines.join('\n') : '';
  }

  /**
   * Export all CSV data organized by field count
   * @returns {object} - { fieldCount: "line1\nline2\n...", ... }
   */
  exportAll() {
    const result = {};
    for (const fieldCount of this.getFieldCounts()) {
      const text = this.exportAsText(fieldCount);
      if (text.length > 0) {
        result[fieldCount] = text;
      }
    }
    return result;
  }

  /**
   * Get statistics about collected CSV data
   * @returns {object} - Stats by field count
   */
  getStats() {
    const stats = {};
    for (const fieldCount of this.getFieldCounts()) {
      const lines = this.getCSVLines(fieldCount);
      stats[fieldCount] = {
        fieldCount: fieldCount,
        lineCount: lines.length,
        totalBytes: lines.reduce((sum, line) => sum + line.length, 0)
      };
    }
    return stats;
  }

  /**
   * Get total statistics
   * @returns {object} - Total counts
   */
  getTotalStats() {
    const stats = this.getStats();
    let totalLines = 0;
    let totalBytes = 0;
    for (const fieldCount of this.getFieldCounts()) {
      totalLines += stats[fieldCount].lineCount;
      totalBytes += stats[fieldCount].totalBytes;
    }
    return {
      totalLines: totalLines,
      totalBytes: totalBytes,
      formatCount: Object.keys(stats).length
    };
  }

  /**
   * Clear all collected CSV data
   */
  clear() {
    this.csvByFieldCount = {};
    this.currentLine = '';
    this.inCSVMode = false;
    this.braceDepth = 0;
    // console.log('[CSV_COLLECTOR Cleared all CSV data');
  }
}

// Make class available globally for browser use
window.CSVCollector = CSVCollector;
