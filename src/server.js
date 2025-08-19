/*   
   server.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');
const session = require('express-session');
const translator = require('./server_translator.js');
const touchActionHandler = require('./touchActionHandler.js');
const touchActionInputHandler = require('./touchActionInputHandler.js');
const addItemHideHandler = require('./add-item-hide.js');

// Import JS_VERSION constant from version.js
const { JS_VERSION } = require('./version.js');

const app = express();
const PORT = process.env.PORT || 3000;

// Function to get the local IP address
function getLocalIpAddress() {
    const interfaces = os.networkInterfaces();
    let ipAddress = '';
    
    // Loop through network interfaces
    Object.keys(interfaces).forEach((ifname) => {
        interfaces[ifname].forEach((iface) => {
            // Skip over non-IPv4 and internal/loopback interfaces
            if (iface.family === 'IPv4' && !iface.internal) {
                ipAddress = iface.address;
            }
        });
    });
    
    return ipAddress || 'Unable to determine IP address';
}

// Function to find an available port
const findAvailablePort = (startPort, callback) => {
    let port = startPort;
    
    // Try ports from startPort to startPort + 20
    function tryPort(currentPort) {
        if (currentPort > startPort + 20) {
            // If we've tried 20 ports and none are available, 
            // callback with an error
            return callback(new Error('No available ports found'));
        }
        
        const server = http.createServer();
        
        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                // Port is in use, try the next one
                console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}`);
                tryPort(currentPort + 1);
            } else {
                // Some other error, callback with it
                callback(err);
            }
        });
        
        server.once('listening', () => {
            // Port is available, close the server and callback with the port
            server.close(() => {
                callback(null, currentPort);
            });
        });
        
        server.listen(currentPort);
    }
    
    tryPort(port);
};

// Temporary item storage for add-item preview
let tempItemStorage = {
    drawingName: null, // currently selected drawing in add-item
    item: null // temporary item being edited
};

// Utility function to log JSON responses
const logJsonResponse = (req, data) => {
    console.log(`Sending response to ${req.method} ${req.url}:`);
    console.log(JSON.stringify(data, null, 2));
};

let allocatedIdx = 1; // allocate idx starting from here
let allocatedCmdIdx = 1; // allocate cmd_c cmdIdx starting from here

// Store for canvas drawings
let drawings = {};

// Store for temporary edit copies
let tempEditDrawings = {};

// Store for current main drawing name - now session-based instead of global
// Each browser session will have its own currentMainDrawing stored in req.session.currentMainDrawing
// Global variable removed - drawing context is now properly isolated per session

// Template for a new drawing
const createNewDrawing = (name, x = 50, y = 50, color = 'white', refresh = 0, version = null) => {
    // A refresh value of 0 means no automatic refresh
    const actualRefresh = refresh !== undefined ? refresh : 0; // Ensure explicit 0 is preserved
    return {
        name,
        version: version || `V${Date.now()}`, // Use provided version or generate a timestamp-based one
        x: Math.min(Math.max(x, 1), 255),
        y: Math.min(Math.max(y, 1), 255),
        color,
        refresh: actualRefresh,
        items: []
    };
};

// Global request logger - log ALL requests
app.use((req, res, next) => {
    console.log(`[REQUEST] ${req.method} ${req.url} - Query: ${JSON.stringify(req.query)}`);
    next();
});

// Session configuration for tracking drawing context per browser session
app.use(session({
    secret: 'pfodWeb-drawing-context',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Special handler for touch-actions.html - auto-creates temp drawing (MUST be before static middleware)
app.get('/touch-actions.html', (req, res) => {
    const { tempDrawing, cmdName, cmd } = req.query;
    console.log(`[TOUCH_ACTIONS_ENDPOINT] Request received with tempDrawing="${tempDrawing}", cmdName="${cmdName}", cmd="${cmd}"`);
    
    if (tempDrawing) {
        const tempDrawingName = tempDrawing;
        const originalDrawing = tempDrawing.replace('_touchAction_edit', '');
        
        // Check if temp drawings already exist
        const previewDrawingName = `${originalDrawing}_touchAction_edit_preview`;
        
        console.log(`[TOUCH_ACTIONS_DEBUG] tempDrawingName="${tempDrawingName}", originalDrawing="${originalDrawing}", previewDrawingName="${previewDrawingName}"`);
        console.log(`[TOUCH_ACTIONS_DEBUG] tempEditDrawings[${tempDrawingName}] exists: ${!!tempEditDrawings[tempDrawingName]}`);
        console.log(`[TOUCH_ACTIONS_DEBUG] tempEditDrawings[${previewDrawingName}] exists: ${!!tempEditDrawings[previewDrawingName]}`);
        console.log(`[TOUCH_ACTIONS_DEBUG] drawings[${originalDrawing}] exists: ${!!drawings[originalDrawing]}`);
        
        // Check if we're returning from touchAction item editing - if so, preserve existing temp drawings
        const referer = req.get('Referer') || '';
        const returningFromItemEdit = referer.includes('add-touchAction-item.html');
        
        if (returningFromItemEdit && tempEditDrawings[tempDrawingName] && tempEditDrawings[previewDrawingName]) {
            console.log(`Returning from touchAction item editing - preserving existing temp drawings with updates`);
            // Don't recreate temp drawings to preserve touchAction item updates
            // Skip temp drawing creation and just serve the HTML file
            return res.sendFile(path.join(__dirname, 'touch-actions.html'));
        } else {
            // Recreate touchAction temp drawings from current main drawing to ensure up-to-date data
            if (tempEditDrawings[tempDrawingName]) {
                console.log(`Removing existing touchAction temp drawing: ${tempDrawingName} (recreating from current main drawing)`);
                delete tempEditDrawings[tempDrawingName];
            }
            if (tempEditDrawings[previewDrawingName]) {
                console.log(`Removing existing touchAction preview temp drawing: ${previewDrawingName} (recreating from current main drawing)`);
                delete tempEditDrawings[previewDrawingName];
            }
        }
        
        console.log(`Creating touchAction temp drawings: ${tempDrawingName} and ${previewDrawingName}`);
        
        // Use the proper touchActionHandler to create the isolated environment
        const result = touchActionHandler.createTouchActionTempCopy(req, res, drawings, tempEditDrawings);
        
        if (!result.success) {
            return res.status(500).send(`Failed to create touchAction temp drawings: ${result.error}`);
        }
        
        console.log(`Created touchAction temp drawings using touchActionHandler: ${tempDrawingName} and ${previewDrawingName}`);
    }
    
    // Serve the touch-actions.html file
    res.sendFile(path.join(__dirname, 'touch-actions.html'));
});

// Route for select-touchaction-index.html (index selection page)
app.get('/select-touchaction-index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'select-touchaction-index.html'));
});

// Special handler for add-touchAction-item.html - creates item edit temp drawing (MUST be before static middleware)
app.get('/add-touchAction-item.html', (req, res) => {
    const { tempDrawing, cmdName } = req.query;
    
    console.log(`[ADD_TOUCHACTION_ITEM] Request received - tempDrawing="${tempDrawing}", cmdName="${cmdName}"`);
    
    if (!tempDrawing || !cmdName) {
        console.error('[ADD_TOUCHACTION_ITEM] Missing required parameters: tempDrawing and cmdName');
        return res.status(400).send('Missing required parameters: tempDrawing and cmdName');
    }
    
    // tempDrawing should be the touchAction edit drawing (e.g., "t_touchAction_edit")
    if (!tempDrawing.endsWith('_touchAction_edit')) {
        console.error(`[ADD_TOUCHACTION_ITEM] Invalid tempDrawing format: ${tempDrawing}`);
        return res.status(400).send('Invalid tempDrawing format - must end with _touchAction_edit');
    }
    
    // Check if the touchAction edit drawing exists
    if (!tempEditDrawings[tempDrawing]) {
        console.error(`[ADD_TOUCHACTION_ITEM] TouchAction edit drawing not found: ${tempDrawing}`);
        return res.status(404).send(`TouchAction edit drawing "${tempDrawing}" not found`);
    }
    
    // Create the item edit temp drawing name
    const itemEditDrawingName = tempDrawing.replace('_touchAction_edit', '_touchAction_item_edit');
    
    console.log(`[ADD_TOUCHACTION_ITEM] Creating item edit temp drawing: ${itemEditDrawingName}`);
    
    try {
        // Get the touchAction edit drawing to copy structure from
        // This ensures we have the current touchAction items being edited
        const touchActionEditDrawing = tempEditDrawings[tempDrawing];
        if (!touchActionEditDrawing) {
            throw new Error(`TouchAction edit drawing "${tempDrawing}" not found`);
        }
        
        // Create the item edit temp drawing by copying the touchAction edit drawing
        // This gives the full context including current touchAction items
        const itemEditData = JSON.parse(JSON.stringify(touchActionEditDrawing.data));
        itemEditData.name = itemEditDrawingName;
        itemEditData.version = `V${Date.now()}`;
        itemEditData.refresh = 0; // Disable refresh during editing
        
        tempEditDrawings[itemEditDrawingName] = {
            originalName: touchActionEditDrawing.originalName,
            data: itemEditData,
            updates: [],
            mode: 'touchActionItem',
            tempPreviewItem: null
        };
        
        console.log(`[ADD_TOUCHACTION_ITEM] Created item edit temp drawing: ${itemEditDrawingName} from touchAction edit: ${tempDrawing}`);
        
        res.sendFile(path.join(__dirname, 'add-touchAction-item.html'));
    } catch (error) {
        console.error(`[ADD_TOUCHACTION_ITEM] Error creating item edit temp drawing:`, error);
        res.status(500).send(`Failed to create item edit temp drawing: ${error.message}`);
    }
});

// Custom static file middleware that only serves files with extensions (AFTER special handlers)
app.use((req, res, next) => {
    const urlPath = req.path;
    // Only serve static files if the path has a file extension
    if (urlPath.includes('.') && urlPath !== '/' && urlPath !== '/index.html') {
        console.log(`[STATIC_MIDDLEWARE] Serving static file: ${urlPath}`);
        // Use express.static for files with extensions
        express.static(path.join(__dirname), {
            setHeaders: (res, path) => {
                // Set proper MIME type for JavaScript modules
                if (path.endsWith('.js')) {
                    res.setHeader('Content-Type', 'application/javascript');
                }
            }
        })(req, res, next);
    } else {
        // Let other routes handle paths without extensions (like drawing names)
        next();
    }
});
app.use(express.json());

// Setup touchAction routes
touchActionHandler.setupTouchActionRoutes(app, drawings, tempEditDrawings);

// Setup touchActionInput routes
touchActionInputHandler.setupTouchActionInputRoutes(app, drawings, tempEditDrawings);

// Special handling for index.html access
app.get('/index.html', (req, res) => {
    // Serve error page with guidance message
    res.sendFile(path.join(__dirname, 'intro-page.html'));
});

// Special handling for test-modules.html
app.get('/test-modules.html', (req, res) => {
    console.log('Serving test-modules.html for module testing');
    res.setHeader('Content-Type', 'text/html');
    res.sendFile(path.join(__dirname, 'test-modules.html'));
});

// Route for serving mergeAndRedraw.js with proper MIME type
app.get('/mergeAndRedraw.js', (req, res) => {
    console.log('Serving mergeAndRedraw.js module');
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(__dirname, 'mergeAndRedraw.js'));
});

// Serve the control panel
app.get('/control', (req, res) => {
    console.log(`[ENDPOINT] /control - No variables`);
    res.sendFile(path.join(__dirname, 'control.html'));
});

// Handle root requests - show error page with guidance
app.get('/', (req, res) => {
    console.log(`[ENDPOINT] / - No variables`);
    res.sendFile(path.join(__dirname, 'intro-page.html'));
});

// Fixed endpoint: /pfodWeb
app.get('/pfodWeb', (req, res) => {
    const { cmd, preview, mode, version, drawing } = req.query;
    console.log(`[ENDPOINT] /pfodWeb - cmd="${cmd}", preview="${preview}", mode="${mode}", version="${version}", drawing="${drawing}"`);
    
    // Log version parameter for debugging
    if (version !== undefined) {
        console.log(`[PFOD_WEB] Request received with version parameter: ${version}`);
    } else {
        console.log(`[PFOD_WEB] Request received with no version parameter`);
    }
    
    // If no cmd parameter, serve index.html with drawing name embedded
    if (!cmd) {
        if (!preview && !drawing && !req.session.currentMainDrawing) {
            console.error('ERROR: No current main drawing set and no preview or drawing specified');
            console.error(`[PFOD_WEB] Session currentMainDrawing is: ${req.session.currentMainDrawing}`);
            return res.status(400).json({ 
                error: 'No main drawing configured', 
                message: 'A main drawing must be set before accessing pfodWeb' 
            });
        }
        let drawingToInject = preview || drawing; // Only inject for preview/drawing, main viewer should use {.}
        
        // If preview parameter is provided, handle temporary drawings
        if (preview) {
            // First check if it's an existing temp drawing (e.g. "NextPage-edit" or "colour_touchAction_edit")
            if (tempEditDrawings[preview]) {
                // Use the existing temp drawing directly
                drawingToInject = preview;
                console.log(`Using existing temporary drawing from tempEditDrawings: ${preview}`);
            } else if (drawings[preview]) {
                // Use existing drawing directly - NO fallback creation
                drawingToInject = preview;
                console.log(`Using existing drawing from drawings: ${preview}`);
            } else {
                console.error(`ERROR: Preview drawing ${preview} not found in regular or temp storage`);
                return res.status(404).json({ 
                    error: `Preview drawing "${preview}" not found`,
                    message: 'Preview drawings must be explicitly created before requesting preview'
                });
            }
        }
        // If drawing parameter is provided, handle temporary or regular drawings
        else if (drawing) {
            // First check if it's an existing temp drawing
            if (tempEditDrawings[drawing]) {
                // Use the existing temp drawing directly
                drawingToInject = drawing;
                console.log(`Using existing temporary drawing from tempEditDrawings: ${drawing}`);
            } else if (drawings[drawing]) {
                // Use existing drawing directly
                drawingToInject = drawing;
                console.log(`Using existing drawing from drawings: ${drawing}`);
            } else {
                console.error(`ERROR: Drawing ${drawing} not found in regular or temp storage`);
                return res.status(404).json({ 
                    error: `Drawing "${drawing}" not found`,
                    message: 'Drawing must exist before requesting'
                });
            }
        }
        
        console.log(`Serving index.html for /pfodWeb with drawing: ${drawingToInject}`);
        console.log(`[DEBUG] Available drawings: ${Object.keys(drawings).join(', ')}`);
        console.log(`[DEBUG] Available temp drawings: ${Object.keys(tempEditDrawings).join(', ')}`);
        
        // Read index.html and inject the drawing name
        fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading index.html:', err);
                return res.status(500).send('Error loading page');
            }
            
            sendHtmlWithNoCache(res, data, drawingToInject);
        });
        return;
    }
    
    // Check for touch zone requests with additional parameters - handle preview mode first
    if (req.query.col !== undefined || req.query.row !== undefined || req.query.touchType !== undefined) {
        console.log(`[PFOD_WEB] Touch zone request: cmd=${cmd}, col=${req.query.col}, row=${req.query.row}, touchType=${req.query.touchType}, editedText=${req.query.editedText}`);
                // Handle normal touch zone action (without ~)
        const emptyResponse = {
            cmd: ['{','}']
        };
    
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(emptyResponse));
        return;
    }
    
    // Handle cmd parameter requests
    handlePfodWebCommand(req, res, cmd);
});

// Fixed endpoint: /pfodWebDebug
app.get('/pfodWebDebug', (req, res) => {
    const { cmd, preview, mode, version, drawing } = req.query;
    console.log(`[ENDPOINT] /pfodWeb - cmd="${cmd}", preview="${preview}", mode="${mode}", version="${version}", drawing="${drawing}"`);
    
    // Log version parameter for debugging
    if (version !== undefined) {
        console.log(`[PFOD_WEB] Request received with version parameter: ${version}`);
    } else {
        console.log(`[PFOD_WEB] Request received with no version parameter`);
    }
    
    // If no cmd parameter, serve index.html with drawing name embedded
    if (!cmd) {
        if (!preview && !drawing && !req.session.currentMainDrawing) {
            console.error('ERROR: No current main drawing set and no preview or drawing specified');
            console.error(`[PFOD_WEB] Session currentMainDrawing is: ${req.session.currentMainDrawing}`);
            return res.status(400).json({ 
                error: 'No main drawing configured', 
                message: 'A main drawing must be set before accessing pfodWeb' 
            });
        }
        let drawingToInject = preview || drawing; // Only inject for preview/drawing, main viewer should use {.}
        
        // If preview parameter is provided, handle temporary drawings
        if (preview) {
            // First check if it's an existing temp drawing (e.g. "NextPage-edit" or "colour_touchAction_edit")
            if (tempEditDrawings[preview]) {
                // Use the existing temp drawing directly
                drawingToInject = preview;
                console.log(`Using existing temporary drawing from tempEditDrawings: ${preview}`);
            } else if (drawings[preview]) {
                // Use existing drawing directly - NO fallback creation
                drawingToInject = preview;
                console.log(`Using existing drawing from drawings: ${preview}`);
            } else {
                console.error(`ERROR: Preview drawing ${preview} not found in regular or temp storage`);
                return res.status(404).json({ 
                    error: `Preview drawing "${preview}" not found`,
                    message: 'Preview drawings must be explicitly created before requesting preview'
                });
            }
        }
        // If drawing parameter is provided, handle temporary or regular drawings
        else if (drawing) {
            // First check if it's an existing temp drawing
            if (tempEditDrawings[drawing]) {
                // Use the existing temp drawing directly
                drawingToInject = drawing;
                console.log(`Using existing temporary drawing from tempEditDrawings: ${drawing}`);
            } else if (drawings[drawing]) {
                // Use existing drawing directly
                drawingToInject = drawing;
                console.log(`Using existing drawing from drawings: ${drawing}`);
            } else {
                console.error(`ERROR: Drawing ${drawing} not found in regular or temp storage`);
                return res.status(404).json({ 
                    error: `Drawing "${drawing}" not found`,
                    message: 'Drawing must exist before requesting'
                });
            }
        }
        
        console.log(`Serving index.html for /pfodWebDebug with drawing: ${drawingToInject}`);
        console.log(`[DEBUG] Available drawings: ${Object.keys(drawings).join(', ')}`);
        console.log(`[DEBUG] Available temp drawings: ${Object.keys(tempEditDrawings).join(', ')}`);
        
        // Read index.html and inject the drawing name
        fs.readFile(path.join(__dirname, 'indexDebug.html'), 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading index.html:', err);
                return res.status(500).send('Error loading page');
            }
            
            sendHtmlWithNoCache(res, data, drawingToInject);
        });
        return;
    }
    
    // Check for touch zone requests with additional parameters - handle preview mode first
    if (req.query.col !== undefined || req.query.row !== undefined || req.query.touchType !== undefined) {
        console.log(`[PFOD_WEB] Touch zone request: cmd=${cmd}, col=${req.query.col}, row=${req.query.row}, touchType=${req.query.touchType}, editedText=${req.query.editedText}`);
                // Handle normal touch zone action (without ~)
        const emptyResponse = {
            cmd: ['{','}']
        };
    
        res.set('Content-Type', 'application/json');
        res.send(JSON.stringify(emptyResponse));
        return;
    }
    
    // Handle cmd parameter requests
    handlePfodWebCommand(req, res, cmd);
});

// Handle favicon.ico requests
app.get('/favicon.ico', (req, res) => {
    console.log(`Serving favicon.ico`);
    
    const faviconPath = path.join(__dirname, 'favicon.ico');
    
    // Check if favicon file exists
    if (fs.existsSync(faviconPath)) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.sendFile(faviconPath);
    } else {
        // Return 204 No Content for missing favicon to prevent errors
        console.log('favicon.ico not found, returning 204 No Content');
        res.status(204).end();
    }
});

// Handle /pfodWeb/index.html - same as /pfodWeb without parameters
app.get('/pfodWeb/index.html', (req, res) => {
    console.log(`[ENDPOINT] /pfodWeb/index.html - Session currentMainDrawing="${req.session.currentMainDrawing}"`);
    if (!req.session.currentMainDrawing) {
        console.error('ERROR: No current main drawing set for /pfodWeb/index.html');
        return res.status(400).json({ 
            error: 'No main drawing configured', 
            message: 'A main drawing must be set before accessing pfodWeb' 
        });
    }
    
    console.log(`Serving index.html for /pfodWeb/index.html with main drawing: ${req.session.currentMainDrawing}`);
    
    // Read index.html and inject the main drawing name
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading index.html:', err);
            return res.status(500).send('Error loading page');
        }
        
        sendHtmlWithNoCache(res, data, req.session.currentMainDrawing);
    });
});

// Helper function to send HTML response with no-cache headers
function sendHtmlWithNoCache(res, html, drawingName) {
    // Send HTML with no-cache headers
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
}

// Helper function to handle pfodWeb commands
function handlePfodWebCommand(req, res, cmdParam) {
    console.log(`[ENDPOINT] handlePfodWebCommand - cmdParam="${cmdParam}", allQuery=${JSON.stringify(req.query)}`);
    console.log(`[PFOD_WEB] Processing cmd: ${cmdParam}`);
    console.log(`[PFOD_WEB] Query parameters:`, req.query);
    
    // Handle special startup command {.} - return drawing name
    if (cmdParam === '{.}') {
        console.log(`[PFOD_WEB] Startup command "{.}" detected - returning drawing name`);
        console.log(`[PFOD_WEB] Session currentMainDrawing: "${req.session.currentMainDrawing}"`);
        console.log(`[PFOD_WEB] Available drawings: ${Object.keys(drawings).join(', ')}`);
        
        // Determine which drawing to return - check preview parameter first, then referer header, then iframe context, then session
        const { preview } = req.query;
        
        // Extract drawing or preview from referer header if not in query parameter (same logic as touch zone handling)
        let previewFromReferer = null;
        let drawingFromReferer = null;
        if (!preview && req.headers.referer) {
            const refererUrl = new URL(req.headers.referer);
            if (req.headers.referer.includes('preview=')) {
                previewFromReferer = refererUrl.searchParams.get('preview');
            } else if (req.headers.referer.includes('drawing=')) {
                drawingFromReferer = refererUrl.searchParams.get('drawing');
            }
        }
        
        console.log(`[PFOD_WEB_DEBUG] preview param: "${preview}", preview from referer: "${previewFromReferer}", drawing from referer: "${drawingFromReferer}", session.iframeContext: "${req.session.iframeContext}", session.currentMainDrawing: "${req.session.currentMainDrawing}"`);
        
        let drawingToReturn;
        const effectivePreview = preview || previewFromReferer;
        const effectiveDrawing = drawingFromReferer;
        
        // If we have a preview parameter (from query or referer), store it in session for this iframe context and use it
        if (effectivePreview) {
            req.session.iframeContext = effectivePreview;
            drawingToReturn = effectivePreview;
            console.log(`[PFOD_WEB] Storing and using iframe context for preview: ${effectivePreview} (source: ${preview ? 'query' : 'referer'})`);
        } else if (effectiveDrawing) {
            // If we have a drawing parameter from referer, use it and clear stale iframe context
            req.session.iframeContext = effectiveDrawing;
            drawingToReturn = effectiveDrawing;
            console.log(`[PFOD_WEB] Using drawing from referer and updating iframe context: ${effectiveDrawing}`);
        } else if (req.session.iframeContext) {
            // If no preview/drawing but we have stored iframe context, use it (this handles subsequent {.} requests)
            drawingToReturn = req.session.iframeContext;
            console.log(`[PFOD_WEB] Using stored iframe context: ${req.session.iframeContext}`);
        } else {
            // Fall back to main drawing
            drawingToReturn = req.session.currentMainDrawing;
            console.log(`[PFOD_WEB] Using session currentMainDrawing: ${req.session.currentMainDrawing}`);
        }
        
        if (!drawingToReturn) {
            console.error('ERROR: No drawing name available for startup command');
            console.error(`[PFOD_WEB] Session currentMainDrawing is: ${req.session.currentMainDrawing}`);
            console.error(`[PFOD_WEB] preview parameter is: ${preview}`);
            console.error(`[PFOD_WEB] iframe context is: ${req.session.iframeContext}`);
            return res.status(400).json({ 
                error: 'No main drawing configured', 
                message: 'A main drawing must be set before accessing pfodWeb with startup command' 
            });
        }
        
        // Return the drawing name in the new format
        const startupResponse = {
            cmd: [
              "{,",
            `|+pfodWeb~${drawingToReturn}`,
            "}"
            ]
        };
        
        console.log(`[PFOD_WEB] Startup response:`, startupResponse);
        res.set('Content-Type', 'application/json');
        return res.send(JSON.stringify(startupResponse));
    }
    
    // Handle commands in {command} format - extract the actual command
    let actualCmd = cmdParam;
    if (cmdParam.startsWith('{') && cmdParam.endsWith('}')) {
        actualCmd = cmdParam.slice(1, -1); // Remove { and }
        console.log(`[PFOD_WEB] Extracted command from braces: "${actualCmd}" (original: "${cmdParam}")`);
    }
    
    // Extract version from actualCmd if present (format: version:cmd or just cmd)
    let { version } = req.query;

    if (actualCmd && actualCmd.includes(':')) {
        const parts = actualCmd.split(':', 2);
        version = parts[0];
        actualCmd = parts[1];
        console.log(`[PFOD_WEB] Command request with version: ${version}, cmd: ${actualCmd}`);
    } else {
        console.log(`[PFOD_WEB] Command request with no version parameter`);
    }
    if (version !== undefined) {
        console.log(`[PFOD_WEB] Command request with version: ${version}`);
    } else {
        console.log(`[PFOD_WEB] Command request with no version parameter`);
    }

    // Check for touch zone requests by presence of ~ in command
    if (actualCmd && actualCmd.includes('~')) {
        console.log(`[PFOD_WEB] TouchZone request detected: ${actualCmd}`);
        
        // Parse the embedded parameters from the command if needed
        // Format: pfodWeb~zoneCmd`col`row`touchType or pfodWeb~zoneCmd`col`row`touchType~editedText
        let touchZoneCmd, col, row, touchType, editedText;
        
        // Check if command contains identifier~cmd pattern (dynamic identifier support)
        const identifierMatch = actualCmd.match(/^(.+?)~(.+)$/);
        if (identifierMatch) {
            const identifier = identifierMatch[1];
            const cmdPart = identifierMatch[2];
            const parts = cmdPart.split('~');
            
            if (parts.length >= 2) {
                // Has editedText: identifier~zoneCmd`col`row`touchType~editedText
                const mainPart = parts[0]; // zoneCmd`col`row`touchType
                editedText = parts[1] || ''; // editedText (could be empty)
                
                const subParts = mainPart.split('`');
                touchZoneCmd = subParts[0];
                col = subParts[1];
                row = subParts[2];
                touchType = subParts[3];
            } else {
                // No editedText: identifier~zoneCmd`col`row`touchType
                const mainPart = parts[0]; // zoneCmd`col`row`touchType
                const subParts = mainPart.split('`');
                touchZoneCmd = subParts[0];
                col = subParts[1];
                row = subParts[2];
                touchType = subParts[3];
                editedText = undefined;
            }
            
            console.log(`[PFOD_WEB] Parsed touchZone: cmd=${touchZoneCmd}, col=${col}, row=${row}, touchType=${touchType}, editedText=${editedText}`);
        }
        
        // Return empty cmd response for all touchZone requests
        console.log(`[PFOD_WEB] Returning empty cmd response for touchZone request`);
        const emptyResponse = {
          cmd: ['{','}']
        };
        console.log(`[PFOD_WEB] TouchZone response:`, JSON.stringify(emptyResponse));
        res.set('Content-Type', 'application/json');
        return res.send(JSON.stringify(emptyResponse));
    }
    
    // Check if cmd matches an available drawing name (regular or temporary)
    if (drawings[actualCmd] || tempEditDrawings[actualCmd]) {
        console.log(`[PFOD_WEB] Found drawing "${actualCmd}" - returning drawing data`);
        
        // Use existing drawing request handler
        const { version: ver, mode } = req.query;
        handleDrawingRequest(req, res, actualCmd, ver, mode);
        return;
    }
    
    // If cmd doesn't match any drawing, return empty cmd response
    console.log(`[PFOD_WEB] Cmd "${actualCmd}" does not match any available drawing (original: "${cmdParam}")`);
    console.log(`[PFOD_WEB] Available drawings: ${Object.keys(drawings).join(', ')}`);
    console.log(`[PFOD_WEB] Returning empty cmd response`);
    
    const emptyResponse = {
       cmd: ['{','}']
    };
    
    res.set('Content-Type', 'application/json');
    res.send(JSON.stringify(emptyResponse));
}

// Helper function to sync changes between edit preview and original drawing
function syncEditPreviewToOriginal(editPreviewName) {
    if (!editPreviewName.endsWith('_edit_preview')) {
        return; // Not an edit preview drawing
    }
    
    const originalName = editPreviewName.replace('_edit_preview', '');
    
    if (drawings[editPreviewName] && drawings[originalName]) {
        // Deep copy the edit preview data to the original drawing
        drawings[originalName].data = JSON.parse(JSON.stringify(drawings[editPreviewName].data));
        console.log(`[SYNC] Synced changes from ${editPreviewName} to ${originalName}`);
        
        // Call updateNumericIndices on the main drawing after sync to fix any cmd/idx mismatches
        updateNumericIndices(drawings[originalName].data, originalName);
        console.log(`[SYNC] Updated numeric indices for main drawing ${originalName} after sync`);
        
        // Note: Don't delete edit_preview here - it should persist until user returns to control panel
    } else {
        console.log(`[SYNC] Warning: Could not sync - missing drawings: preview=${!!drawings[editPreviewName]}, original=${!!drawings[originalName]}`);
    }
}


// Helper function to sync changes from tempEditDrawings to edit preview drawing

// Serve the add-item page
app.get('/add-item.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-item.html'));
});


// Serve the edit-drawing page
app.get('/edit-drawing.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'edit-drawing.html'));
});

// Set current main drawing
app.post('/api/set-main-drawing', (req, res) => {
    console.log(`[ENDPOINT] POST /api/set-main-drawing - mainDrawing="${req.body.mainDrawing}"`);
    console.log('[SET_MAIN_DRAWING] Request received:', req.body);
    const { mainDrawing } = req.body;
    
    if (!mainDrawing) {
        console.log('[SET_MAIN_DRAWING] Error: Main drawing name is required');
        return res.status(400).json({ 
            success: false, 
            error: 'Main drawing name is required' 
        });
    }
    
    // Verify the drawing exists
    if (!drawings[mainDrawing]) {
        console.log(`[SET_MAIN_DRAWING] Error: Drawing "${mainDrawing}" not found`);
        console.log(`[SET_MAIN_DRAWING] Available drawings: ${Object.keys(drawings).join(', ')}`);
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${mainDrawing}" not found` 
        });
    }
    
    const oldMainDrawing = req.session.currentMainDrawing;
    req.session.currentMainDrawing = mainDrawing;
    // Clear any iframe context when setting new main drawing
    req.session.iframeContext = null;
    console.log(`[SET_MAIN_DRAWING] Main drawing changed from "${oldMainDrawing}" to "${req.session.currentMainDrawing}" for session`);
    
    res.json({ 
        success: true, 
        mainDrawing: req.session.currentMainDrawing 
    });
});

// Clean up edit preview drawings when returning to control panel
app.post('/api/cleanup-edit-previews', (req, res) => {
    console.log('[CLEANUP] Cleaning up edit preview drawings');
    
    let cleanedCount = 0;
    const drawingNames = Object.keys(drawings);
    
    for (const drawingName of drawingNames) {
        if (drawingName.endsWith('_edit_preview')) {
            delete drawings[drawingName];
            cleanedCount++;
            console.log(`[CLEANUP] Removed edit preview: ${drawingName}`);
        }
    }
    
    console.log(`[CLEANUP] Cleaned up ${cleanedCount} edit preview drawings`);
    
    res.json({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} edit preview drawings`
    });
});

// Cleanup endpoint for touchAction edit temporary drawings
app.post('/api/cleanup-touchaction-temps', (req, res) => {
    console.log('[CLEANUP] Cleaning up touchAction temporary drawings');
    
    let cleanedCount = 0;
    const drawingNames = Object.keys(drawings);
    
    for (const drawingName of drawingNames) {
        if (drawingName.includes('_touchAction_edit')) {
            delete drawings[drawingName];
            cleanedCount++;
            console.log(`[CLEANUP] Removed touchAction temp: ${drawingName}`);
        }
    }
    
    console.log(`[CLEANUP] Cleaned up ${cleanedCount} touchAction temporary drawings`);
    
    res.json({ 
        success: true, 
        message: `Cleaned up ${cleanedCount} touchAction temporary drawings`
    });
});

// TouchAction Item Management Endpoints
app.post('/api/touchaction-item/:tempDrawing/create', (req, res) => {
    console.log(`[REQUEST] POST /api/touchaction-item/:tempDrawing/create - Query: ${JSON.stringify(req.query)}`);
    console.log(`[ENDPOINT] POST /api/touchaction-item/:tempDrawing/create - tempDrawing="${req.params.tempDrawing}"`);
    return touchActionHandler.createTouchActionItemTempDrawings(req, res, drawings, tempEditDrawings);
});

app.post('/api/touchaction-item/:itemEditDrawing/accept', (req, res) => {
    console.log(`[REQUEST] POST /api/touchaction-item/:itemEditDrawing/accept - Query: ${JSON.stringify(req.query)}`);
    console.log(`[ENDPOINT] POST /api/touchaction-item/:itemEditDrawing/accept - itemEditDrawing="${req.params.itemEditDrawing}"`);
    return touchActionHandler.acceptTouchActionItemChanges(req, res, drawings, tempEditDrawings);
});

app.post('/api/touchaction-item/:itemEditDrawing/cancel', (req, res) => {
    console.log(`[REQUEST] POST /api/touchaction-item/:itemEditDrawing/cancel - Query: ${JSON.stringify(req.query)}`);
    console.log(`[ENDPOINT] POST /api/touchaction-item/:itemEditDrawing/cancel - itemEditDrawing="${req.params.itemEditDrawing}"`);
    return touchActionHandler.cancelTouchActionItemChanges(req, res, drawings, tempEditDrawings);
});

// Cleanup endpoint for individual temporary drawings
app.delete('/api/drawings/:tempName/temp-cleanup', (req, res) => {
    const { tempName } = req.params;
    
    console.log(`[TEMP_CLEANUP] Request to cleanup: ${tempName}`);
    
    if (tempEditDrawings[tempName]) {
        delete tempEditDrawings[tempName];
        console.log(`[TEMP_CLEANUP] Cleaned up temporary drawing: ${tempName}`);
        
        res.json({
            success: true,
            message: `Temporary drawing "${tempName}" cleaned up`
        });
    } else {
        console.log(`[TEMP_CLEANUP] Temporary drawing "${tempName}" not found`);
        res.status(404).json({
            success: false,
            error: `Temporary drawing "${tempName}" not found`
        });
    }
});

// Preview hiding endpoints for touchAction item selection
app.post('/api/drawings/:drawingName/create-initial-preview', (req, res) => {
    console.log(`[REQUEST] POST /api/drawings/:drawingName/create-initial-preview - drawingName="${req.params.drawingName}"`);
    return touchActionHandler.createInitialPreview(req, res, drawings, tempEditDrawings);
});

app.post('/api/drawings/:drawingName/preview-hide-item', (req, res) => {
    console.log(`[REQUEST] POST /api/drawings/:drawingName/preview-hide-item - drawingName="${req.params.drawingName}"`);
    return touchActionHandler.hideItemInPreview(req, res, drawings, tempEditDrawings);
});

app.post('/api/drawings/:drawingName/preview-restore', (req, res) => {
    console.log(`[REQUEST] POST /api/drawings/:drawingName/preview-restore - drawingName="${req.params.drawingName}"`);
    return touchActionHandler.restorePreview(req, res, drawings, tempEditDrawings);
});

// Add-item specific preview hide/restore endpoints
app.post('/api/drawings/:drawingName/add-item-hide', (req, res) => {
    console.log(`[REQUEST] POST /api/drawings/:drawingName/add-item-hide - drawingName="${req.params.drawingName}"`);
    return addItemHideHandler.hideItemInPreview(req, res, drawings, tempEditDrawings);
});

app.post('/api/drawings/:drawingName/add-item-restore', (req, res) => {
    console.log(`[REQUEST] POST /api/drawings/:drawingName/add-item-restore - drawingName="${req.params.drawingName}"`);
    return addItemHideHandler.restorePreview(req, res, drawings, tempEditDrawings);
});

// API endpoints for drawings
app.get('/api/drawings', (req, res) => {
    console.log(`[ENDPOINT] GET /api/drawings - No parameters`);
    const drawingsArray = Object.keys(drawings)
        .filter(name => !name.endsWith('_edit_preview') && !name.includes('_touchAction_edit')) // Filter out edit preview and touchAction temporary drawings
        .map(name => {
            const drawing = drawings[name].data;
            return {
                name: drawing.name,
                version: drawing.version,
                canvasWidth: drawing.x,
                canvasHeight: drawing.y,
                color: drawing.color,
                refresh: drawing.refresh,
                itemCount: drawing.items.length
            };
        });
    
    res.json(drawingsArray);
});

// Get list of drawings available for insertion
app.get('/api/drawings/available-for-insert', (req, res) => {
    console.log(`[ENDPOINT] GET /api/drawings/available-for-insert - currentDrawing="${req.query.currentDrawing}"`);
    const currentDrawingName = req.query.currentDrawing;
    
    if (!currentDrawingName) {
        return res.status(400).json({ 
            success: false, 
            error: 'Current drawing name is required' 
        });
    }
    
    // Get current drawing to check for already inserted drawings
    const currentDrawing = drawings[currentDrawingName];
    if (!currentDrawing) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${currentDrawingName}" not found` 
        });
    }
    
    // If this is an edit preview or touchAction edit drawing, use the original drawing to get the list of inserted drawings
    // This ensures we get the complete list before any temporary editing changes
    let sourceDrawingForInsertCheck = currentDrawing;
    const isEditPreview = currentDrawingName.endsWith('_edit_preview');
    const isTouchActionEdit = currentDrawingName.includes('_touchAction_edit');
    
    if (isEditPreview) {
        const originalDrawingName = currentDrawingName.replace('_edit_preview', '');
        if (drawings[originalDrawingName]) {
            sourceDrawingForInsertCheck = drawings[originalDrawingName];
            console.log(`[AVAILABLE_FOR_INSERT] Using original drawing "${originalDrawingName}" for insert check (edit preview mode)`);
        }
    } else if (isTouchActionEdit) {
        const originalDrawingName = currentDrawingName.replace('_touchAction_edit', '');
        if (drawings[originalDrawingName]) {
            sourceDrawingForInsertCheck = drawings[originalDrawingName];
            console.log(`[AVAILABLE_FOR_INSERT] Using original drawing "${originalDrawingName}" for insert check (touchAction edit mode)`);
        }
    }
    
    // Find all insertDwg items in the source drawing
    const insertedDrawingNames = new Set();
    if (sourceDrawingForInsertCheck.data && sourceDrawingForInsertCheck.data.items) {
        sourceDrawingForInsertCheck.data.items.forEach(item => {
            if (item.type && item.type.toLowerCase() === 'insertdwg' && item.drawingName) {
                insertedDrawingNames.add(item.drawingName);
            }
        });
    }
    
    // Also prevent inserting the current drawing into itself
    insertedDrawingNames.add(currentDrawingName);
    
    // If this is an edit preview or touchAction edit, also prevent inserting the original drawing
    if (isEditPreview) {
        const originalDrawingName = currentDrawingName.replace('_edit_preview', '');
        insertedDrawingNames.add(originalDrawingName);
    } else if (isTouchActionEdit) {
        const originalDrawingName = currentDrawingName.replace('_touchAction_edit', '');
        insertedDrawingNames.add(originalDrawingName);
    }
    
    // Get all available drawings that haven't been inserted yet
    const availableDrawings = Object.keys(drawings)
        .filter(name => !insertedDrawingNames.has(name) && !name.endsWith('_edit_preview') && !name.includes('_touchAction_edit')) // Filter out edit preview and touchAction temporary drawings
        .map(name => {
            const drawing = drawings[name].data;
            return {
                name: drawing.name,
                canvasWidth: drawing.x,
                canvasHeight: drawing.y,
                color: drawing.color
            };
        });
    
    res.json({
        success: true,
        drawings: availableDrawings
    });
});

// Get a specific drawing
app.get('/api/drawings/:drawingName', (req, res) => {
    console.log(`[ENDPOINT] GET /api/drawings/:drawingName - drawingName="${req.params.drawingName}"`);
    const { drawingName } = req.params;
    
    // Check both regular drawings and temp drawings
    let drawing;
    if (drawings[drawingName]) {
        drawing = drawings[drawingName].data;
    } else if (tempEditDrawings[drawingName]) {
        drawing = tempEditDrawings[drawingName].data;
    } else {
        return res.status(404).json({ error: `Drawing "${drawingName}" not found` });
    }
    
    res.json({
        name: drawing.name,
        version: drawing.version,
        canvasWidth: drawing.x,
        canvasHeight: drawing.y,
        color: drawing.color,
        refresh: drawing.refresh,
        itemCount: drawing.items?.length||0
    });
});

// Get full drawing data with name (for edit screens and controller)
// Function to update numeric indices for indexed items based on current position
// Note: if index item found set its idx  and then update other items with that name to same idx
// allocatedIdx global used to set unique idx for each dwg to allow for insert dwgs
// Does not handle inserting a dwg in a dwg.
// updates cmd based on matching cmdName
// needs to handle hide/unhide erase by cmdName also

// ONLY call this when something changes, not for touchAction/input exits/previews
function updateNumericIndices(drawing, drawingName='') {
    if (!drawing || !drawing.items) {
      console.error(` No drawing or no drawing.items for: ${drawingName}`);
      return;
    }
     console.log(`[UPDATE_IDX] Called updateNumericIndices for: ${drawingName}`);
     console.log(`[UPDATE_IDX_DEBUG] Items array length at start: ${drawing.items.length}`);

    const cmdMap = new Map(); // cmdName to cmd value
    const idxMap = new Map(); // idxName to idx value
    
    // First pass: assign cmd values in order to insertDwgs and touchZones on first appearance
    drawing.items.forEach((item) => {
        if (item.type == 'insertDwg') {
            // insertDwgs get cmd assignments - check cmdName first, then drawingName
            if (item.cmdName) {
                // Use cmdName for cmd mapping (allows sharing cmd with touchZones/hide items)
                if (!cmdMap.has(item.cmdName)) {
                    const newCmd = 'cmd_c' + allocatedCmdIdx;
                    allocatedCmdIdx += 1;
                    cmdMap.set(item.cmdName, newCmd);
                    item.cmd = newCmd;
                    console.log(`[UPDATE_IDX] Assigned ${newCmd} to insertDwg cmdName ${item.cmdName}`);
                } else {
                    item.cmd = cmdMap.get(item.cmdName);
                    console.log(`[UPDATE_IDX] Reused ${item.cmd} for insertDwg cmdName ${item.cmdName}`);
                }
/**                
            } else if (item.drawingName) {
                // Fallback to drawingName for cmd mapping
                if (!cmdMap.has(item.drawingName)) {
                    const newCmd = 'cmd_c' + allocatedCmdIdx;
                    allocatedCmdIdx += 1;
                    cmdMap.set(item.drawingName, newCmd);
                    item.cmd = newCmd;
                    console.log(`[UPDATE_IDX] Assigned ${newCmd} to insertDwg ${item.drawingName}`);
                } else {
                    item.cmd = cmdMap.get(item.drawingName);
                }
**/                
            }
        } else if (item.type == 'touchZone' && item.cmdName) {
            // touchZones get cmd assignments based on cmdName
            if (!cmdMap.has(item.cmdName)) {
                const newCmd = 'cmd_c' + allocatedCmdIdx;
                allocatedCmdIdx += 1;
                cmdMap.set(item.cmdName, newCmd);
                item.cmd = newCmd;
                console.log(`[UPDATE_IDX] Assigned ${newCmd} to touchZone cmdName ${item.cmdName}`);
            } else {
                item.cmd = cmdMap.get(item.cmdName);
            }
        } else if (item.type == 'hide' || item.type == 'unhide' || item.type == 'erase') {
            if (item.cmdName) {
              if (!cmdMap.has(item.cmdName)) {
                const newCmd = 'cmd_c' + allocatedCmdIdx;
                allocatedCmdIdx += 1;
                cmdMap.set(item.cmdName, newCmd);
                item.cmd = newCmd;
                console.log(`[UPDATE_IDX] Assigned ${newCmd} to ${item.type} cmdName ${item.cmdName}`);
              } else {
                item.cmd = cmdMap.get(item.cmdName);
              }
            } else if (item.idxName) {
              if (!idxMap.has(item.idxName)) {
                const newIdx = allocatedIdx;
                allocatedIdx += 1;
                idxMap.set(item.idxName, newIdx);
                item.idx = newIdx;
                console.log(`[UPDATE_IDX] Assigned idx ${newIdx} to ${item.type} idxName ${item.idxName}`);
              } else {
                item.idx = idxMap.get(item.idxName);
              }
           }              
        } else if (item.indexed && item.idxName) {
            // indexed items get idx assignments based on idxName
            if (item.idxName == null || item.idxName == undefined) {
                item.idxName = `missingIndexName_${item.dx}`;
            }
            if (!idxMap.has(item.idxName)) {
                const newIdx = allocatedIdx;
                allocatedIdx += 1;
                idxMap.set(item.idxName, newIdx);
                item.idx = newIdx;
                console.log(`[UPDATE_IDX] Assigned idx ${newIdx} to indexed item idxName ${item.idxName}`);
            } else {
                item.idx = idxMap.get(item.idxName);
            }
        } else if (item.cmdName) {
           if (!cmdMap.has(item.cmdName)) {
               const newCmd = 'cmd_c' + allocatedCmdIdx;
               allocatedCmdIdx += 1;
               cmdMap.set(item.cmdName, newCmd);
               item.cmd = newCmd;
               console.log(`[UPDATE_IDX] Assigned ${newCmd} to ${item.type} cmdName ${item.cmdName}`);
            } else {
               item.cmd = cmdMap.get(item.cmdName);
            }
        }
        // Skip touchAction and touchActionInput during idx assignment - they only reference existing indexed items
    });
    
    // Second pass: update touchAction/touchActionInput references to assigned cmd values
    const cmdItemsToRemove = [];
    drawing.items.forEach((item, index) => {
        if (item.type == 'touchActionInput' && item.cmdName) {
            let cmd = cmdMap.get(item.cmdName);
            if (cmd == undefined) {
                console.error(`[UPDATE_IDX] touchActionInput references non-existent cmdName ${item.cmdName} - marking for removal`);
                cmdItemsToRemove.push(index);
            } else {
                item.cmd = cmd;
                console.log(`[UPDATE_IDX] Updated touchActionInput cmdName ${item.cmdName} to cmd ${cmd}`);
            }
        } else if (item.type == 'touchAction' && item.cmdName) {
            let cmd = cmdMap.get(item.cmdName);
            if (cmd == undefined) {
                console.error(`[UPDATE_IDX] touchAction references non-existent cmdName ${item.cmdName} - marking for removal`);
                cmdItemsToRemove.push(index);
            } else {
                item.cmd = cmd;
                console.log(`[UPDATE_IDX] Updated touchAction cmdName ${item.cmdName} to cmd ${cmd}`);
            }
/**            
        } else if (item.type == 'hide' || item.type == 'unhide' || item.type == 'erase') {
            let cmd = cmdMap.get(item.cmdName);
            item.cmd = cmd;
            console.log(`[UPDATE_IDX] Updated ${item.type} cmdName ${item.cmdName} to cmd ${cmd}`);
        } else if (item.type == 'index' && item.cmdName) {
            let cmd = cmdMap.get(item.cmdName);
            item.cmd = cmd;
            console.log(`[UPDATE_IDX] Updated ${item.type} cmdName ${item.cmdName} to cmd ${cmd}`);
**/            
        }         
    });
    
    // Remove invalid touchAction/touchActionInput items with bad cmdName (in reverse order to preserve indices)
    for (let i = cmdItemsToRemove.length - 1; i >= 0; i--) {
        const removedItem = drawing.items.splice(cmdItemsToRemove[i], 1)[0];
        console.log(`[UPDATE_IDX] Removed invalid item: ${removedItem.type} (had invalid cmdName ${removedItem.cmdName})`);
    }
    
    // Third pass: update touchActionInput and touchAction items' idx references
    const itemsToRemove = [];
    drawing.items.forEach((item, index) => {
        if (item.type === 'touchActionInput' && item.idxName) {
            let idx = idxMap.get(item.idxName);
            if (idx !== undefined) {
                item.textIdx = idx;
                console.log(`[UPDATE_IDX] Updated touchActionInput idxName ${item.idxName} to textIdx ${idx}`);
            } else {
                console.error(`[UPDATE_IDX] touchActionInput references non-existent idxName ${item.idxName} - Clear idx reference`);
                delete item.textIdx;
                delete item.idxName;
            }
        } else if (item.type === 'touchAction' && item.action && Array.isArray(item.action)) {
            // Update idx for each action item in the touchAction's action array
            const invalidActionItems = [];
            item.action.forEach((actionItem, actionIndex) => {
                if (actionItem.idxName) {
                    let idx = idxMap.get(actionItem.idxName);
                    if (idx !== undefined) {
                        actionItem.idx = idx;
                        console.log(`[UPDATE_IDX] Updated touchAction actionItem idxName ${actionItem.idxName} to idx ${idx}`);
                    } else {
                        console.error(`[UPDATE_IDX] touchAction actionItem references non-existent idxName ${actionItem.idxName}`);
                        invalidActionItems.push(actionIndex);
                    }
                } else if (actionItem.cmdName) {
                    let cmd = cmdMap.get(actionItem.cmdName);
                    if (cmd !== undefined) {
                        actionItem.cmd = cmd;
                        console.log(`[UPDATE_IDX] Updated touchAction actionItem cmdName ${actionItem.cmdName} to cmd ${cmd}`);
                    } else {
                        console.error(`[UPDATE_IDX] touchAction actionItem references non-existent cmdName ${actionItem.cmdName}`);
                        invalidActionItems.push(actionIndex);
                    }
                }
            });
            
            // Remove invalid action items
            for (let i = invalidActionItems.length - 1; i >= 0; i--) {
                item.action.splice(invalidActionItems[i], 1);
            }
            
            // If touchAction has no valid action items, mark the entire touchAction for removal
            if (item.action.length === 0) {
                console.error(`[UPDATE_IDX] touchAction has no valid action items - marking for removal`);
                itemsToRemove.push(index);
            }
        }
    });
    
    // Remove invalid touchActionInput and touchAction items (in reverse order to preserve indices)
    for (let i = itemsToRemove.length - 1; i >= 0; i--) {
        const removedItem = drawing.items.splice(itemsToRemove[i], 1)[0];
        console.log(`[UPDATE_IDX] Removed invalid item: ${removedItem.type} (had invalid idxName references)`);
    }
     
    let insertedDwgs = [];
    drawing.items.forEach((item) => {
        if (item.type == 'insertDwg') {
          console.log(`[UPDATE_IDX] Found insertDwg: ${item.drawingName}`);
          insertedDwgs.push(item);
        }
    });
    // now process the insertDwgs
    insertedDwgs.forEach((item) => {
        let dwg = drawings[item.drawingName];
        if (dwg == undefined) {
          console.log(`[UPDATE_IDX] Missing dwg ${item.drawingName}`);
        } else {
         updateNumericIndices(dwg.data,item.drawingName);
        }
    });
    console.log(`[UPDATE_IDX] Item order after updateNumericIndices:`);
      drawing.items.forEach((item, index) => {
      console.log(`[UPDATE_IDX]   ${index}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : '(no_cmdName)'}${item.cmd ? `(cmd=${item.cmd})` : '(no_cmd)'}${item.idxName ? `(idxName=${item.idxName})` : '(no idxName)'}`);
    });
    console.log(`[UPDATE_IDX_DEBUG] Items array length at end: ${drawing.items.length}`);
}

// Global variable to track concurrent reorder operations
let reorderInProgress = null;

// Function to reorder items to place touchAction/touchActionInput after their touchZone based on cmdName
function reorderTouchActionItems(items, originalItems = [], drawingName = '') {
    if (reorderInProgress) {
        console.log(`[DEBUG_CONCURRENT] WARNING: Reorder already in progress for "${reorderInProgress}", now starting for "${drawingName}"`);
    }
    reorderInProgress = drawingName;
    console.log(`[REORDER] Reordering touchAction/touchActionInput items to place after their touchZone (drawing: ${drawingName})`);
    
    // Log initial state
    console.log(`[DEBUG_REORDER_INITIAL] Starting with ${items.length} items:`);
    items.forEach((item, idx) => {
        if (item.type === 'touchActionInput') {
            console.log(`[DEBUG_REORDER_INITIAL]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) *** TOUCHACTIONINPUT`);
        } else {
            console.log(`[DEBUG_REORDER_INITIAL]   ${idx}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : `('')`}${item.cmd ? `(cmd=${item.cmd})` : `('')`}${item.idxName ? `(idxName=${item.idxName})` : `('')`}`);
        }
    });
    
    // Step 1: Extract touchActions and touchActionInputs, leave all other items in original order
    const reorderedItems = [];
    const extractedTouchActions = [];
    const extractedTouchActionInputs = [];
    
    for (const item of items) {
        if (item.type === 'touchAction') {
            extractedTouchActions.push(item);
            console.log(`[REORDER] Extracted touchAction with cmdName "${item.cmdName}"`);
        } else if (item.type === 'touchActionInput') {
            extractedTouchActionInputs.push(item);
            console.log(`[REORDER] Extracted touchActionInput with cmdName "${item.cmdName}"`);
        } else {
            // Keep all other items in their original order
            reorderedItems.push(item);
            console.log(`[REORDER] Added ${item.type} at position ${reorderedItems.length - 1} (preserving original order)`);
        }
    }
    
    // Step 2: For each extracted touchActionInput, find matching touchZone and insert after it
    for (const touchActionInput of extractedTouchActionInputs) {
        if (!touchActionInput.cmdName) {
            console.log(`[REORDER] ERROR: touchActionInput has no cmdName, omitting item`);
            continue;
        }
        
        // Find the touchZone with matching cmdName
        let insertIndex = -1;
        for (let i = 0; i < reorderedItems.length; i++) {
            if (reorderedItems[i].type === 'touchZone' && reorderedItems[i].cmdName === touchActionInput.cmdName) {
                insertIndex = i + 1; // Insert after the touchZone
                break;
            }
        }
        
        if (insertIndex !== -1) {
            reorderedItems.splice(insertIndex, 0, touchActionInput);
            console.log(`[REORDER] Added touchActionInput with cmdName "${touchActionInput.cmdName}" at position ${insertIndex}`);
        } else {
            console.log(`[REORDER] ERROR: No touchZone found with cmdName "${touchActionInput.cmdName}", omitting touchActionInput`);
        }
    }
    
    // Step 3: For each extracted touchAction, find matching touchZone and insert after it (and after any touchActionInput)
    for (const touchAction of extractedTouchActions) {
        if (!touchAction.cmdName) {
            console.log(`[REORDER] ERROR: touchAction has no cmdName, omitting item`);
            continue;
        }
        
        // Find the touchZone with matching cmdName and insert after it (and any touchActionInputs)
        let insertIndex = -1;
        for (let i = 0; i < reorderedItems.length; i++) {
            if (reorderedItems[i].type === 'touchZone' && reorderedItems[i].cmdName === touchAction.cmdName) {
                insertIndex = i + 1;
                // Skip past any touchActionInputs with same cmdName
                while (insertIndex < reorderedItems.length && 
                       reorderedItems[insertIndex].type === 'touchActionInput' && 
                       reorderedItems[insertIndex].cmdName === touchAction.cmdName) {
                    insertIndex++;
                }
                break;
            }
        }
        
        if (insertIndex !== -1) {
            reorderedItems.splice(insertIndex, 0, touchAction);
            console.log(`[REORDER] Added touchAction with cmdName "${touchAction.cmdName}" at position ${insertIndex}`);
        } else {
            console.log(`[REORDER] ERROR: No touchZone found with cmdName "${touchAction.cmdName}", omitting touchAction`);
        }
    }
    
    updateNumericIndices({items: reorderedItems}, drawingName);

    console.log(`[REORDER] Final item order: ${reorderedItems.map(item => `${item.type}${item.cmdName ? `(${item.cmdName})` : ''}`).join(', ')}`);
    console.log(`[REORDER] Final items list has ${reorderedItems.length} items:`);
    reorderedItems.forEach((item, idx) => {
        console.log(`[REORDER]   ${idx}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : `(no_cmdName)`}${item.cmd ? `(cmd=${item.cmd})` : `(no_cmd)`}${item.idxName ? `(idxName=${item.idxName})` : `(no_idxName)`}${item.idx ? `(idx=${item.idx})` : `(no_idx)`}`);
    });
    
    // Clear the reorder in progress flag
    reorderInProgress = null;
    return reorderedItems;
}

app.get('/api/drawings/:drawingName/data', (req, res) => {
    console.log(`[ENDPOINT] GET /api/drawings/:drawingName/data - drawingName="${req.params.drawingName}"`);
    const { drawingName } = req.params;
    
    // Check both regular drawings and temp drawings
    let drawing;
    if (drawings[drawingName]) {
        drawing = drawings[drawingName].data;
    } else if (tempEditDrawings[drawingName]) {
        drawing = tempEditDrawings[drawingName].data;
    } else {
        return res.status(404).json({ error: `Drawing "${drawingName}" not found` });
    }
    
    // Filter out incomplete hide/unhide/erase items permanently from the stored drawing
    if (drawing && drawing.items) {
        const originalLength = drawing.items.length;
        drawing.items = drawing.items.filter(item => {
            // For hide/unhide items, only keep if they have either (idx AND idxName) OR (cmd AND cmdName)
            if (item.type === 'hide' || item.type === 'unhide') {
                const hasIndexFields = item.idx && item.idxName;
                const hasCmdFields = item.cmd && item.cmdName;
                if (!hasIndexFields && !hasCmdFields) {
                    console.log(`[FILTER_PERMANENT] Permanently removing incomplete ${item.type} item with neither idx/idxName nor cmd/cmdName:`, JSON.stringify(item));
                    return false;
                }
            }
            
            // For erase items, only keep if they have either (idx AND idxName) OR (cmd AND cmdName)
            if (item.type === 'erase') {
                const hasIndexFields = item.idx && item.idxName;
                const hasCmdFields = item.cmd && item.cmdName;
                if (!hasIndexFields && !hasCmdFields) {
                    console.log(`[FILTER_PERMANENT] Permanently removing incomplete erase item with neither idx/idxName nor cmd/cmdName:`, JSON.stringify(item));
                    return false;
                }
            }
            
            return true;
        });
        
        if (drawing.items.length !== originalLength) {
            console.log(`[FILTER_PERMANENT] Removed ${originalLength - drawing.items.length} incomplete items from drawing "${drawingName}"`);
        }
    }
    
    // Return filtered drawing data including name property
    // Client-side will update numeric indices when displaying the data
    res.json(drawing);
});

// Check if a drawing exists and get its basic info
app.get('/api/drawings/:drawingName/exists', (req, res) => {
    const { drawingName } = req.params;
    
    if (drawings[drawingName]) {
        const drawing = drawings[drawingName].data;
        res.json({
            exists: true,
            dimensions: {
                width: drawing.x,
                height: drawing.y
            }
        });
    } else {
        res.json({
            exists: false
        });
    }
});

// Get indexed labels and values for a drawing
app.get('/api/drawings/:drawingName/indexed-labels', (req, res) => {
    const { drawingName } = req.params;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    const drawing = drawings[drawingName].data;
    const indexedItems = [];
    
    // Find all label and value items with idx > 0
    if (drawing.items) {
        drawing.items.forEach(item => {
            if ((item.type === 'label' || item.type === 'value') && item.idx && item.idx > 0) {
                // Return the complete item object
                indexedItems.push(item);
            }
        });
    }
    
    // Sort by idx
    indexedItems.sort((a, b) => a.idx - b.idx);
    
    res.json({
        success: true,
        items: indexedItems
    });
});

// Get touchZones for a drawing
app.get('/api/touchzones/:drawingName', (req, res) => {
    const { drawingName } = req.params;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false,
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    const drawing = drawings[drawingName].data;
    const touchZones = [];
    const existingTouchActions = [];
    const existingTouchActionInputs = [];
    
    // Find touchZones and existing touchAction/touchActionInput items
    drawing.items.forEach((item, index) => {
        if (item.type === 'touchZone') {
            touchZones.push({
                cmd: item.cmd,
                cmdName: item.cmdName,
                filter: item.filter,
                xOffset: item.xOffset,
                yOffset: item.yOffset,
                xSize: item.xSize,
                ySize: item.ySize,
                centered: item.centered,
                idx: item.idx || 0,
                itemIndex: index // Include the position in the items array
            });
        } else if (item.type === 'touchAction') {
            existingTouchActions.push({
                cmd: item.cmd,
                cmdName: item.cmdName,
                itemIndex: index
            });
        } else if (item.type === 'touchActionInput') {
            existingTouchActionInputs.push({
                cmd: item.cmd,
                cmdName: item.cmdName,
                itemIndex: index
            });
        }
    });
    
    res.json({
        success: true,
        drawingName: drawingName,
        touchZones: touchZones,
        existingTouchActions: existingTouchActions,
        existingTouchActionInputs: existingTouchActionInputs
    });
});

// Create a new drawing
app.post('/api/drawings', (req, res) => {
    console.log("POST /api/drawings - Request received:", req.body);
    
    const { name, x, y, color, refresh, version } = req.body;
    
    // Log the parsed values
    console.log("Parsed values:", { name, x, y, color, refresh, version });
    
    if (!name) {
        console.log("Error: Drawing name is required");
        return res.status(400).json({ error: 'Drawing name is required' });
    }
    
    if (drawings[name]) {
        console.log(`Error: Drawing "${name}" already exists`);
        return res.status(400).json({ error: `Drawing "${name}" already exists` });
    }
    
    try {
        drawings[name] = {
            data: createNewDrawing(
                name, 
                x !== undefined ? x : 50, 
                y !== undefined ? y : 50, 
                color || 0, 
                refresh !== undefined ? refresh : 0, 
                version
            ),
            updates: []
        };
        
        console.log(`Created new drawing: ${name}`, drawings[name]);
        
        // Verify the drawing was actually created
        if (!drawings[name]) {
            throw new Error("Drawing was not added to the drawings object");
        }
        
        // Count drawings
        const drawingCount = Object.keys(drawings).length;
        console.log(`Total drawings after creation: ${drawingCount}`);
        
        res.json({ success: true, name });
    } catch (error) {
        console.error("Error creating drawing:", error);
        res.status(500).json({ error: `Failed to create drawing: ${error.message}` });
    }
});

// Update drawing version
app.post('/api/drawings/:drawingName/version', (req, res) => {
    const { drawingName } = req.params;
    const { version } = req.body;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ error: `Drawing "${drawingName}" not found` });
    }
    
    if (!version) {
        return res.status(400).json({ error: 'Version is required' });
    }
    
    drawings[drawingName].data.version = version;
    console.log(`Updated version for drawing "${drawingName}" to: ${version}`);
    
    res.json({ success: true });
});

// Handle requests with trailing slash - just serve directly instead of redirecting
app.get('/:drawingName/', (req, res, next) => {
    // Skip for special routes
    if (req.params.drawingName === 'control' || req.params.drawingName === 'api') {
        return next();
    }
    
    // Just handle the request directly, don't redirect 
    const { drawingName } = req.params;
    console.log(`[ENDPOINT] /:drawingName/ - drawingName="${drawingName}", allQuery=${JSON.stringify(req.query)}`);
    
    // Determine if this is an API request
    const isApiRequest = 
        req.get('X-Requested-With') === 'XMLHttpRequest' || 
        (req.get('Accept') === 'application/json');
    
    // For browser requests, serve the HTML page
    if (!isApiRequest) {
        return res.sendFile(path.join(__dirname, 'index.html'));
    }
    const { ver } = req.query;
    console.log(`request for drawing: ${drawingName}`);

    if (drawingName == 'add-item-endpoint') {
      console.log(`handleEndPointDrawingRequest`);
      handleEndPointDrawingRequest(req, res, drawingName, ver);
    } else {
      // For API requests, handle it the same way as the non-trailing slash route
      const { version: ver, mode } = req.query;
      handleDrawingRequest(req, res, drawingName, ver, mode);
    }
});

function cleanUpTouchActionRefs(drawing, drawingName='') {
    if (!drawing || !drawing.items) return;
     console.log(`[UPDATE_IDX] Called cleanUpTouchActionRefs for: ${drawingName}`);

    // update all touchActions and inputs cmd to match touchZone latest cmd 
    const cmdMap = new Map(); // cmdName to idx number
     drawing.items.forEach((item) => {
        if (item.type == 'touchZone') {
          let cmd = cmdMap.get(item.cmdName);
          if (cmd !== undefined) {
            console.error(`[UPDATE_IDX] duplicate touchZone cmdName:${cmdName}`);
           // delete following touchAction and touchZones
          } else {
            cmdMap.set(item.cmdName,item.cmd);
          }
        } else if (item.type == 'touchActionInput') {
          let cmd = cmdMap.get(item.cmdName);
          if (cmd == undefined) {
            console.error(`[UPDATE_IDX] no touchZone for touchActionInput cmdName:${item.cmdName}`);
          } else {
            item.cmd = cmd;
          }
        } else if (item.type == 'touchAction') {
          let cmd = cmdMap.get(item.cmdName);
          if (cmd == undefined) {
            console.error(`[UPDATE_IDX] no touchZone for touchAction cmdName:${item.cmdName}`);
          } else {
            item.cmd = cmd;
          }
        }          
    });
     
    let insertedDwgs = [];
    drawing.items.forEach((item) => {
        if (item.type == 'insertDwg') {
          console.log(`[UPDATE_IDX] Found insertDwg: ${item.drawingName}`);
          insertedDwgs.push(item);
        }
    });
    
    const idxMap = new Map(); // idxName to idx number
    drawing.items.forEach((item, index) => {
        if (item.indexed) {
            let idx = idxMap.get(item.idxName);
            if (idx !== undefined) {
            } else {
              idxMap.set(item.idxName,item.idx);
            }
        }
    });
    
    // Update touchActionInput and touchAction items' idx by looking up their idxName in the data array
    drawing.items.forEach(item => {
        if (item.type === 'touchActionInput' && item.idxName) {
            // Find the matching item in the data array by idxName and update textIdx
            const matchingDataItem = drawing.items.find(dataItem => 
                dataItem.idxName === item.idxName && dataItem.indexed
            );
            if (matchingDataItem && matchingDataItem.idx) {
                item.textIdx = matchingDataItem.idx;
            }
        } else if (item.type === 'touchAction' && item.action && Array.isArray(item.action)) {
            // Update idx for each action item in the touchAction's action array
            item.action.forEach(actionItem => {
                if (actionItem.idxName) {
                    const matchingDataItem = drawing.items.find(dataItem => 
                        dataItem.idxName === actionItem.idxName && dataItem.indexed
                    );
                    if (matchingDataItem && matchingDataItem.idx) {
                        actionItem.idx = matchingDataItem.idx;
                    }
                }
            });
        }
    });
    // now process the insertDwgs
    insertedDwgs.forEach((item) => {
        let dwg = drawings[item.drawingName];
        if (dwg == undefined) {
          console.log(`[UPDATE_IDX] Missing dwg ${item.drawingName}`);
        } else {
         cleanUpTouchActionRefs(dwg.data,item.drawingName);
        }
    });
    console.log(`[UPDATE_IDX] Item order after cleanUpTouchActionRefs:`);
      drawing.items.forEach((item, index) => {
      console.log(`[UPDATE_IDX]   ${index}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : '(no_cmdName)'}${item.cmd ? `(cmd=${item.cmd})` : '(no_cmd)'}${item.idxName ? `(idxName=${item.idxName})` : ''}${item.idx ? `(idx=${item.idx})` : ''}`);
    });
}

  
// Helper function to handle drawing data requests
function handleDrawingRequest(req, res, drawingName, ver, mode) {
    console.log(`[ENDPOINT] handleDrawingRequest - drawingName="${drawingName}", ver="${ver}", mode="${mode}"`);
    console.log(`API request for drawing: ${drawingName}`);
    console.log(`Drawing request for ${drawingName}, version: ${ver || 'none'}`);
    
    
    // check if this is a selection_preview
    let isSelectionPreview = false;
     if (drawingName.endsWith('_selection_preview')) {
       isSelectionPreview = true; //skip reorder idx
     }

    let isTouchActionEdit = false;
     if (drawingName.endsWith('_touchAction_edit')) {
       isTouchActionEdit = true; //skip reorder idx
     }
    // Enhanced version parameter logging
    if (ver !== undefined && ver !== null && ver !== '') {
        console.log(`[DRAWING_REQUEST] Drawing "${drawingName}" requested with version: "${ver}"`);
    } else {
        console.log(`[DRAWING_REQUEST] Drawing "${drawingName}" requested with no version (fresh request)`);
    }
    
    // Check if this is a temporary edit drawing
    let drawingData = null;
    let isTemporary = false;
    let isDwgEditPreview = false;
    
    if (tempEditDrawings[drawingName]) {
        drawingData = tempEditDrawings[drawingName];
        isTemporary = true;
        console.log(`Found temporary drawing: ${drawingName}`);
    } else if (drawings[drawingName]) {
        drawingData = drawings[drawingName];
        // Check if this is an edit preview drawing (should use requested name)
        if (drawingName.endsWith('_edit_preview')) {
            isDwgEditPreview = true;
            console.log(`Found edit preview drawing: ${drawingName}`);
        } else {
            console.log(`Found regular drawing: ${drawingName}`);
        }
    } else {
        // Special case: if drawingName looks like it should be a temp drawing but isn't found in tempEditDrawings,
        // check if we need to sync from the original drawing
        if (drawingName.endsWith('-edit')) {
            const originalName = drawingName.replace('-edit', '');
            if (drawings[originalName]) {
                console.log(`Creating missing temp drawing ${drawingName} from ${originalName}`);
                // Create the temp drawing if it doesn't exist
                // For edit preview drawings, check if there's a filtered version in drawings
                let sourceData;
                let inheritedMode = null;
                if (drawingName.endsWith('_edit_preview') && drawings[drawingName]) {
                    // Use the filtered version from drawings if available
                    sourceData = drawings[drawingName].data;
                    inheritedMode = drawings[drawingName].mode;
                    console.log(`[TEMP_INHERIT] Using filtered drawing data for ${drawingName} with mode: ${inheritedMode}`);
                } else {
                    // Use the original drawing data
                    sourceData = drawings[originalName].data;
                }
                
                tempEditDrawings[drawingName] = {
                    originalName: originalName,
                    data: JSON.parse(JSON.stringify(sourceData)),
                    updates: [],
                    tempPreviewItem: null,
                    mode: inheritedMode
                };
                drawingData = tempEditDrawings[drawingName];
                isTemporary = true;
            }
        }
    }
    
    // Check if drawing exists, return error if it doesn't
    if (!drawingData) {
        console.log(`Drawing "${drawingName}" not found in regular or temporary storage`);
        // Return error response with 404 status
        const notFoundResponse = {
            pfodDrawing: 'error',
            error: 'drawing_not_found',
            message: `Drawing "${drawingName}" not found`,
            name: drawingName
        };
        
        // Log the raw JSON being sent
        logJsonResponse(req, notFoundResponse);
        
        // Set proper headers and send the response
        res.status(404);
        res.set('Content-Type', 'application/json');
        return res.send(JSON.stringify(notFoundResponse));
    }
    
    // Check if this is an update-only drawing (for preview hide/show functionality) BEFORE version matching
    const isUpdateOnly = drawingData.isUpdateOnly;
    
    // If client has a version and it matches, send an update
    // However, always send "start" response for edit preview drawings to ensure clean initialization
    const isEditPreview = drawingName.endsWith('_edit_preview');
    if (ver && ver === drawingData.data.version && !isEditPreview) {
        console.log(`Version match: ${ver} - sending update response`);
        
        // Special handling for update-only drawings (preview hide/show functionality)
        if (isUpdateOnly) {
            // Check if this drawing has hide/unhide commands (indicating it's a subsequent update)
            const allItems = drawingData.data.items || [];
            const hideUnhideItems = allItems.filter(item => 
                item.type === 'hide' || item.type === 'unhide'
            );
            
            if (hideUnhideItems.length > 0) {
                // This is a subsequent request with hide/unhide commands - send update response
                console.log(`[PREVIEW_UPDATE] Drawing "${drawingName}" has hide/unhide commands, sending update response`);
                
                // Send only the last hide/unhide command (the most recent one)
                const updateItems = [hideUnhideItems[hideUnhideItems.length - 1]];
                
                const response = {
                    pfodDrawing: 'update',
                    js_ver: JS_VERSION,
                    version: drawingData.data.version,
                    refresh: drawingData.data.refresh || 0,
                    items: updateItems
                };
                
                console.log(`[PREVIEW_UPDATE] Sending update with ${updateItems.length} command(s):`, updateItems.map(item => `${item.type}${item.idx ? ` idx=${item.idx}` : ''}`));
                logJsonResponse(req, response);
                res.set('Content-Type', 'application/json');
                return res.send(JSON.stringify(response));
            }
        }
        
        // Normal update logic for non-updateOnly drawings
        // Just send the latest update or an empty update
        if (drawingData.updates.length > 0) {
            const latestUpdate = drawingData.updates[drawingData.updates.length - 1];
            
            // Log the raw JSON being sent
            logJsonResponse(req, latestUpdate);
            
            // Set proper headers and send the response
            res.set('Content-Type', 'application/json');
            return res.send(JSON.stringify(latestUpdate));
        } else {
            // Don't generate random updates for drawings with refresh=0
            if (drawingData.data.refresh === 0) {
                console.log(`No updates generated for ${drawingName} - refresh rate is 0`);
            }
            
            const emptyUpdate = {
                pfodDrawing: 'update',
                js_ver: JS_VERSION,
                version: drawingData.data.version,
                refresh: drawingData.data.refresh,
                items: []
            };
            
            // Log the raw JSON being sent
            logJsonResponse(req, emptyUpdate);
            
            // Set proper headers and send the response
            res.set('Content-Type', 'application/json');
            return res.send(JSON.stringify(emptyUpdate));
        }
    } else {
        // Version doesn't match or not provided, send full drawing data
        console.log(`Version mismatch or not provided - sending start response with version: ${drawingData.data.version}`);
        
        // Only update numeric indices for non-temporary drawings (let client handle temp drawing indices)
        if ((!isTemporary) && (!isSelectionPreview) && (!isTouchActionEdit)){
     //       updateNumericIndices(drawingData.data, drawingName);
        }
        if ((!isSelectionPreview) && (!isTouchActionEdit)) {
    //      cleanUpTouchActionRefs(drawingData.data, drawingName); // always
        }
        
        // Send the full drawing
        // Reorganize the drawing data to ensure version comes right after name
        const { name, version, ...rest } = drawingData.data;
        let responseData = { ...rest };
        
        // If in touchAction mode or touchActionItemPreview mode, filter out touchActionInput items from the response
        // Check both the request mode parameter and the stored drawing mode
        const effectiveMode = mode || drawingData.mode;
        console.log(`[DEBUG_MODE] Drawing: ${drawingName}, requestMode: ${mode}, storedMode: ${drawingData.mode}, effectiveMode: ${effectiveMode}`);
        
        // Debug: show what items are in the drawing before filtering
        if (responseData.items) {
            const touchActionInputCount = responseData.items.filter(item => item.type === 'touchActionInput').length;
            console.log(`[DEBUG_RESPONSE] Drawing "${drawingName}" has ${responseData.items.length} total items, ${touchActionInputCount} touchActionInput items before filtering`);
        }

        // Filter out incomplete hide/unhide/erase items only, or ALL hide/unhide/erase items for selection_preview
        if (responseData.items) {
            const originalItemCount = responseData.items.length;
            responseData.items = responseData.items.filter(item => {
                // For selection_preview drawings, keep hide/unhide/erase items so drawingDataProcessor can process them properly
                // (Client already filters out touchActionInputs)
                
                // For non-selection_preview drawings, only filter incomplete hide/unhide items
                if (item.type === 'hide' || item.type === 'unhide') {
                    if ((!item.idx || !item.idxName) && (!item.cmd || !item.cmdName)) {
                        console.log(`[FILTER] Removing incomplete ${item.type} item without idx or idxName:`, JSON.stringify(item));
                        return false;
                    }
                }
                
                // For erase items, only keep if they have idx or cmd (complete items)
                if (item.type === 'erase') {
                    if ((!item.idx || !item.idxName) && (!item.cmd || !item.cmdName)) {
                        console.log(`[FILTER] Removing incomplete erase item without idx or cmd:`, JSON.stringify(item));
                        return false;
                    }
                }
                
                return true;
            });
            const filteredItemCount = responseData.items.length;
            if (originalItemCount !== filteredItemCount) {
                console.log(`[FILTER] Filtered out ${originalItemCount - filteredItemCount} incomplete command items`);
            }
        }
        if ((effectiveMode === 'touchAction' || effectiveMode === 'touchActionItemPreview') && responseData.items) {
            const originalItemCount = responseData.items.length;
            responseData.items = responseData.items.filter(item => item.type !== 'touchActionInput');
            const filteredItemCount = responseData.items.length;
            if (originalItemCount !== filteredItemCount) {
                console.log(`[RESPONSE_FILTER] Filtered out ${originalItemCount - filteredItemCount} touchActionInput items for touchAction/touchActionItemPreview mode in response (mode: ${effectiveMode})`);
            }
        }
        
        // The isUpdateOnly check is now handled earlier in the version-matching logic
        
        // Normal start response with full drawing data
        const response = {
            pfodDrawing: 'start',
            js_ver: JS_VERSION,
            version,
            ...responseData
        };
        
        // Log the raw JSON being sent
        logJsonResponse(req, response);
        
        // Set proper headers and send the response
        res.set('Content-Type', 'application/json');
        return res.send(JSON.stringify(response));
    }
}

// Central route handler for all drawing-related requests
// This handles both HTML requests (for browser) and JSON requests (for API)
app.get('/:drawingName', (req, res, next) => {
    const { drawingName } = req.params;
    console.log(`[ENDPOINT] /:drawingName - drawingName="${drawingName}", allQuery=${JSON.stringify(req.query)}`);
    
    // Skip special routes and API routes
    if (drawingName === 'control' || drawingName === 'api') {
        return next();
    }
    
    // IMPORTANT: Skip add-item-endpoint completely - it's handled by a special handler
    if (drawingName === 'add-item-endpoint') {
        console.log('Skipping normal handler for add-item-endpoint - using special handler');
        return next();
    }
    
    // Determine if this is an API request by checking for the X-Requested-With header
    // or an explicit Accept: application/json header without accepting HTML
    // IMPORTANT: iframe requests should be treated as HTML requests
    const acceptHeader = req.get('Accept') || '';
    const isApiRequest = 
        req.get('X-Requested-With') === 'XMLHttpRequest' || 
        (acceptHeader === 'application/json' || (acceptHeader.includes('application/json') && !acceptHeader.includes('text/html')));
    
    // Log detailed information about the request
    console.log(`[${drawingName}] Request headers:`, {
        'x-requested-with': req.get('X-Requested-With'),
        'accept': req.get('Accept'),
        'user-agent': req.get('User-Agent'),
        'is-api-request': isApiRequest,
        'full-url': req.url,
        'method': req.method
    });
    
    // For regular browser requests, serve error page
    if (!isApiRequest) {
        return res.sendFile(path.join(__dirname, 'intro-page.html'));
    }
    console.log(`request for drawing: ${drawingName}`);
    const { ver } = req.query;
    if (drawingName == 'add-item-endpoint') {
        console.log(`handleEndPointDrawingRequest`);
        handleEndPointDrawingRequest(req, res, drawingName, ver);
    } else {
      // For API requests, handle the drawing data using the helper function
      const { ver } = req.query;
      handleDrawingRequest(req, res, drawingName, ver);
    }
});


// Add-item endpoint for storing the current drawing and temporary item
app.post('/add-item', (req, res) => {
    console.log(`[ENDPOINT] POST /add-item - drawingName="${req.query.drawing}", body=${JSON.stringify(req.body)}`);
    const drawingName = req.query.drawing;
    
    if (!drawingName) {
        console.error("ERROR: No drawing name provided in /add-item POST request");
        return res.status(400).json({ 
            success: false, 
            error: "No drawing name provided" 
        });
    }
    
    console.log(`POST /add-item - Request received for drawing: ${drawingName}`);
    console.log(`Request body:`, JSON.stringify(req.body, null, 2));
    
    if (!req.body) {
        console.error("ERROR: No item data provided in request body");
        return res.status(400).json({
            success: false,
            error: "No item data provided"
        });
    }
    
    // Deep clone the request body to avoid reference issues
    const itemData = JSON.parse(JSON.stringify(req.body));
    
    // Store drawing name and item in tempItemStorage
    tempItemStorage.drawingName = drawingName;
    tempItemStorage.item = itemData;
    
    console.log(`Stored temporary item for ${tempItemStorage.drawingName}:`, JSON.stringify(tempItemStorage.item, null, 2));
    
    // Make sure the drawing exists in our server-side data
    if (!drawings[drawingName]) {
        console.warn(`Warning: Drawing ${drawingName} not found, creating it`);
        drawings[drawingName] = {
            data: createNewDrawing(drawingName),
            updates: []
        };
    }
    
    // Add timestamp for debugging if not already present
    if (!tempItemStorage.item.timestamp) {
        tempItemStorage.item.timestamp = Date.now();
    }
   
    console.log(`Successfully stored temporary item for drawing: ${drawingName}`);
    console.log(`Current tempItemStorage:`, tempItemStorage);
    
    res.json({ 
        success: true,
        message: "Item stored successfully",
        item: tempItemStorage.item
    });
});

// New endpoint for adding an item permanently to a drawing
app.post('/api/drawing/add-item', (req, res) => {
    console.log(`[ENDPOINT] POST /api/drawing/add-item - drawingName="${req.body.drawingName}", itemType="${req.body.item?.type}"`);
    const { drawingName, item } = req.body;
    
    if (!drawingName) {
        console.error("ERROR: No drawing name provided in add-item request");
        return res.status(400).json({ 
            success: false, 
            error: "No drawing name provided" 
        });
    }
    
    if (!item) {
        console.error("ERROR: No item data provided in add-item request");
        return res.status(400).json({
            success: false,
            error: "No item data provided"
        });
    }
    
    console.log(`POST /api/drawing/add-item - Adding item to drawing: ${drawingName}`);
    console.log(`Item:`, JSON.stringify(item, null, 2));
    
    // Validate index, erase, hide, and unhide items - check idx value is = 1 
    if (item.type === 'index' || item.type === 'erase' || item.type === 'hide' || item.type === 'unhide') {
        // Convert idx to integer if it's a string
        if (typeof item.idx === 'string') {
            item.idx = parseInt(item.idx);
        }
        
        // Check for valid idx
        if (item.idx === undefined || item.idx === null || item.idx < 1 || isNaN(item.idx)) {
            console.error(`Invalid ${item.type} item - idx must be = 1`, item);
            return res.status(400).json({
                success: false,
                error: `Invalid ${item.type} item - idx must be = 1`
            });
        }
    }
    
    // Check if drawing exists
    if (!drawings[drawingName]) {
        console.error(`Drawing "${drawingName}" not found`);
        return res.status(404).json({
            success: false,
            error: `Drawing "${drawingName}" not found`
        });
    }
    
    // Get current items and add the new one
    let items = [...drawings[drawingName].data.items];
    
    // Per new requirements: just add any item to storage without processing
    // No special handling for erase items, duplicate index items, or index items
    // Simply add the item, let pfodWeb.js resolve any conflicts
    console.log(`Adding item to drawing without processing, type: ${item.type}`);
    
    // Log specific item types for debugging
    if (item.type === 'erase') {
        console.log(`Adding erase item with index ${item.idx} directly to items list`);
    } else if (item.idx !== 'null' && item.idx !== null) {
        console.log(`Adding indexed item with index ${item.idx} directly to items list`);
        // Note: We're not checking for duplicates now, just adding it directly
    } else {
        console.log('Adding unindexed item directly to items list');
    }
    
    // Add the item to the items array
    // Use handlers for CMD-based insertion logic
    if (!touchActionHandler.insertTouchActionItemByCMD(items, item) && 
        !touchActionInputHandler.insertTouchActionInputByCMD(items, item)) {
        console.log(`[CMD_INSERT] Adding ${item.type} to end (no cmd or not touch item)`);
        // For all other items, add to the end
        items.push(item);
    }
    
    // Generate a new version to force a full reload next time
    const oldVersion = drawings[drawingName].data.version;
    const newVersion = `V${Date.now()}`;
    
    // Update the drawing with the new items and version
    drawings[drawingName].data.items = items;
    drawings[drawingName].data.version = newVersion;
    
    // If this is an edit preview drawing, sync changes to original
    syncEditPreviewToOriginal(drawingName);
    
    console.log(`Drawing "${drawingName}" updated with new item`);
    console.log(`Total items: ${items.length}`);
    console.log(`Version changed: ${oldVersion} -> ${newVersion}`);
    
    // Return success
    res.json({
        success: true,
        message: "Item added to drawing",
        oldVersion: oldVersion,
        newVersion: newVersion
    });
});

function handleEndPointDrawingRequest(req, res, drawingName, ver) {        
    console.log(`=== DEBUG: add-item-endpoint HANDLER ===`);
    console.log(`Request URL: ${req.url}`);
    console.log(`Request Query Parameters:`, req.query);
    console.log(`Current tempItemStorage:`, tempItemStorage);
    
    // CRITICAL: Record the request time for debugging race conditions
    const requestTime = new Date().toISOString();
    console.log(`Request received at: ${requestTime}`);
    
    let drawingToUse = null;
    
    // Check tempItemStorage
    if (tempItemStorage.drawingName && tempItemStorage.drawingName !== 'add-item-endpoint') {
        drawingToUse = tempItemStorage.drawingName;
        console.log(`[FALLBACK 1] Using drawing from tempItemStorage: ${drawingToUse}`);
    } 
    
    // Debug output about available drawings to help identify issues
    console.log(`Available drawings: ${Object.keys(drawings).join(', ')}`);
    
    // If we don't have a valid drawing from any source, return an empty response
    if (!drawingToUse) {
        console.error("CRITICAL ERROR: No valid drawing name found from any source!");
        console.error("URL: " + req.url);
        console.error("Query params: " + JSON.stringify(req.query));
        console.error("Headers: " + JSON.stringify(req.headers));
        
        return res.json({
            pfodDrawing: 'start',
            version: 'null',
            x: 50,
            y: 50,
            color: 'white',
            refresh: 0,
            items: []
        });
    }
    
    // 2. Check if the actual drawing exists, return error if it doesn't
    const realDrawingName = drawingToUse;
    console.log(`Using real drawing: ${realDrawingName}`);
       
    if (!drawings[realDrawingName]) {
        console.warn(`Drawing ${realDrawingName} not found.`);
        // Return error response
        return res.status(404).json({
            pfodDrawing: 'error',
            error: 'drawing_not_found',
            message: `Drawing "${realDrawingName}" not found`,
            name: realDrawingName
        });
    }
    
    const drawingData = drawings[realDrawingName].data;
    console.log(`Drawing data:`, {
        name: drawingData.name,
        x: drawingData.x,
        y: drawingData.y,
        color: drawingData.color,
        items: drawingData.items.length
    });
    
    // 3. Add the temporary item to the items list if it exists
    let itemsList = [...drawingData.items];
    
    // Always add the temporary item if it exists, with extra logging
    if (tempItemStorage.item) {
        console.log(`Adding temporary item:`, JSON.stringify(tempItemStorage.item, null, 2));
        
        // Filter out certain item types that shouldn't be displayed
        if (tempItemStorage.item.type !== 'init' && 
            tempItemStorage.item.type !== 'confirm' && 
            tempItemStorage.item.type !== 'iframe_loaded') {
            
            // Validate index and erase items - check idx value is = 1
            if (tempItemStorage.item.type === 'index' || tempItemStorage.item.type === 'erase' || tempItemStorage.item.type === 'hide' || tempItemStorage.item.type === 'unhide') {
                // Convert idx to integer if it's a string
                if (typeof tempItemStorage.item.idx === 'string') {
                    tempItemStorage.item.idx = parseInt(tempItemStorage.item.idx);
                }
                
                // Check for valid idx
                if (tempItemStorage.item.idx === undefined || tempItemStorage.item.idx === null || 
                    tempItemStorage.item.idx < 1 || isNaN(tempItemStorage.item.idx)) {
                    console.error(`Invalid ${tempItemStorage.item.type} item - idx must be = 1`, tempItemStorage.item);
                    // Don't add invalid items to the preview, just skip this part
                } else {
                    console.log(`Item type ${tempItemStorage.item.type} with valid idx=${tempItemStorage.item.idx} - adding to itemsList`);
                    itemsList.push(tempItemStorage.item);
                }
            } else {
                console.log(`Item type ${tempItemStorage.item.type} is valid for display - adding to itemsList`);
                itemsList.push(tempItemStorage.item);
            }
        } else {
            console.log(`Skipping item with type: ${tempItemStorage.item.type} as it's not meant for display`);
        }
    } else {
        console.log(`No temporary item found. tempItemStorage: ${JSON.stringify(tempItemStorage, null, 2)}`);
    }
    
    // 4. Create a response that uses the actual drawing's properties
    // but with the name 'add-item-endpoint' to satisfy app.js
    const response = {
        pfodDrawing: 'start',
        js_ver: JS_VERSION,              // Add JavaScript version
        version: req.query.version || 'null', // Use the version from the query if provided
        x: drawingData.x,             // Use the real drawing's dimensions
        y: drawingData.y, 
        color: drawingData.color,
        refresh: 2000,                // Fixed refresh for preview
        items: itemsList
    };
    
    console.log(`Sending response with dimensions ${drawingData.x}x${drawingData.y}, color=${drawingData.color}, items: ${itemsList.length}`);
//    res.json(response);
    // Set proper headers and send the response
    res.set('Content-Type', 'application/json');
    return res.send(JSON.stringify(response));    
};

// Export drawing to JSON file
app.get('/api/drawings/:drawingName/export', (req, res) => {
    const { drawingName } = req.params;
    const filename = req.query.filename || `${drawingName}.json`;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    try {
        // Get the full drawing data
        const drawingData = drawings[drawingName].data;
        
        // Create a copy of the drawing data and add pfodDrawing: "start" and js_ver as the first entries to exactly match what is sent to the viewer
        // Omit the name property as it's inferred from the filename
        const { name, version, ...rest } = drawingData;
        const exportData = {
            pfodDrawing: "start",
            js_ver: JS_VERSION,
            version,
            ...rest
        };
        
        // Prepare the response with proper headers for file download
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/json');
        
        // Send the drawing data as formatted JSON with 2-space indentation
        const formattedJson = JSON.stringify(exportData, null, 2);
        res.send(formattedJson);
        
        console.log(`Drawing "${drawingName}" exported as JSON with filename: ${filename} (includes pfodDrawing: "start")`);
    } catch (error) {
        console.error(`Error exporting drawing "${drawingName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to export drawing: ${error.message}` 
        });
    }
});

// Delete a drawing
app.delete('/api/drawings/:drawingName/delete', (req, res) => {
    const { drawingName } = req.params;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    try {
        // Delete the drawing
        delete drawings[drawingName];
        
        console.log(`Drawing "${drawingName}" unloaded`);
        
        res.json({ 
            success: true, 
            message: `Drawing "${drawingName}" unloaded successfully` 
        });
    } catch (error) {
        console.error(`Error unloading drawing "${drawingName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to unload drawing: ${error.message}` 
        });
    }
});

// Create temporary copy for editing (non-touchAction cases)
// Note: touchAction temp-copy is handled by touchActionHandler
app.post('/api/drawings/:drawingName/temp-copy', (req, res) => {
    console.log(`[ENDPOINT] POST /api/drawings/:drawingName/temp-copy - drawingName="${req.params.drawingName}", mode="${req.body.mode}"`);
    const { drawingName } = req.params;
    const { mode, editIndex, cmd, cmdName } = req.body;
    
    
    // Redirect touchActionInput requests to the handler
    if (mode === 'touchActionInput') {
        return touchActionInputHandler.createTouchActionInputTempCopy(req, res, drawings, tempEditDrawings);
    }
    
    console.log(`[TEMP_COPY_DEBUG] Creating non-touchAction temp copy for drawing: ${drawingName}`);
    console.log(`[TEMP_COPY_DEBUG] Received params: mode=${mode}, editIndex=${editIndex}, cmdName=${cmdName}, cmd=${cmd}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    try {
        // Create temporary name for non-touchAction mode
        const tempName = `${drawingName}_edit_preview`;
        
        // Always recreate temp drawing from current main drawing to ensure up-to-date data
        if (tempEditDrawings[tempName]) {
            console.log(`Removing existing temporary drawing: ${tempName} (recreating from current main drawing)`);
            delete tempEditDrawings[tempName];
        }
        
        // Deep copy the original drawing
        const originalData = drawings[drawingName].data;
        
        console.log(`[DEBUG_TEMP_COPY_ORIG] Original drawing has ${originalData.items ? originalData.items.length : 0} items:`);
        console.log(`[DEBUG_TEMP_COPY_ORIG] Full originalData structure:`, JSON.stringify(originalData, null, 2));
        if (originalData.items) {
            originalData.items.forEach((item, idx) => {
                if (item.type === 'touchActionInput') {
                    console.log(`[DEBUG_TEMP_COPY_ORIG]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) *** TOUCHACTIONINPUT`);
                } else if (item.type === 'touchAction' || item.type === 'touchZone') {
                    console.log(`[DEBUG_TEMP_COPY_ORIG]   ${idx}: ${item.type}(cmdName=${item.cmdName || 'none'})(cmd=${item.cmd || 'none'})`);
                } else {
                    console.log(`[DEBUG_TEMP_COPY_ORIG]   ${idx}: ${item.type}(cmdName=${item.cmdName || 'none'})(cmd=${item.cmd || 'none'})`);
                }
            });
        }
        
        const tempData = JSON.parse(JSON.stringify(originalData));
        
        console.log(`[DEBUG_TEMP_COPY_TEMP] Temp copy has ${tempData.items ? tempData.items.length : 0} items:`);
        if (tempData.items) {
            tempData.items.forEach((item, idx) => {
                if (item.type === 'touchActionInput') {
                    console.log(`[DEBUG_TEMP_COPY_TEMP]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) *** TOUCHACTIONINPUT`);
                } else if (item.type === 'touchAction' || item.type === 'touchZone') {
                    console.log(`[DEBUG_TEMP_COPY_TEMP]   ${idx}: ${item.type}(cmdName=${item.cmdName || 'none'})(cmd=${item.cmd || 'none'})`);
                }
            });
        }
        
        // Store temporary copy
        tempEditDrawings[tempName] = {
            originalName: drawingName,
            data: tempData,
            updates: [],
            tempPreviewItem: null,
            mode: mode,
            editIndex: editIndex !== undefined ? parseInt(editIndex) : undefined
        };
        
        console.log(`Created temporary copy "${tempName}" from "${drawingName}"`);
        
        res.json({ 
            success: true, 
            tempName: tempName,
            message: `Temporary copy created: ${tempName}` 
        });
    } catch (error) {
        console.error(`Error creating temporary copy of "${drawingName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to create temporary copy: ${error.message}` 
        });
    }
});

// Update temporary copy for touchZones need to update cmdName of actions and actionInputs based on cmd, which is not edited 
app.post('/api/drawings/:tempName/temp-update', (req, res) => {
    console.log(`[ENDPOINT] POST /api/drawings/:tempName/temp-update - tempName="${req.params.tempName}", itemType="${req.body.item?.type}"`);
    const { tempName } = req.params;
    const { item, editIndex, preview = true, mode, cmd, cmdName } = req.body;
    console.log(`[TEMP_UPDATE] item`, JSON.stringify(item));
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    if (!item) {
        return res.status(400).json({
            success: false,
            error: "No item data provided"
        });
    }
    
    // Validate touchAction mode restrictions
    let validation = touchActionHandler.validateTouchActionMode(mode, item);
    if (!validation.valid) {
        console.log(`[TEMP_UPDATE] Rejected ${item.type} item in ${mode} mode for "${tempName}"`);
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }
    
    // Validate touchActionInput mode restrictions
    validation = touchActionInputHandler.validateTouchActionInputMode(mode, item);
    if (!validation.valid) {
        console.log(`[TEMP_UPDATE] Rejected ${item.type} item in ${mode} mode for "${tempName}"`);
        return res.status(400).json({
            success: false,
            error: validation.error
        });
    }
    
    try {
        const items = tempEditDrawings[tempName].data.items;
        
        // Special handling for touchAction item editing
        if (tempName.endsWith('_touchAction_item_edit') && cmdName) {
            // For touchAction item editing, always use the touchAction-specific logic
            // This handles both edit and add modes properly within the touchAction structure
            touchActionHandler.addTempItemToTouchAction(items, item, cmdName, tempEditDrawings, tempName);
        } else if (editIndex !== null && editIndex !== undefined && editIndex >= 0 && editIndex < items.length) {
            // Edit mode for regular (non-touchAction) items: replace the specific item
            console.log(`Replacing item at index ${editIndex} in temporary drawing "${tempName}"`);
            console.log(`[TEMP_DWG_DEBUG] Temp drawing "${tempName}" items before replacement:`);
            items.forEach((item, index) => {
                console.log(`[TEMP_DWG_DEBUG]   ${index}: ${item.type}${item.idxName ? `(idxName=${item.idxName})` : ''}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}`);
            });
            console.log(`[EDIT_DEBUG] Before replacement - items.length: ${items.length}`);
            console.log(`[EDIT_DEBUG] Item at editIndex ${editIndex} before replacement:`, JSON.stringify(items[editIndex]));
            items[editIndex] = item;
            console.log(`[EDIT_DEBUG] After replacement - items.length: ${items.length}`);
            console.log(`[EDIT_DEBUG] Item at editIndex ${editIndex} after replacement:`, JSON.stringify(items[editIndex]));
            console.log(`[TEMP_DWG_DEBUG] Temp drawing "${tempName}" items after replacement:`);
            items.forEach((item, index) => {
                console.log(`[TEMP_DWG_DEBUG]   ${index}: ${item.type}${item.idxName ? `(idxName=${item.idxName})` : ''}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}`);
            });
            tempEditDrawings[tempName].tempPreviewItem = null; // Not using temp preview for edit mode
            // update associated touchAction touchActionInput
            console.log(` After item replacement:`);
            items.forEach((item, index) => {
              console.log(`[UPDATE_IDX]   ${index}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}${item.cmd ? `(cmd=${item.cmd})` : '(no_cmd)'}${item.idxName ? `(idxName=${item.idxName})` : ''}`);
            });

            console.log(`Replacing item at index ${editIndex} item.type:${item.type}`);
            if (item.type == 'touchZone') {
              let touchZone = item;
              console.log(`Replacing touchZone, update cmdName, looking for cmd:${touchZone.cmd}`);
              items.forEach((item) => {
                console.log(`Processing item item.type:${item.type}`);
              if ((item.type == 'touchActionInput') && (touchZone.cmd == item.cmd)) {
                item.cmdName = touchZone.cmdName;
              } else if ((item.type == 'touchAction')&& (touchZone.cmd == item.cmd)) {
                item.cmdName = touchZone.cmdName;
              }
              });
            } else {
              // update idx
              console.log(` Calling updateNumericIndices:`);
              console.log(`[EDIT_DEBUG] Before updateNumericIndices - items.length: ${items.length}`);
              updateNumericIndices(tempEditDrawings[tempName].data,tempName);
              console.log(`[EDIT_DEBUG] After updateNumericIndices - items.length: ${items.length}`);
              items.forEach((item, index) => {
                console.log(`[EDIT_DEBUG]   ${index}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}${item.cmd ? `(cmd=${item.cmd})` : '(no_cmd)'}${item.idxName ? `(idxName=${item.idxName})` : ''}`);
              });
              console.log(`[TEMP_DWG_DEBUG] Final temp drawing "${tempName}" state after all processing:`);
              tempEditDrawings[tempName].data.items.forEach((item, index) => {
                console.log(`[TEMP_DWG_DEBUG]   ${index}: ${item.type}${item.idxName ? `(idxName=${item.idxName})` : ''}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}`);
              });
            }
        } else {
            // Add mode for regular (non-touchAction) items: handle temporary preview item
            
            // Clean up any existing temporary items that don't match the current item type
            if (tempEditDrawings[tempName].tempPreviewItem) {
                const lastIndex = items.length - 1;
                // Remove the last item if it's temporary and different type than what we're adding
                if (lastIndex >= 0 && items[lastIndex].__isTemporary) {
                    const existingTempType = items[lastIndex].type;
                    if (existingTempType !== item.type) {
                        items.pop();
                        console.log(`Removed previous temporary ${existingTempType} item when switching to ${item.type}`);
                        tempEditDrawings[tempName].tempPreviewItem = null;
                    }
                }
            }
            
            // Skip temporary preview processing for command items (hide, unhide, erase)
            if (item.type === 'hide' || item.type === 'unhide' || item.type === 'erase') {
                // Command items should be added directly without temporary preview processing
                items.push(item);
                console.log(`Added command item "${item.type}" directly to "${tempName}"`);
            } else {
                // Remove the previous temporary preview item if it exists
                if (tempEditDrawings[tempName].tempPreviewItem) {
                    const lastIndex = items.length - 1;
                    // Remove the last item if it matches our temp preview item
                    if (lastIndex >= 0 && items[lastIndex].__isTemporary) {
                        items.pop();
                        console.log(`Removed previous temporary preview item`);
                    }
                }
                
                // Mark the new item as temporary for preview
                const tempItem = { ...item, __isTemporary: true };
                
                // Add the new temporary item
                items.push(tempItem);
                tempEditDrawings[tempName].tempPreviewItem = tempItem;
                console.log(`Added temporary preview item to "${tempName}"`);
            }
        }
        
        // Update version to force refresh
        tempEditDrawings[tempName].data.version = `V${Date.now()}`;
        
        // Skip updateNumericIndices for touchAction isolated environments to prevent touchAction removal
        // TouchAction item isolated environments don't have the full context needed for idx validation
        // Regular indexed item updates still need updateNumericIndices when "Use Index" is ticked
        if (!tempName.includes('_touchAction_item_edit')) {
            // recalculate idx incase just add idx setting
            updateNumericIndices(tempEditDrawings[tempName].data, tempName);
        } else {
            console.log(`[TEMP_UPDATE] Skipping updateNumericIndices for touchAction isolated environment: ${tempName}`);
        }
        
        // Sync changes for all temp drawings (always sync to preview drawing for touchAction)
        if (tempName.endsWith('_touchAction_edit') || tempName.endsWith('_touchAction_item_edit')) {
            const syncedDrawingData = touchActionHandler.syncTempEditToPreview(tempName, tempEditDrawings, drawings, updateNumericIndices);
            
            // Call updateNumericIndices on the synced drawing data to fix any cmd/idx mismatches after sync
            if (syncedDrawingData) {
                updateNumericIndices(syncedDrawingData, tempName);
                console.log(`[TEMP_UPDATE] Updated numeric indices for synced drawing after sync`);
            }
        } else if (tempName.endsWith('_touchActionInput_edit')) {
            // Sync touchActionInput changes to preview drawing (not main drawing)
            // This allows proper preview functionality without persisting to main until accept
            const syncedDrawingData = touchActionInputHandler.syncTouchActionInputToPreview(tempName, tempEditDrawings, drawings);
            
            // Call updateNumericIndices on synced drawing data to fix any cmd/idx mismatches after sync
            if (syncedDrawingData) {
                updateNumericIndices(syncedDrawingData, tempName);
                console.log(`[TEMP_UPDATE] Updated numeric indices for synced drawing after touchActionInput sync`);
            }
            
            // Debug: verify sync worked
            const tempDrawing = tempEditDrawings[tempName];
            if (tempDrawing && tempDrawing.originalName) {
                const mainDrawing = drawings[tempDrawing.originalName];
                if (mainDrawing && mainDrawing.data && mainDrawing.data.items) {
                    const touchActionInputCount = mainDrawing.data.items.filter(item => item.type === 'touchActionInput').length;
                    console.log(`[SYNC_DEBUG] After sync: Main drawing "${tempDrawing.originalName}" has ${touchActionInputCount} touchActionInput items`);
                    mainDrawing.data.items.forEach((item, index) => {
                        if (item.type === 'touchActionInput') {
                            console.log(`[SYNC_DEBUG] Item ${index}: touchActionInput(cmdName=${item.cmdName})`);
                        }
                    });
                }
            }
        } else if (!preview) {
            // Only sync changes to main drawing if this is not a preview update (for non-touchAction)
            const syncedDrawingData = touchActionHandler.syncTempEditToPreview(tempName, tempEditDrawings, drawings, updateNumericIndices);
            
            // Call updateNumericIndices on synced drawing data to fix any cmd/idx mismatches
            if (syncedDrawingData) {
                updateNumericIndices(syncedDrawingData, tempName);
                console.log(`[TEMP_UPDATE] Updated numeric indices for synced drawing after non-preview sync`);
            }
        } else {
            console.log(`[SYNC] No sync needed: tempEdit=true, preview=${preview}`);
        }
        
        console.log(`Updated temporary drawing "${tempName}" with ${editIndex !== null ? 'edited' : 'preview'} item`);
        
        res.json({ 
            success: true, 
            message: `Temporary drawing updated`,
            newVersion: tempEditDrawings[tempName].data.version
        });
    } catch (error) {
        console.error(`Error updating temporary drawing "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to update temporary drawing: ${error.message}` 
        });
    }
});

// Merge touchAction item from item edit temp drawing into touchAction structure
app.post('/api/drawings/:tempName/merge-touchaction-item', (req, res) => {
    return touchActionHandler.mergeTouchActionItem(req, res, drawings, tempEditDrawings);
});

// Sync touchAction structure after client-side modifications (removals, etc.)
app.post('/api/drawings/:tempName/sync-touchaction', (req, res) => {
    console.log(`[ENDPOINT] POST /api/drawings/:tempName/sync-touchaction - tempName="${req.params.tempName}", cmdName="${req.body.cmdName}" cmd="${req.body.cmd}"`);
    console.log(`[TOUCHACTION_SYNC_ENDPOINT] Request body contains touchAction with ${req.body.touchAction?.action?.length || 0} action items`);
    return touchActionHandler.syncTouchActionToServer(req, res, tempEditDrawings);
});

// Debug logging endpoint for client-side debugging
app.post('/debug-log', (req, res) => {
    const { message } = req.body;
    console.log(`[CLIENT_DEBUG] ${message}`);
    res.json({ success: true });
});

// Set refresh to zero on temporary drawing (for editing mode)
app.post('/api/drawings/:tempName/set-refresh-zero', (req, res) => {
    const { tempName } = req.params;
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    try {
        // Set refresh to 0 to inhibit automatic refresh during editing
        tempEditDrawings[tempName].data.refresh = 0;
        tempEditDrawings[tempName].data.version = `V${Date.now()}`;
        
        console.log(`Set refresh to 0 for temporary drawing "${tempName}"`);
        
        res.json({ 
            success: true, 
            message: `Refresh disabled for editing`
        });
    } catch (error) {
        console.error(`Error setting refresh to zero for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to disable refresh: ${error.message}` 
        });
    }
});

// Update canvas properties in temporary drawing (excluding refresh)
app.post('/api/drawings/:tempName/update-canvas', (req, res) => {
    const { tempName } = req.params;
    const { x, y, color } = req.body;
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    try {
        // Update canvas properties in temporary drawing (excluding refresh - always 0 during editing)
        tempEditDrawings[tempName].data.x = Math.min(Math.max(x || 50, 1), 255);
        tempEditDrawings[tempName].data.y = Math.min(Math.max(y || 50, 1), 255);
        tempEditDrawings[tempName].data.color = Math.min(Math.max(color, 0), 255);
        
        // Keep refresh at 0 during editing (don't update it)
        
        // Update version to force refresh
        tempEditDrawings[tempName].data.version = `V${Date.now()}`;
        
        // Sync changes to edit preview drawing and original
        const syncedDrawingData = touchActionHandler.syncTempEditToPreview(tempName, tempEditDrawings, drawings, updateNumericIndices);
        
        // Call updateNumericIndices on synced drawing data to fix any cmd/idx mismatches after canvas update
        if (syncedDrawingData) {
            updateNumericIndices(syncedDrawingData, tempName);
            console.log(`[TEMP_UPDATE] Updated numeric indices for synced drawing after canvas update`);
        }
        
        console.log(`Updated canvas properties for temporary drawing "${tempName}": ${x}x${y}, color=${color} (refresh remains 0 during editing)`);
        
        res.json({ 
            success: true, 
            message: `Canvas properties updated`,
            newVersion: tempEditDrawings[tempName].data.version
        });
    } catch (error) {
        console.error(`Error updating canvas properties for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to update canvas properties: ${error.message}` 
        });
    }
});

// Update refresh rate on main drawing
app.post('/api/drawings/:drawingName/update-refresh', (req, res) => {
    const { drawingName } = req.params;
    const { refresh } = req.body;
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    try {
        // Update refresh rate on main drawing
        drawings[drawingName].data.refresh = Math.max(refresh || 0, 0);
        drawings[drawingName].data.version = `V${Date.now()}`;
        
        // If this is an edit preview drawing, sync changes to original
        syncEditPreviewToOriginal(drawingName);
        
        console.log(`Updated main drawing "${drawingName}" refresh rate to ${refresh}ms`);
        
        res.json({ 
            success: true, 
            message: `Refresh rate updated`,
            newRefresh: drawings[drawingName].data.refresh
        });
    } catch (error) {
        console.error(`Error updating refresh rate for "${drawingName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to update refresh rate: ${error.message}` 
        });
    }
});

// Accept edit changes - copy from temporary to original
app.post('/api/drawings/:tempName/accept', (req, res) => {
    const { tempName } = req.params;
    
    // Delegate touchAction accepts to the handler
    if (tempName.includes('_touchAction_edit')) {
        return touchActionHandler.acceptTouchActionChanges(req, res, drawings, tempEditDrawings, reorderTouchActionItems);
    }
    
    // Delegate touchActionInput accepts to the handler
    if (tempName.includes('_touchActionInput_edit')) {
        return touchActionInputHandler.acceptTouchActionInputChanges(req, res, drawings, tempEditDrawings, reorderTouchActionItems);
    }
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    try {
        const originalName = tempEditDrawings[tempName].originalName;
        
        if (!drawings[originalName]) {
            return res.status(404).json({ 
                success: false, 
                error: `Original drawing "${originalName}" not found` 
            });
        }
        
        // Standard full drawing replacement for non-touchAction editing
        console.log(`[ACCEPT] Processing non-touchAction edit: ${tempName}`);
        const tempData = tempEditDrawings[tempName].data;
        
        console.log(`[DEBUG_BEFORE_CLEAN] TempData has ${tempData.items ? tempData.items.length : 0} items:`);
        if (tempData.items) {
            tempData.items.forEach((item, idx) => {
                if (item.type === 'touchActionInput') {
                    console.log(`[DEBUG_BEFORE_CLEAN]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) *** TOUCHACTIONINPUT`);
                } else {
                    console.log(`[DEBUG_BEFORE_CLEAN]   ${idx}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : `('')`}${item.cmd ? `(cmd=${item.cmd})` : `('')`}${item.idxName ? `(idxName=${item.idxName})` : `('')`}`);
                }
            });
        }
        
        const cleanedData = JSON.parse(JSON.stringify(tempData));
        
        // Remove temporary markers from items
        if (cleanedData.items) {
            cleanedData.items = cleanedData.items.map(item => {
                const { __isTemporary, ...cleanItem } = item;
                return cleanItem;
            });
            
            console.log(`[DEBUG_AFTER_CLEAN] CleanedData has ${cleanedData.items ? cleanedData.items.length : 0} items:`);
            cleanedData.items.forEach((item, idx) => {
                if (item.type === 'touchActionInput') {
                    console.log(`[DEBUG_AFTER_CLEAN]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) *** TOUCHACTIONINPUT`);
                } else {
                    console.log(`[DEBUG_AFTER_CLEAN]   ${idx}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : `('')`}${item.cmd ? `(cmd=${item.cmd})` : `('')`}${item.idxName ? `(idxName=${item.idxName})` : `('')`}`);
                }
            });
            
            // Only reorder if:
            // a) touchAction or touchActionInput items were added
            // b) touchZone was moved up or down
            const originalItems = drawings[originalName].data.items || [];
            
            // Check if new touchAction/touchActionInput items were added
            console.log('[DEBUG_REORDER] Checking for new touchActions...');
            console.log('[DEBUG_REORDER] Original items count:', originalItems.length);
            console.log('[DEBUG_REORDER] New items count:', cleanedData.items.length);
            
            // Log all touchAction/touchActionInput items in original and new
            const origTouchItems = originalItems.filter(item => 
                item.type === 'touchAction' || item.type === 'touchActionInput'
            );
            const newTouchItems = cleanedData.items.filter(item => 
                item.type === 'touchAction' || item.type === 'touchActionInput'
            );
            
            console.log('[DEBUG_REORDER] Original touchAction/touchActionInput items:');
            origTouchItems.forEach((item, idx) => {
                console.log(`[DEBUG_REORDER]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd})`);
            });
            
            console.log('[DEBUG_REORDER] New touchAction/touchActionInput items:');
            newTouchItems.forEach((item, idx) => {
                console.log(`[DEBUG_REORDER]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd})`);
            });
            
            const newTouchActions = cleanedData.items.filter(item => 
                (item.type === 'touchAction' || item.type === 'touchActionInput') &&
                !originalItems.some(orig => orig.type === item.type && orig.cmd === item.cmd)
            );
            
            console.log('[DEBUG_REORDER] Items detected as NEW touchActions:');
            newTouchActions.forEach((item, idx) => {
                console.log(`[DEBUG_REORDER]   ${idx}: ${item.type}(cmdName=${item.cmdName})(cmd=${item.cmd}) - NO MATCH in original`);
            });
            
            // Check if touchZones were moved (different positions)
            const touchZonesMoved = originalItems.some((origItem, origIndex) => {
                if (origItem.type === 'touchZone') {
                    const newIndex = cleanedData.items.findIndex(newItem => 
                        newItem.type === 'touchZone' && newItem.cmdName === origItem.cmdName
                    );
                    return newIndex !== -1 && newIndex !== origIndex;
                }
                return false;
            });
            
            console.log('[DEBUG_REORDER] TouchZones moved:', touchZonesMoved);
            console.log('[DEBUG_REORDER] newTouchActions.length:', newTouchActions.length);
            
            const needsReordering = newTouchActions.length > 0; // || touchZonesMoved;
            
            if (needsReordering) {
                cleanedData.items = reorderTouchActionItems(cleanedData.items, originalItems,originalName);
            } else {
                console.log('[ACCEPT_REORDER] No reordering needed - preserving original item order');
            }
        }
        
        // Don't overwrite the main drawing's refresh rate - it was updated separately
        // Keep the main drawing's current refresh rate
        const mainRefresh = drawings[originalName].data.refresh;
        cleanedData.refresh = mainRefresh;
        
        drawings[originalName].data = cleanedData;
        
        // Call updateNumericIndices to fix any cmd/idx mismatches after main drawing update
        updateNumericIndices(drawings[originalName].data, originalName);
        console.log(`[ACCEPT] Updated numeric indices for main drawing ${originalName} after accept`);
        
        // Generate new version for original
        drawings[originalName].data.version = `V${Date.now()}`;
        
        // Clean up temporary copy
        delete tempEditDrawings[tempName];
        
        console.log(`Accepted edit changes from "${tempName}" to "${originalName}"`);
        
        res.json({ 
            success: true, 
            message: `Changes accepted and applied to ${originalName}`,
            newVersion: drawings[originalName].data.version
        });
    } catch (error) {
        console.error(`Error accepting edit changes for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to accept changes: ${error.message}` 
        });
    }
});

// Cancel edit - delete temporary copy
app.delete('/api/drawings/:tempName/cancel', (req, res) => {
    const { tempName } = req.params;
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    try {
        const originalName = tempEditDrawings[tempName].originalName;
        
        // Clean up temporary copy
        delete tempEditDrawings[tempName];
        
        console.log(`Cancelled edit for "${tempName}", reverted to "${originalName}"`);
        
        res.json({ 
            success: true, 
            message: `Edit cancelled, reverted to ${originalName}`
        });
    } catch (error) {
        console.error(`Error cancelling edit for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to cancel edit: ${error.message}` 
        });
    }
});

// Import drawing from JSON file
// when importing from file, the caller adds a name property from the file name
// when importing changes from editors the referer has the name
app.post('/api/drawings/import', (req, res) => {
    try {
        // Get the drawing data from the request body
        let drawingData = req.body;
        
        // Log the raw drawing data received from client BEFORE any processing
        console.log(`[IMPORT_DEBUG] Raw drawing data received from client:`);
        console.log(`[IMPORT_DEBUG] Drawing name: ${drawingData?.name}`);
        console.log(`[IMPORT_DEBUG] Item count: ${drawingData?.items?.length || 0}`);
        if (drawingData?.items && Array.isArray(drawingData.items)) {
            console.log(`[IMPORT_DEBUG] Item order received from client:`);
            drawingData.items.forEach((item, index) => {
                console.log(`[IMPORT_DEBUG]   ${index}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : `('')`}${item.cmd ? `(cmd=${item.cmd})` : `('')`}${item.idxName ? `(idxName=${item.idxName})` : `('')`}`);
            });
        }
        console.log(`[IMPORT_DEBUG] Full JSON:`, JSON.stringify(drawingData, null, 2));
        
        // Extract drawing name from data or referer
        let drawingName = drawingData?.name;
        
        // If no name in data, try to extract from referer (for touchActionInput saves)
        if (!drawingName && req.headers.referer) {
            const refererUrl = new URL(req.headers.referer);
            drawingName = refererUrl.searchParams.get('drawing');
            
            // Also check if the referer path contains a drawing name
            if (!drawingName && req.headers.referer.includes('drawing=')) {
                const match = req.headers.referer.match(/drawing=([^&]*)/);
                if (match) {
                    drawingName = decodeURIComponent(match[1]);
                }
            }
        }
        
        if (!drawingData || !drawingName) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid drawing data or missing name' 
            });
        }
        
        // Remove pfodDrawing if it exists (since we only need it for the viewer, not for storage)
        // This will handle the new format where pfodDrawing: "start" is included
        if (drawingData.pfodDrawing) {
            console.log(`Found pfodDrawing: "${drawingData.pfodDrawing}" in imported data - removing for storage`);
            // Create a clean copy of the drawing data without the pfodDrawing field
            const { pfodDrawing, ...cleanData } = drawingData;
            drawingData = cleanData;
        }
        
        // Validate drawing data
        if (drawingData.x === undefined || drawingData.y === undefined || drawingData.color === undefined) {
            const missing = [];
            if (drawingData.x === undefined) missing.push('x (width)');
            if (drawingData.y === undefined) missing.push('y (height)');
            if (drawingData.color === undefined) missing.push('color (background)');
            return res.status(400).json({ 
                success: false, 
                error: `Invalid drawing data: missing required properties: ${missing.join(', ')}` 
            });
        }
        
        // Handle raw_items format - translate to items if present
        if (drawingData.raw_items && Array.isArray(drawingData.raw_items)) {
            console.log(`Found raw_items array with ${drawingData.raw_items.length} items - translating to items format`);
            try {
                // Use the server_translator to convert raw_items to items
                const translatedData = translator.translateRawItemsToItemArray(drawingData);
                drawingData.items = translatedData.items;
                // Remove raw_items from the data as we now have items
                delete drawingData.raw_items;
                console.log(`Successfully translated ${drawingData.items.length} items from raw_items format`);
            } catch (error) {
                console.error('Failed to translate raw_items:', error.message);
                return res.status(400).json({ 
                    success: false, 
                    error: `Failed to translate raw_items: ${error.message}` 
                });
            }
        }
        
        // Ensure items array exists
        if (!Array.isArray(drawingData.items)) {
            drawingData.items = [];
        }
        
        // Merge duplicate touchAction items with the same cmd while preserving order
            const touchActionMap = new Map();
            const processedItems = [];
            
            drawingData.items.forEach(item => {
                if (item && item.type === 'touchAction' && item.cmd) {
                    const cmd = item.cmd;
                    if (touchActionMap.has(cmd)) {
                        // Merge action arrays into existing touchAction (don't add to processedItems)
                        const existing = touchActionMap.get(cmd);
                        if (item.action && Array.isArray(item.action)) {
                            if (!existing.action) existing.action = [];
                            existing.action.push(...item.action);
                        }
                        console.log(`Merged touchAction cmd="${cmd}" - combined ${existing.action.length} action items`);
                    } else {
                        // First touchAction with this cmd - store it and add to processedItems in original position
                        const touchActionItem = { ...item };
                        touchActionMap.set(cmd, touchActionItem);
                        processedItems.push(touchActionItem);
                        console.log(`Found touchAction cmd="${cmd}" with ${(item.action || []).length} action items`);
                    }
                } else {
                    // Keep non-touchAction items as-is in their original position
                    processedItems.push(item);
                }
            });
            
            // Use the processed items array that preserves original order
            drawingData.items = processedItems;
            
            if (touchActionMap.size > 0) {
                console.log(`TouchAction merging completed: ${touchActionMap.size} unique touchAction commands`);
            }
            
            // Log the final order after merging
            console.log(`[IMPORT_DEBUG] Item order after TouchAction merging:`);
            drawingData.items.forEach((item, index) => {
                console.log(`[IMPORT_DEBUG]   ${index}: ${item.type}${item.cmd ? `(cmd=${item.cmd})` : ''}${item.idx ? `(idxName=${item.idx})` : ''}`);
            });
        
/**            
        // Validate index items in the drawing to ensure they have valid idx >= 1
        // if have index set indexed and set idxName if missing
            const validItems = drawingData.items.filter(item => {
                // Check if it's an index item with invalid idx
                if (item && item.type === 'index' && (item.idx === undefined || item.idx.trim() == '' || parseInt(item.idx) < 1)) {
                    console.error(`Skipping invalid index item during import - idx defined:`, item);
                    return false; // Skip this item
                }
                return true; // Keep all other items
            });
            
            // Update the items array with only valid items
            if (validItems.length !== drawingData.items.length) {
                console.log(`Validated items for import: removed ${drawingData.items.length - validItems.length} invalid index items`);
                drawingData.items = validItems;
            }
 **/       
        let validItems = [];
         // clean up idx items
        drawingData.items.forEach((item) => {
          if (item.idx !== undefined) {
            if (typeof item.idx === 'string') {
              item.idx = parseInt(item.idx);
            }
            if (item.idx < 1) {
              console.warn(`Skipping item with invalid idx ${item}`);
              return;
            }
          }
            if (item.idx) {
              item.indexed = true;
              if (item.idxName === undefined) {
                item.idxName = 'idx_'+item.idx;
              }
            } else {
              // Only clean up indexed and idxName for items that aren't supposed to have them
              // touchActionInput can have idxName without idx (it references other indexed items)
              if (item.type !== 'touchActionInput') {
                if (item.indexed !== undefined) {
                  delete item.indexed;
                }
                if (item.idxName !== undefined) {
                  delete item.idxName;
                }
              }
            }
            if (item.cmd) {
              if (item.cmdName === undefined) {
                item.cmdName = item.cmd;
              }
            }
            validItems.push(item);
        });
        drawingData.items = validItems;
        updateNumericIndices(drawingData,drawingName);
        
        // Set default for missing properties
        drawingData.refresh = drawingData.refresh !== undefined ? drawingData.refresh : 0;
        drawingData.version = drawingData.version || `V${Date.now()}`;
        
        // Check if drawing exists
        const overwriting = !!drawings[drawingName];
        
        // Update numeric indices based on current position before storing
        console.log(`Drawing "${drawingName}" calling updateNumericIndices`);
        updateNumericIndices(drawingData, drawingName);
        // Log the final order after merging
        
        // Store the drawing
        drawings[drawingName] = {
            data: drawingData,
            updates: []
        };
        
        console.log(`Drawing "${drawingName}" ${overwriting ? 'overwritten' : 'imported'} from JSON`);
        console.log(`Drawing details: ${drawingData.x}x${drawingData.y}, ${drawingData.items.length} items`);
        
        res.json({ 
            success: true, 
            message: `Drawing "${drawingName}" ${overwriting ? 'overwritten' : 'imported'} successfully` 
        });
    } catch (error) {
        console.error('Error importing drawing:', error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to import drawing: ${error.message}` 
        });
    }
});

// Start the server with auto port selection
findAvailablePort(PORT, (err, availablePort) => {
    if (err) {
        console.error('Error finding available port:', err);
        process.exit(1);
    }
    
    app.listen(availablePort, '0.0.0.0', () => {
        const localIp = getLocalIpAddress();
        console.log(`Server running on http://localhost:${availablePort}`);
        console.log(`To access from other devices on your network, use: http://${localIp}:${availablePort}`);
        console.log(`If the browser doesn't open automatically, please visit one of the URLs above`);
        
        // Update the port info for logging purposes
        if (availablePort !== PORT) {
            console.log(`Note: Original port ${PORT} was in use, using port ${availablePort} instead`);
        }
    });
});

