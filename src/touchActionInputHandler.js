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
        const previewName = `${drawingName}_touchActionInput_edit_preview`;
        
        // Always recreate temp drawing from current main drawing to ensure up-to-date data
        if (tempEditDrawings[tempName]) {
            console.log(`Removing existing temporary drawing: ${tempName} (recreating from current main drawing)`);
            delete tempEditDrawings[tempName];
            if (tempEditDrawings[previewName]) {
                delete tempEditDrawings[previewName];
            }
        }
        
        // Deep copy the original drawing
        const originalData = drawings[drawingName].data;
        const tempData = JSON.parse(JSON.stringify(originalData));
        const previewData = JSON.parse(JSON.stringify(originalData));
        
        // Store temporary copy for editing
        tempEditDrawings[tempName] = {
            originalName: drawingName,
            data: tempData,
            updates: [],
            tempPreviewItem: null,
            mode: mode,
            editIndex: editIndex !== undefined ? parseInt(editIndex) : undefined
        };
        
        // Store temporary copy for preview
        tempEditDrawings[previewName] = {
            originalName: drawingName,
            data: previewData,
            updates: [],
            tempPreviewItem: null,
            mode: mode,
            editIndex: editIndex !== undefined ? parseInt(editIndex) : undefined
        };
        
        console.log(`Created temporary copy "${tempName}" from "${drawingName}"`);
        console.log(`Created preview temporary copy "${previewName}" from "${drawingName}"`);
        
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
function acceptTouchActionInputChanges(req, res, drawings, tempEditDrawings, reorderTouchActionItems) {
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
        
        // Call reorderTouchActionItems to fix any cmd/idx mismatches after main drawing update
        if (reorderTouchActionItems) {
            drawings[originalName].data.items = reorderTouchActionItems(drawings[originalName].data.items, drawings[originalName].data.items, originalName);
            console.log(`[TOUCHACTIONINPUT_ACCEPT] Reordered touch action items for main drawing ${originalName} after accept`);
        }
        
        // Generate new version for original
        drawings[originalName].data.version = `V${Date.now()}`;
        
        // Clean up both main and preview temporary copies
        delete tempEditDrawings[tempName];
        
        // Also clean up the corresponding temp drawing (main or preview)
        const baseName = tempName.replace('_touchActionInput_edit_preview', '')
                                 .replace('_touchActionInput_edit', '');
        const mainTempName = `${baseName}_touchActionInput_edit`;
        const previewTempName = `${baseName}_touchActionInput_edit_preview`;
        
        if (tempEditDrawings[mainTempName] && mainTempName !== tempName) {
            delete tempEditDrawings[mainTempName];
            console.log(`Cleaned up associated temp drawing: ${mainTempName}`);
        }
        if (tempEditDrawings[previewTempName] && previewTempName !== tempName) {
            delete tempEditDrawings[previewTempName];
            console.log(`Cleaned up associated temp drawing: ${previewTempName}`);
        }
        
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

// Sync touchActionInput temp changes to preview drawing (for preview only)
function syncTouchActionInputToPreview(tempName, tempEditDrawings, drawings) {
    const previewName = `${tempName}_preview`;
    
    if (!tempEditDrawings[tempName] || !tempEditDrawings[previewName]) {
        console.error(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Missing drawings: edit=${!!tempEditDrawings[tempName]}, preview=${!!tempEditDrawings[previewName]}`);
        return false;
    }
    
    try {
        const editData = tempEditDrawings[tempName].data;
        const previewData = tempEditDrawings[previewName].data;
        
        // Find the touchActionInput in the edit environment
        const touchActionInput = editData.items.find(item => item.type === 'touchActionInput');
        
        if (!touchActionInput) {
            console.log(`[TOUCHACTIONINPUT_PREVIEW_SYNC] No touchActionInput found in edit environment - removing from preview`);
            // Remove any existing touchActionInput from preview
            previewData.items = previewData.items.filter(item => item.type !== 'touchActionInput');
            return true;
        }
        
        const cmdName = touchActionInput.cmdName;
        console.log(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Syncing touchActionInput(cmdName=${cmdName}) to preview: ${previewName}`);
        
        // Remove any existing touchActionInput with the same cmdName from preview
        previewData.items = previewData.items.filter(item => 
            !(item.type === 'touchActionInput' && item.cmdName === cmdName)
        );
        
        // Find the touchZone index in preview to insert touchActionInput after it
        const touchZoneIndex = previewData.items.findIndex(item => 
            item.type === 'touchZone' && item.cmdName === cmdName
        );
        
        if (touchZoneIndex !== -1) {
            // Insert touchActionInput after the touchZone
            previewData.items.splice(touchZoneIndex + 1, 0, { ...touchActionInput });
            console.log(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Added touchActionInput to preview after touchZone at index ${touchZoneIndex + 1}`);
        } else {
            // No matching touchZone found, add at end
            previewData.items.push({ ...touchActionInput });
            console.log(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Added touchActionInput to preview at end (no matching touchZone found)`);
        }
        
        // Return the preview drawing data that needs reorderTouchActionItems
        console.log(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Preview sync completed - returning drawing data for reorderTouchActionItems`);
        
        return tempEditDrawings[previewName].data;
        
    } catch (error) {
        console.error(`[TOUCHACTIONINPUT_PREVIEW_SYNC] Error syncing to preview:`, error);
        return null;
    }
}

// Sync touchActionInput temp changes to main drawing
function syncTouchActionInputToMain(tempName, tempEditDrawings, drawings) {
    console.log(`[TOUCHACTIONINPUT_SYNC] Syncing ${tempName} to main drawing`);
    
    const tempDrawing = tempEditDrawings[tempName];
    if (!tempDrawing) {
        console.error(`[TOUCHACTIONINPUT_SYNC] Temp drawing ${tempName} not found`);
        return null;
    }
    
    const originalName = tempDrawing.originalName;
    const mainDrawing = drawings[originalName];
    if (!mainDrawing) {
        console.error(`[TOUCHACTIONINPUT_SYNC] Main drawing ${originalName} not found`);
        return null;
    }
    
    // Find touchActionInput items in temp drawing
    // Note: Include temporary items since they represent the current editing state
    const tempItems = tempDrawing.data.items || [];
    const touchActionInputItems = tempItems.filter(item => 
        item.type === 'touchActionInput'
    );
    
    if (touchActionInputItems.length === 0) {
        console.log(`[TOUCHACTIONINPUT_SYNC] No touchActionInput items found in ${tempName}`);
        return null;
    }
    
    console.log(`[TOUCHACTIONINPUT_SYNC] Found ${touchActionInputItems.length} touchActionInput items to sync`);
    
    // Ensure main drawing has items array
    if (!mainDrawing.data.items) {
        mainDrawing.data.items = [];
    }
    
    const mainItems = mainDrawing.data.items;
    
    // Sync each touchActionInput item
    touchActionInputItems.forEach(inputItem => {
        console.log(`[TOUCHACTIONINPUT_SYNC] Syncing touchActionInput(cmdName=${inputItem.cmdName})`);
        
        // Remove any existing touchActionInput with same cmdName to avoid duplicates
        const existingIndex = mainItems.findIndex(existingItem => 
            existingItem.type === 'touchActionInput' && existingItem.cmdName === inputItem.cmdName
        );
        if (existingIndex !== -1) {
            mainItems.splice(existingIndex, 1);
            console.log(`[TOUCHACTIONINPUT_SYNC] Removed existing touchActionInput with cmdName ${inputItem.cmdName}`);
        }
        
        // Clean the temporary marker before adding to main drawing
        const { __isTemporary, ...cleanInputItem } = inputItem;
        
        // Insert touchActionInput after the corresponding touchZone
        const touchZoneIndex = mainItems.findIndex(existingItem => 
            existingItem.type === 'touchZone' && existingItem.cmdName === inputItem.cmdName
        );
        
        if (touchZoneIndex !== -1) {
            mainItems.splice(touchZoneIndex + 1, 0, cleanInputItem);
            console.log(`[TOUCHACTIONINPUT_SYNC] Added touchActionInput after touchZone at index ${touchZoneIndex + 1}`);
        } else {
            mainItems.push(cleanInputItem);
            console.log(`[TOUCHACTIONINPUT_SYNC] Added touchActionInput at end of items array`);
        }
    });
    
    // Update main drawing version
    mainDrawing.data.version = `V${Date.now()}`;
    console.log(`[TOUCHACTIONINPUT_SYNC] Updated main drawing version to ${mainDrawing.data.version}`);
    
    // Return the main drawing data for reorderTouchActionItems call
    return mainDrawing.data;
}

module.exports = {
    setupTouchActionInputRoutes,
    createTouchActionInputTempCopy,
    acceptTouchActionInputChanges,
    cleanupTouchActionInputTemp,
    validateTouchActionInputMode,
    insertTouchActionInputByCMD,
    syncTouchActionInputToMain,
    syncTouchActionInputToPreview
};