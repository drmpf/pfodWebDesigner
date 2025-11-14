/*
   chartDisplay.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

/**
 * ChartDisplay - Handles chart creation, rendering, and updates
 * Works with JSFreeChart library for XY plotting
 * Supports limiting displayed data points to manageable dataset size
 */
class ChartDisplay {
  constructor() {
    this.currentChart = null;      // Current chart instance
    this.currentDataset = null;    // Current dataset
    this.currentLabels = null;     // Current field labels
    this.dataPointLimit = 500;     // Default limit for displayed points
    this.lastDataLineCount = 0;    // Track processed CSV lines
    this.updateInterval = null;    // Polling interval handle
    this.currentCanvas = null;     // Reference to active chart canvas
    this.lastCanvasWidth = 0;      // Track previous canvas width for resize detection
    this.lastCanvasHeight = 0;     // Track previous canvas height for resize detection
    console.log('[CHART_DISPLAY] ChartDisplay instance created');
  }

  /**
   * Parse chart labels from response message format
   * Handles JSON parser array format where pipes split the response:
   * {=Test Data|count|l1|l2} becomes ["{=Test Data", "|count", "|l1", "|l2"]
   *
   * If there's a | it's always a field label (no limits in format for now)
   * Output: {title: "Title", labels: ["count", "l1", "l2"], limit: 500} or null if no labels
   *
   * @param {array} cmdArray - The cmd array from JSON-parsed response
   * @returns {object|null} - Chart info object or null for raw data display
   */
  parseChartLabels(cmdArray) {
    console.log('[CHART_DISPLAY] parseChartLabels called with array:', cmdArray);

    if (!Array.isArray(cmdArray) || cmdArray.length === 0) {
      console.log('[CHART_DISPLAY] Not a valid array or empty, returning null');
      return null;
    }

    // Parse first element to extract title
    // Format: {=Title
    const firstElem = cmdArray[0];
    const eqIdx = firstElem.indexOf('=');
    if (eqIdx === -1) {
      console.log('[CHART_DISPLAY] No "=" found in first element, returning null');
      return null;
    }

    const title = firstElem.substring(eqIdx + 1).trim();
    console.log('[CHART_DISPLAY] Extracted title:', title);

    // If only first element, no fields - this is raw data
    if (cmdArray.length === 1) {
      console.log('[CHART_DISPLAY] Only title, no fields - this is raw data');
      return null;
    }

    // Extract field labels from remaining array elements
    // Only elements with | prefix are field labels: "|count", "|l1", "|l2"
    // Elements without | (like closing "}") are not field labels
    const labels = cmdArray.slice(1)
      .filter(elem => typeof elem === 'string' && elem.startsWith('|'))
      .map(elem => elem.substring(1).trim())
      .filter(elem => elem.length > 0);

    console.log('[CHART_DISPLAY] Extracted field labels:', labels);

    if (labels.length === 0) {
      // No fields - treat as raw data
      console.log('[CHART_DISPLAY] No field labels found, returning null');
      return null;
    }

    const limit = 500; // Default limit (500 CSV lines)
    console.log('[CHART_DISPLAY] Parsed chart - title:', title, 'labels:', labels, 'limit:', limit, 'CSV lines');
    return {
      title: title,
      labels: labels,
      limit: limit
    };
  }

  /**
   * Load CSV data from collector for specified field count
   * @param {number} fieldCount - Number of fields to match
   * @returns {array} - Array of CSV line strings (each line terminated by newline in original)
   */
  loadCSVData(fieldCount) {
    if (!window.csvCollector) {
      console.error('[CHART_DISPLAY] csvCollector not available');
      return [];
    }

    const csvLines = window.csvCollector.getCSVLines(fieldCount);
    console.log('[CHART_DISPLAY] Loaded', csvLines.length, 'CSV lines for field count', fieldCount);
    return csvLines;
  }

  /**
   * Get limited subset of CSV lines (last N lines)
   * Keeps only the most recent N lines (last N newline-terminated records)
   * @param {array} csvLines - Full array of CSV lines
   * @param {number} limit - Maximum number of lines to return
   * @returns {array} - Limited array (last N lines)
   */
  getLimitedLines(csvLines, limit) {
    if (csvLines.length <= limit) {
      return csvLines;
    }
    const startIdx = csvLines.length - limit;
    return csvLines.slice(startIdx);
  }

  /**
   * Parse CSV data and create StandardXYDataset
   * First field becomes X-axis data, remaining fields become Y-axis series
   * Only uses last N CSV lines based on limit
   * @param {array} csvLines - Array of CSV line strings
   * @param {array} labels - Field labels [xFieldName, yField1Name, yField2Name, ...]
   * @param {number} limit - Maximum number of CSV lines to include
   * @returns {object} - jsfc.StandardXYDataset with data
   */
  parseCSVToDataset(csvLines, labels, limit = 500) {
    if (!csvLines || csvLines.length === 0) {
      console.warn('[CHART_DISPLAY] No CSV lines to parse');
      return null;
    }

    if (!labels || labels.length < 2) {
      console.error('[CHART_DISPLAY] Need at least 2 labels (x-axis and 1 y-series)');
      return null;
    }

    // Limit to last N CSV lines (newline-terminated records)
    const limitedLines = this.getLimitedLines(csvLines, limit);
    console.log('[CHART_DISPLAY] Using', limitedLines.length, 'of', csvLines.length, 'CSV lines (limit:', limit, ')');

    const dataset = new jsfc.StandardXYDataset();
    const xFieldName = labels[0];
    const yFieldNames = labels.slice(1);

    console.log('[CHART_DISPLAY] Creating dataset with X-axis:', xFieldName, 'Y-series:', yFieldNames);

    // Parse each CSV line
    for (const line of limitedLines) {
      const fields = line.split(',').map(f => f.trim());

      if (fields.length < labels.length) {
        console.warn('[CHART_DISPLAY] Line has fewer fields than labels, skipping:', line);
        continue;
      }

      // First field is X value
      const xValue = parseFloat(fields[0]);
      if (isNaN(xValue)) {
        console.warn('[CHART_DISPLAY] Invalid X value:', fields[0]);
        continue;
      }

      // Remaining fields are Y values for each series
      for (let i = 0; i < yFieldNames.length; i++) {
        const yValue = parseFloat(fields[i + 1]);
        if (!isNaN(yValue)) {
          dataset.add(yFieldNames[i], xValue, yValue);
        }
      }
    }

    console.log('[CHART_DISPLAY] Dataset created with', limitedLines.length, 'data points');
    console.log('[CHART_DISPLAY] Dataset series count:', dataset.seriesCount());
    for (let s = 0; s < dataset.seriesCount(); s++) {
      console.log('[CHART_DISPLAY] Series', s, ':', dataset.seriesKey(s));
    }
    return dataset;
  }

  /**
   * Create chart and render to canvas
   * @param {string} title - Chart title
   * @param {object} dataset - jsfc.StandardXYDataset
   * @param {array} labels - Field labels
   * @param {HTMLCanvasElement} canvas - Target canvas element
   * @returns {object} - Chart instance
   */
  createAndDisplayChart(title, dataset, labels, canvas) {
    if (!canvas) {
      console.error('[CHART_DISPLAY] Canvas element not provided');
      return null;
    }

    // If dataset is null/empty, create an empty one that will be populated as data arrives
    if (!dataset) {
      console.log('[CHART_DISPLAY] No dataset provided, creating empty dataset');
      dataset = new jsfc.StandardXYDataset();
    }

    console.log('[CHART_DISPLAY] Creating chart:', title);

    try {
      // Store canvas reference for resize handling
      this.currentCanvas = canvas;

      // Resize canvas to fill available space
      this.resizeCanvasToFitSpace(canvas);

      // Get canvas context (wrapped with JSFreeChart's CanvasContext2D)
      const ctx = new jsfc.CanvasContext2D(canvas);

      // Get canvas dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      console.log('[CHART_DISPLAY] Canvas dimensions:', canvasWidth, 'x', canvasHeight);

      // Create axes
      console.log('[CHART_DISPLAY] Creating X axis with label:', labels[0]);
      const xAxis = new jsfc.LinearAxis(labels[0]); // X-axis label from first field
      xAxis.setAutoRange(true);
      console.log('[CHART_DISPLAY] X axis created');

      const yAxisLabel = 'Values'; // Generic Y-axis label
      console.log('[CHART_DISPLAY] Creating Y axis with label:', yAxisLabel);
      const yAxis = new jsfc.LinearAxis(yAxisLabel);
      yAxis.setAutoRange(true);
      console.log('[CHART_DISPLAY] Y axis created');

      // Create renderer for multiple lines
      console.log('[CHART_DISPLAY] Creating renderer');
      const renderer = new jsfc.XYLineRenderer();
      console.log('[CHART_DISPLAY] Renderer created');

      // Set up colors for series
      const colors = [
        new jsfc.Color(0, 0, 255),      // Blue
        new jsfc.Color(255, 0, 0),      // Red
        new jsfc.Color(0, 128, 0),      // Green
        new jsfc.Color(255, 128, 0),    // Orange
        new jsfc.Color(128, 0, 128),    // Purple
        new jsfc.Color(0, 128, 128),    // Teal
        new jsfc.Color(255, 192, 203),  // Pink
        new jsfc.Color(165, 42, 42)     // Brown
      ];

      // Apply colors to series via ColorSource
      console.log('[CHART_DISPLAY] Creating ColorSource with', colors.length, 'colors');
      const colorSource = new jsfc.ColorSource(colors);
      console.log('[CHART_DISPLAY] ColorSource created, setting on renderer');
      renderer.setLineColorSource(colorSource);
      console.log('[CHART_DISPLAY] Line color source set on renderer');
      console.log('[CHART_DISPLAY] Colors:', colors.map(c => 'RGB(' + c._red + ',' + c._green + ',' + c._blue + ')').join(', '));
      console.log('[CHART_DISPLAY] Renderer line color source:', renderer.getLineColorSource ? renderer.getLineColorSource() : 'no getLineColorSource method');
      if (renderer.getLineColorSource) {
        const rcs = renderer.getLineColorSource();
        console.log('[CHART_DISPLAY] Renderer LineColorSource class:', rcs.constructor.name);
        console.log('[CHART_DISPLAY] First color from renderer ColorSource:', rcs.getColor(0, 0) ? 'RGB(' + rcs.getColor(0, 0)._red + ',' + rcs.getColor(0, 0)._green + ',' + rcs.getColor(0, 0)._blue + ')' : 'undefined');
      }

      // Create plot
      console.log('[CHART_DISPLAY] Creating XYPlot');
      const plot = new jsfc.XYPlot(dataset);
      console.log('[CHART_DISPLAY] Setting X axis');
      plot.setXAxis(xAxis);
      console.log('[CHART_DISPLAY] Setting Y axis');
      plot.setYAxis(yAxis);
      console.log('[CHART_DISPLAY] Setting renderer (XYLineRenderer for lines, not dots)');
      plot.setRenderer(renderer);
      console.log('[CHART_DISPLAY] Renderer set, checking plot renderer:', plot.getRenderer ? 'getRenderer method exists' : 'no getRenderer');
      if (plot.getRenderer) {
        const plotRenderer = plot.getRenderer();
        console.log('[CHART_DISPLAY] Plot.getRenderer() returned:', plotRenderer ? 'object' : 'null/undefined');
        if (plotRenderer) {
          console.log('[CHART_DISPLAY] Plot renderer is same as our renderer?', plotRenderer === renderer);
          console.log('[CHART_DISPLAY] Plot renderer class:', plotRenderer.constructor.name);
        }
      }
      console.log('[CHART_DISPLAY] Setting axis offsets');
      // Insets: (top, left, bottom, right) - increased to prevent label/legend overlap
      // Left: 80 px for Y-axis numbers
      // Bottom: 100 px for X-axis labels and legend
      // Top: 60 px for title
      // Right: 60 px standard
      plot.setAxisOffsets(new jsfc.Insets(4, 4, 4, 4));
      console.log('[CHART_DISPLAY] Plot created');

      // Create chart with title
      console.log('[CHART_DISPLAY] Creating Chart instance');
      const chart = new jsfc.Chart(plot);
      console.log('[CHART_DISPLAY] Chart created, now setting title');
      chart.setTitle(title);
      console.log('[CHART_DISPLAY] Chart title set');

      // Store chart reference for resize and update handling
      this.currentChart = chart;
      console.log('[CHART_DISPLAY] Chart stored in this.currentChart for resize handling');

      // CRITICAL: Set chart size to match canvas (like LineChartDemo does)
      // This initializes the chart's internal layout (axes, legend, plot area) for the canvas size
      console.log('[CHART_DISPLAY] Setting chart initial size to', canvasWidth, 'x', canvasHeight);
      chart.setSize(canvasWidth-80, canvasHeight-80);
      console.log('[CHART_DISPLAY] Chart size set');

      // Draw to canvas
      console.log('[CHART_DISPLAY] Creating bounds rectangle');
      const bounds = new jsfc.Rectangle(0, 0, canvasWidth-0, canvasHeight-0);
      console.log('[CHART_DISPLAY] Bounds created');
      console.log('[CHART_DISPLAY] Bounds:', bounds, 'x()=', bounds.x(), 'y()=', bounds.y(), 'width()=', bounds.width(), 'height()=', bounds.height());
      console.log('[CHART_DISPLAY] About to call chart.draw()');
      chart.draw(ctx, bounds);

      console.log('[CHART_DISPLAY] Chart rendered successfully');

      return chart;
    } catch (error) {
      console.error('[CHART_DISPLAY] Error creating chart:', error);
      console.error('[CHART_DISPLAY] Error stack:', error.stack);
      return null;
    }
  }

  /**
   * Update chart with new CSV data
   * Keeps only last N CSV lines based on limit (sliding window)
   * Appends new data points and rescales axes
   * @param {object} chart - Chart instance
   * @param {array} allCSVLines - All CSV lines (including new ones)
   * @param {array} labels - Field labels
   * @param {number} limit - CSV line limit (newline-terminated records to display)
   * @param {HTMLCanvasElement} canvas - Target canvas for redraw
   */
  updateChartWithNewData(chart, allCSVLines, labels, limit, canvas) {
    // Double-check: if no longer in chart mode, don't update (safety measure)
    if (!window.isInChartMode) {
      return;
    }

    if (!chart || !canvas) {
      return;
    }

    // Check if we have new data since last update
    if (allCSVLines.length <= this.lastDataLineCount) {
      return; // No new data
    }

    console.log('[CHART_DISPLAY] Updating chart with new data. Previous:', this.lastDataLineCount, 'Current:', allCSVLines.length);

    // Get limited subset and recreate dataset with visible data
    const limitedLines = this.getLimitedLines(allCSVLines, limit);
    const newDataset = this.parseCSVToDataset(allCSVLines, labels, limit);
    if (newDataset) {
      // Update plot's dataset (not chart)
      // Note: setDataset automatically reconfigures axes to auto-range
      const plot = chart.getPlot();
      if (plot) {
        plot.setDataset(newDataset);
      }

      // Ensure chart size is set correctly before redrawing
      chart.setSize(canvas.width-80, canvas.height-80);

      // Redraw (wrapped with JSFreeChart's CanvasContext2D)
      const ctx = new jsfc.CanvasContext2D(canvas);
      const bounds = new jsfc.Rectangle(0, 0, canvas.width-0, canvas.height-0);
      chart.draw(ctx, bounds);

      this.lastDataLineCount = allCSVLines.length;
      console.log('[CHART_DISPLAY] Chart updated - showing', limitedLines.length, 'of', allCSVLines.length, 'CSV lines');
    }
  }

  /**
   * Start polling for new CSV data and update chart
   * Polls for new newline-terminated CSV lines
   * @param {object} chart - Chart instance
   * @param {number} fieldCount - Number of fields for CSV lookup
   * @param {array} labels - Field labels
   * @param {number} limit - CSV line limit (newline-terminated records)
   * @param {HTMLCanvasElement} canvas - Canvas to render to
   * @param {number} interval - Polling interval in milliseconds (default 500)
   */
  startUpdatePolling(chart, fieldCount, labels, limit, canvas, interval = 500) {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }

    console.log('[CHART_DISPLAY] Starting update polling with interval:', interval, 'ms, limit:', limit, 'CSV lines');

    this.updateInterval = setInterval(() => {
      // If no longer in chart mode, ignore this poll
      if (!window.isInChartMode) {
        return;
      }

      if (!window.csvCollector) {
        return;
      }

      const allLines = window.csvCollector.getCSVLines(fieldCount);
      this.updateChartWithNewData(chart, allLines, labels, limit, canvas);
    }, interval);
  }

  /**
   * Stop polling for updates
   */
  stopUpdatePolling() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('[CHART_DISPLAY] Stopped update polling');
    }
  }

  /**
   * Resize canvas to fill available space (accounting for layout and divider)
   * @param {HTMLCanvasElement} canvas - Canvas element to resize
   * @returns {boolean} - True if canvas was resized, false otherwise
   */
  resizeCanvasToFitSpace(canvas) {
    if (!canvas) {
      console.log('[CHART_DISPLAY] resizeCanvasToFitSpace: canvas is null/undefined');
      return false;
    }

    // Get the canvas wrapper's actual visible dimensions
    const wrapper = canvas.parentElement; // canvas-wrapper
    if (!wrapper) {
      console.log('[CHART_DISPLAY] resizeCanvasToFitSpace: parent wrapper not found');
      return false;
    }

    // Use getBoundingClientRect to get actual available dimensions
    const rect = wrapper.getBoundingClientRect();
    console.log('[CHART_DISPLAY] resizeCanvasToFitSpace: wrapper rect =', {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top
    });

    // Calculate new dimensions (accounting for small margin)
    const newWidth = Math.max(Math.floor(rect.width - 2), 200);
    const newHeight = Math.max(Math.floor(rect.height - 2), 200);

    console.log('[CHART_DISPLAY] resizeCanvasToFitSpace: calculated dimensions =', {
      newWidth,
      newHeight,
      lastWidth: this.lastCanvasWidth,
      lastHeight: this.lastCanvasHeight
    });

    // Check if dimensions actually changed
    if (this.lastCanvasWidth === newWidth && this.lastCanvasHeight === newHeight) {
      console.log('[CHART_DISPLAY] resizeCanvasToFitSpace: dimensions unchanged, skipping');
      return false; // No resize needed
    }

    // Update canvas pixel dimensions
    canvas.width = newWidth;
    canvas.height = newHeight;

    // Track new dimensions
    this.lastCanvasWidth = newWidth;
    this.lastCanvasHeight = newHeight;

    console.log('[CHART_DISPLAY] Canvas resized to:', newWidth, 'x', newHeight);
    return true; // Canvas was resized
  }

  /**
   * Handle window resize event for chart display
   * Resizes canvas and redraws chart if dimensions changed
   * Calls chart.setSize() to inform chart of new dimensions (like LineChartDemo)
   * @param {HTMLCanvasElement} canvas - Canvas element
   */
  handleResize(canvas) {
    console.log('[CHART_DISPLAY] handleResize() called, canvas exists:', !!canvas, 'chart exists:', !!this.currentChart);

    if (!canvas || !this.currentChart) {
      console.log('[CHART_DISPLAY] handleResize: early return - canvas or chart missing');
      return;
    }

    // Attempt to resize canvas to fit available space
    const wasResized = this.resizeCanvasToFitSpace(canvas);
    console.log('[CHART_DISPLAY] handleResize: canvas was resized:', wasResized);

    if (wasResized) {
      // Canvas dimensions changed, tell chart about new size and redraw
      console.log('[CHART_DISPLAY] Redrawing chart after resize, new size:', canvas.width, 'x', canvas.height);
      try {
        // CRITICAL: Call chart.setSize() to recalculate chart internal layout
        // This tells JSFreeChart to recalculate axes, legend, plot area, etc.
        // without this, the chart won't visually resize even though canvas dimensions change
        this.currentChart.setSize(canvas.width-80, canvas.height-80);
        console.log('[CHART_DISPLAY] Called chart.setSize(' + (canvas.width-80) + ', ' + (canvas.height-80) + ')');

        const ctx = new jsfc.CanvasContext2D(canvas);
        const bounds = new jsfc.Rectangle(0, 0, canvas.width-0, canvas.height-0);
        this.currentChart.draw(ctx, bounds);
        console.log('[CHART_DISPLAY] Chart redrawn successfully after resize');
      } catch (error) {
        console.error('[CHART_DISPLAY] Error redrawing chart after resize:', error);
      }
    }
  }

  /**
   * Clear current chart state
   */
  clear() {
    this.stopUpdatePolling();
    this.currentChart = null;
    this.currentDataset = null;
    this.currentLabels = null;
    this.currentCanvas = null;
    this.lastDataLineCount = 0;
    this.lastCanvasWidth = 0;
    this.lastCanvasHeight = 0;
    console.log('[CHART_DISPLAY] Cleared chart state');
  }
}

// Make class available globally for browser use
window.ChartDisplay = ChartDisplay;
