/*   
   add-item-hide.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Handler for add-item show button functionality (preview hide/restore)

// Function to temporarily hide an item in add-item preview
function hideItemInPreview(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    const { idxName, cmdName, isVisible, drawingName: dwgDrawingName } = req.body;
    
    const actionType = (isVisible !== false) ? 'hide' : 'unhide';
    console.log(`[ADD_ITEM_HIDE] Request to ${actionType} item ${idxName ? `idxName ${idxName}` : `cmdName ${cmdName}`} in drawing: ${drawingName}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({
            success: false,
            error: `Drawing "${drawingName}" not found`
        });
    }
    
    if (!idxName && !cmdName) {
        return res.status(400).json({
            success: false,
            error: 'Item idxName or cmdName is required'
        });
    }
    
    try {
        // Use the edit preview drawing for add-item functionality
        const editPreviewName = `${drawingName}_edit_preview`;
        
        if (!tempEditDrawings[editPreviewName]) {
            return res.status(404).json({
                success: false,
                error: `Edit preview drawing "${editPreviewName}" not found`
            });
        }
        
        // Create backup of current edit preview drawing before modification
        const backupName = `${editPreviewName}_show_backup`;
        tempEditDrawings[backupName] = JSON.parse(JSON.stringify(tempEditDrawings[editPreviewName]));
        console.log(`[ADD_ITEM_HIDE] Created backup: ${backupName}`);
        
        // Get the existing edit preview drawing
        const editDrawing = tempEditDrawings[editPreviewName];
        
        // Remove any existing hide/unhide commands (like touchActionHandler)
  //      editDrawing.data.items = editDrawing.data.items.filter(item => 
  //          item.type !== 'hide' && item.type !== 'unhide'
 //       );
        
        let hideItem;
        
        if (idxName) {
            // Handle indexed items (by idxName)
            // Find the idx by looking up the item with this idxName in the original drawing
            let idx = null;
            if (drawings[drawingName] && drawings[drawingName].data && drawings[drawingName].data.items) {
                const targetItem = drawings[drawingName].data.items.find(item => item.idxName === idxName);
                if (targetItem && targetItem.idx) {
                    idx = targetItem.idx;
                }
            }
            
            if (!idx) {
                return res.status(400).json({
                    success: false,
                    error: `Item with idxName "${idxName}" not found`
                });
            }
            
            // Add hide/unhide item based on current visibility
            hideItem = {
                type: actionType,
                idx: parseInt(idx),
                idxName: idxName,
                indexed: true
            };
        } else {
            // Handle command items (by cmdName)
            // Find the item with this cmdName to get both cmd and cmdName
            let targetItem = null;
            if (drawings[drawingName] && drawings[drawingName].data && drawings[drawingName].data.items) {
                targetItem = drawings[drawingName].data.items.find(item => item.cmdName === cmdName);
            }
            
            if (!targetItem) {
                return res.status(400).json({
                    success: false,
                    error: `Item with cmdName "${cmdName}" not found`
                });
            }
            
            // Add hide/unhide item based on current visibility
            hideItem = {
                type: actionType,
                cmd: targetItem.cmd,
                cmdName: cmdName,
                indexed: false
            };
            
            // Include drawingName for dwg items
            if (dwgDrawingName) {
                hideItem.drawingName = dwgDrawingName;
            }
        }
        
        editDrawing.data.items.push(hideItem);
        
        // Update version to trigger update mechanism (essential for preventing iframe reinitialization)
        editDrawing.data.version = `V${Date.now()}`;
        
        // Mark for update-only responses
        editDrawing.isUpdateOnly = true;
        
        const logMessage = idxName 
            ? `[ADD_ITEM_HIDE] Added ${actionType} item for idxName ${idxName} to edit preview: ${editPreviewName}`
            : `[ADD_ITEM_HIDE] Added ${actionType} item for cmdName ${cmdName} to edit preview: ${editPreviewName}`;
        console.log(logMessage);
        
        const responseMessage = idxName 
            ? `Temporarily ${actionType === 'hide' ? 'hiding' : 'unhiding'} item idxName ${idxName}`
            : `Temporarily ${actionType === 'hide' ? 'hiding' : 'unhiding'} item cmdName ${cmdName}`;
        
        return res.json({
            success: true,
            previewDrawingName: editPreviewName,
            message: responseMessage
        });
        
    } catch (error) {
        console.error(`[ADD_ITEM_HIDE] Error hiding item in preview:`, error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while hiding item'
        });
    }
}

// Function to restore original add-item preview from backup
function restorePreview(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    
    console.log(`[ADD_ITEM_RESTORE] Request to restore preview for drawing: ${drawingName}`);
    
    try {
        // Get the edit preview drawing and its backup
        const editPreviewName = `${drawingName}_edit_preview`;
        const backupName = `${editPreviewName}_show_backup`;
        
        if (!tempEditDrawings[editPreviewName]) {
            return res.status(404).json({
                success: false,
                error: `Edit preview drawing "${editPreviewName}" not found`
            });
        }
        
        if (!tempEditDrawings[backupName]) {
            return res.status(404).json({
                success: false,
                error: `Backup drawing "${backupName}" not found`
            });
        }
        
        // Restore from backup
        tempEditDrawings[editPreviewName] = JSON.parse(JSON.stringify(tempEditDrawings[backupName]));
        console.log(`[ADD_ITEM_RESTORE] Restored ${editPreviewName} from backup`);
        
        // Clean up backup
        delete tempEditDrawings[backupName];
        console.log(`[ADD_ITEM_RESTORE] Cleaned up backup: ${backupName}`);
        
        return res.json({
            success: true,
            message: 'Preview restored successfully'
        });
        
    } catch (error) {
        console.error(`[ADD_ITEM_RESTORE] Error restoring preview:`, error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error while restoring preview'
        });
    }
}

module.exports = {
    hideItemInPreview,
    restorePreview
};