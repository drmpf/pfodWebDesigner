/*   
   touchActionInputHandler.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// TouchActionInput Handler Module
// Handles all touchActionInput-related operations for the drawing server

const path = require('path');

// Create temporary copy for touchActionInput editing
function createTouchActionInputTempCopy(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    const { mode, editIndex, cmd } = req.body;
    
    console.log(`[TOUCHACTIONINPUT_TEMP_COPY] Creating temp copy for drawing: ${drawingName}`);
    console.log(`[TOUCHACTIONINPUT_TEMP_COPY] Received params: mode=${mode}, editIndex=${editIndex}, cmd=${cmd}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    try {
        // Create temporary name for touchActionInput mode
        const tempName = `${drawingName}_touchActionInput_edit`;
        
        // Check if temporary drawing already exists
        if (tempEditDrawings[tempName]) {
            console.log(`Using existing temporary drawing: ${tempName}`);
            return res.json({ 
                success: true, 
                tempName: tempName,
                message: `Using existing temporary copy: ${tempName}` 
            });
        }
        
        // Deep copy the original drawing
        const originalData = drawings[drawingName].data;
        const tempData = JSON.parse(JSON.stringify(originalData));
        
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
}

// Accept touchActionInput edit changes
function acceptTouchActionInputChanges(req, res, drawings, tempEditDrawings) {
    const { tempName } = req.params;
    
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
        
        console.log(`[TOUCHACTIONINPUT_ACCEPT] Processing touchActionInput changes: ${tempName}`);
        
        // Standard full drawing replacement for touchActionInput editing
        const tempData = tempEditDrawings[tempName].data;
        const cleanedData = JSON.parse(JSON.stringify(tempData));
        
        // Remove temporary markers from items
        if (cleanedData.items) {
            cleanedData.items = cleanedData.items.map(item => {
                const { __isTemporary, ...cleanItem } = item;
                return cleanItem;
            });
        }
        
        // Don't overwrite the main drawing's refresh rate
        const mainRefresh = drawings[originalName].data.refresh;
        cleanedData.refresh = mainRefresh;
        
        drawings[originalName].data = cleanedData;
        
        // Generate new version for original
        drawings[originalName].data.version = `V${Date.now()}`;
        
        // Clean up temporary copy
        delete tempEditDrawings[tempName];
        
        console.log(`Accepted touchActionInput edit changes from "${tempName}" to "${originalName}"`);
        
        res.json({ 
            success: true, 
            message: `TouchActionInput changes accepted and applied to ${originalName}`,
            newVersion: drawings[originalName].data.version
        });
        
    } catch (error) {
        console.error(`Error accepting touchActionInput changes for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to accept touchActionInput changes: ${error.message}` 
        });
    }
}

// Clean up temporary touchActionInput drawings
function cleanupTouchActionInputTemp(req, res, tempEditDrawings) {
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
        
        console.log(`Cleaned up temporary touchActionInput drawing: ${tempName}`);
        
        res.json({ 
            success: true, 
            message: `Temporary drawing "${tempName}" cleaned up`
        });
    } catch (error) {
        console.error(`Error cleaning up temporary drawing "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to cleanup temporary drawing: ${error.message}` 
        });
    }
}

// Utility function to validate touchActionInput mode restrictions
function validateTouchActionInputMode(mode, item) {
    if (mode === 'touchActionInput' && item.type === 'touchAction') {
        return {
            valid: false,
            error: "touchAction items not allowed in touchActionInput mode"
        };
    }
    return { valid: true };
}

// Utility function to insert touchActionInput items after their touchZone by cmd
function insertTouchActionInputByCMD(items, item) {
    if (item.type === 'touchActionInput' && item.cmd) {
        console.log(`[TOUCHACTIONINPUT_INSERT] Processing touchActionInput with cmd "${item.cmd}"`);
        
        // Find touchZone with matching cmd
        let touchZoneIndex = -1;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type === 'touchZone' && items[i].cmd === item.cmd) {
                touchZoneIndex = i;
                console.log(`[TOUCHACTIONINPUT_INSERT] Found touchZone with cmd "${item.cmd}" at index ${i}`);
                break;
            }
        }
        
        let insertIndex;
        if (touchZoneIndex >= 0) {
            // Insert directly after the touchZone
            insertIndex = touchZoneIndex + 1;
            console.log(`[TOUCHACTIONINPUT_INSERT] Inserting touchActionInput at index ${insertIndex} (after touchZone)`);
        } else {
            // No touchZone found with this cmd, add to end
            insertIndex = items.length;
            console.log(`[TOUCHACTIONINPUT_INSERT] No touchZone found with cmd "${item.cmd}", adding to end at index ${insertIndex}`);
        }
        
        items.splice(insertIndex, 0, item);
        console.log(`[TOUCHACTIONINPUT_INSERT] Inserted touchActionInput with cmd "${item.cmd}" at index ${insertIndex}`);
        return true; // Indicates item was inserted by CMD logic
    }
    return false; // Not a touchActionInput item
}

// Setup touchActionInput routes (only for routes that don't conflict with main server)
function setupTouchActionInputRoutes(app, drawings, tempEditDrawings) {
    // Route for touch-action-inputs.html page
    app.get('/touch-action-inputs.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'touch-action-inputs.html'));
    });
    
    // Note: temp-copy and accept routes are handled by delegation in main server.js
    // Note: touchActionInput-specific endpoints could be added here if needed later
}

module.exports = {
    setupTouchActionInputRoutes,
    createTouchActionInputTempCopy,
    acceptTouchActionInputChanges,
    cleanupTouchActionInputTemp,
    validateTouchActionInputMode,
    insertTouchActionInputByCMD
};