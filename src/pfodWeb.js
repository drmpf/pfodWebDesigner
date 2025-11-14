/*   
   pfodWeb.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Canvas Drawing Application
// Dependencies are loaded as global variables via script tags
// MergeAndRedraw and DrawingManager are available on window object

// DEBUG flag
// any setting of DEBUG other then false or 'false' enables debug
var DEBUG = false
if ((typeof DEBUG === 'undefined') || (DEBUG === false) || (DEBUG === 'false')) {
  if (typeof DEBUG === 'undefined') {
    console.log('[PFODWEB_DEBUG] DEBUG not defined.  Disabling logging');
  } else {
    console.log('[PFODWEB_DEBUG] DEBUG defined as false.  Disabling logging. DEBUG = ',DEBUG);
  }
  // false suppress logging
    if(!window.console) window.console = {};
    var methods = ["log", "debug", "warn", "info"];
    for(var i=0;i<methods.length;i++){
        console[methods[i]] = function(){};
    }
} else {
   console.log('[PFODWEB_DEBUG] DEBUG defined and not false.  Logging Enabled.  DEBUG =',DEBUG);
}


// Dynamic script loader
function loadScript_noDebug(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Load all dependencies in order
async function loadDependencies_noDebug() {
  const dependencies = [
    './version.js',
    './connectionManager.js',
    './csvCollector.js',
    './rawDataCollector.js',
    './jsfreechart/src/JSFreeChart.js',
    './jsfreechart/src/Module.js',
    './jsfreechart/src/Args.js',
    './jsfreechart/src/Utils.js',
    './jsfreechart/src/graphics/Color.js',
    './jsfreechart/src/Colors.js',
    './jsfreechart/src/graphics/Point2D.js',
    './jsfreechart/src/graphics/Rectangle.js',
    './jsfreechart/src/graphics/Dimension.js',
    './jsfreechart/src/graphics/HAlign.js',
    './jsfreechart/src/graphics/RectangleEdge.js',
    './jsfreechart/src/graphics/Insets.js',
    './jsfreechart/src/graphics/Offset2D.js',
    './jsfreechart/src/graphics/Scale2D.js',
    './jsfreechart/src/graphics/Fit2D.js',
    './jsfreechart/src/graphics/Stroke.js',
    './jsfreechart/src/graphics/TextAnchor.js',
    './jsfreechart/src/graphics/Font.js',
    './jsfreechart/src/graphics/LineCap.js',
    './jsfreechart/src/graphics/LineJoin.js',
    './jsfreechart/src/graphics/RefPt2D.js',
    './jsfreechart/src/graphics/Anchor2D.js',
    './jsfreechart/src/graphics/BaseContext2D.js',
    './jsfreechart/src/graphics/CanvasContext2D.js',
    './jsfreechart/src/data/Map.js',
    './jsfreechart/src/data/Range.js',
    './jsfreechart/src/data/StandardXYDataset.js',
    './jsfreechart/src/data/XYDatasetUtils.js',
    './jsfreechart/src/data/KeyedValues2DDataset.js',
    './jsfreechart/src/table/BaseElement.js',
    './jsfreechart/src/table/TableElement.js',
    './jsfreechart/src/table/TextElement.js',
    './jsfreechart/src/table/StandardRectanglePainter.js',
    './jsfreechart/src/table/FlowElement.js',
    './jsfreechart/src/table/RectangleElement.js',
    './jsfreechart/src/table/GridElement.js',
    './jsfreechart/src/renderer/ColorSource.js',
    './jsfreechart/src/renderer/StrokeSource.js',
    './jsfreechart/src/renderer/BaseXYRenderer.js',
    './jsfreechart/src/renderer/ScatterRenderer.js',
    './jsfreechart/src/renderer/XYLineRenderer.js',
    './jsfreechart/src/util/Format.js',
    './jsfreechart/src/util/NumberFormat.js',
    './jsfreechart/src/axis/AxisSpace.js',
    './jsfreechart/src/axis/LabelOrientation.js',
    './jsfreechart/src/axis/TickMark.js',
    './jsfreechart/src/axis/NumberTickSelector.js',
    './jsfreechart/src/axis/ValueAxis.js',
    './jsfreechart/src/axis/BaseValueAxis.js',
    './jsfreechart/src/axis/LinearAxis.js',
    './jsfreechart/src/labels/StandardXYLabelGenerator.js',
    './jsfreechart/src/legend/LegendBuilder.js',
    './jsfreechart/src/legend/LegendItemInfo.js',
    './jsfreechart/src/legend/StandardLegendBuilder.js',
    './jsfreechart/src/plot/XYPlot.js',
    './jsfreechart/src/Chart.js',
    './jsfreechart/src/Charts.js',
    './chartDisplay.js',
    './caching.js',
    './messageViewer.js',
    './DrawingManager.js',
    './displayTextUtils.js',
    './redraw.js',
    './drawingMerger.js',
    './webTranslator.js',
    './drawingDataProcessor.js',
    './pfodWebMouse.js',
    './pfodWebDebug.js'
  ];

  for (const dep of dependencies) {
    await loadScript_noDebug(dep);
  }
}

// Event Listeners
window.addEventListener('DOMContentLoaded', async () => {
  await loadDependencies_noDebug();
  await initializeApp();
});

