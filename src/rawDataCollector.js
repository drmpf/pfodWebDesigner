/*
   rawDataCollector.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

/**
 * RawDataCollector - Processes raw character stream to collect ALL data outside {...}
 * Operates independently from message fragmentation
 *
 * Raw Data Collection:
 * - Collects ALL characters outside {} (pfod commands)
 * - Preserves all data including newlines, spaces, etc.
 * - Accumulates continuously as device sends data
 * - Resets when new raw data display session starts
 */
class RawDataCollector {
  constructor() {
    this.rawData = '';        // All collected raw data
    this.braceDepth = 0;      // Track { } nesting depth
    this.wasInBraces = false; // Track if we just exited braces
    this.lastReturnedLength = 0; // Track how much data we've already returned for display
    // console.log('[RAW_DATA_COLLECTOR Created - character-stream raw data extraction');
  }

  /**
   * Process a string character-by-character from raw device data
   * Called from SerialConnection.startReading() and BLEConnection.handleCharacteristicChange()
   * BEFORE message fragmentation for { } extraction
   * @param {string} text - Raw text from device
   */
  processCharacters(text) {
    // console.log('[RAW_DATA_COLLECTOR processCharacters called with ${text.length} chars: ${JSON.stringify(text.substring(0, 50))}`);
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
      this.wasInBraces = false;
      // console.log('[RAW_DATA_COLLECTOR Found opening brace, depth now: ${this.braceDepth}`);
      return;
    }

    if (char === '}') {
      this.braceDepth--;
      if (this.braceDepth < 0) {
        this.braceDepth = 0;
      }
      // Mark that we just exited braces - add newline on next non-newline character
      if (this.braceDepth === 0) {
        this.wasInBraces = true;
        // console.log('[RAW_DATA_COLLECTOR Exited braces, marked for newline injection`);
      }
      return;
    }

    // Outside braces: collect ALL data (including newlines, spaces, etc.)
    if (this.braceDepth === 0) {
      // If we just exited braces and this isn't a newline, add a newline to replace the {...}
      if (this.wasInBraces && char !== '\n' && char !== '\r') {
        this.rawData += '\n';
        // console.log('[RAW_DATA_COLLECTOR Injected newline after command`);
      }
      this.wasInBraces = false;
      this.rawData += char;
      // console.log('[RAW_DATA_COLLECTOR Collected char: ${JSON.stringify(char)}, total length now: ${this.rawData.length}`);
    } else {
      // console.log('[RAW_DATA_COLLECTOR Inside braces (depth: ${this.braceDepth}), skipping char: ${JSON.stringify(char)}`);
    }
  }

  /**
   * Get all collected raw data
   * @returns {string} - All collected raw data
   */
  getRawData() {
    return this.rawData;
  }

  /**
   * Get raw data WITHOUT clearing it
   * The collector continues accumulating as more data arrives
   * @returns {string} - All collected raw data
   */
  getRawDataWithoutClearing() {
    // console.log('[RAW_DATA_COLLECTOR getRawDataWithoutClearing called - returning ${this.rawData.length} chars`);
    return this.rawData;
  }

  /**
   * Get ONLY new data since we started tracking for display
   * Used to append new chunks to the raw data display without duplication
   * @returns {string} - Only the newly arrived data since last display update
   */
  getNewData() {
    const newData = this.rawData.substring(this.lastReturnedLength);
    // console.log('[RAW_DATA_COLLECTOR getNewData called - returning ${newData.length} new chars (total: ${this.rawData.length}, returned before: ${this.lastReturnedLength})`);
    return newData;
  }

  /**
   * Mark that we've displayed data up to the current point
   * Call this after creating/updating the display to track progress
   */
  markDisplayedUpTo() {
    this.lastReturnedLength = this.rawData.length;
    // console.log('[RAW_DATA_COLLECTOR Marked display progress at ${this.lastReturnedLength} chars`);
  }

  /**
   * Get raw data and clear it (for consumption by raw data display)
   * @returns {string} - All collected raw data
   */
  extractAndClearRawData() {
    const data = this.rawData;
    this.rawData = '';
    // console.log('[RAW_DATA_COLLECTOR Extracted and cleared ${data.length} chars of raw data`);
    return data;
  }

  /**
   * Clear all collected raw data
   */
  clear() {
    this.rawData = '';
    this.braceDepth = 0;
    this.lastReturnedLength = 0;
    // console.log('[RAW_DATA_COLLECTOR Cleared all raw data');
  }

  /**
   * Get statistics about collected data
   * @returns {object} - Stats about raw data
   */
  getStats() {
    return {
      totalBytes: this.rawData.length,
      lineCount: (this.rawData.match(/\n/g) || []).length
    };
  }
}

// Make class available globally for browser use
window.RawDataCollector = RawDataCollector;
