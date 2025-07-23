/*   
   touchActionHandler.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// TouchAction Handler Module
// Handles all touchAction-related operations for the drawing server

const path = require('path');

// Create temporary copy for touchAction editing
function createTouchActionTempCopy(req, res, drawings, tempEditDrawings) {
    // Handle GET request - parameters from query and referer header parsing
    let drawingName = req.query.tempDrawing && req.query.tempDrawing.replace('_touchAction_edit', '');
    
    // If no drawing name from query, try to extract from referer header (same pattern as server.js)
    if (!drawingName && req.headers.referer) {
        const refererUrl = new URL(req.headers.referer);
        if (req.headers.referer.includes('preview=')) {
            // Preview parameter takes precedence - extract base drawing name
            const previewName = refererUrl.searchParams.get('preview');
            if (previewName) {
                drawingName = previewName.replace(/_(edit_preview|touchAction_edit.*|preview)$/, '');
            }
        } else if (req.headers.referer.includes('drawing=')) {
            drawingName = refererUrl.searchParams.get('drawing');
        }
    }
    
    const mode = 'touchAction';
    const editIndex = undefined;
    const cmdName = req.query.cmdName;
    const cmd = req.query.cmd;
    
    console.log(`[TEMP_COPY_DEBUG] Creating temp copy for drawing: ${drawingName}`);
    console.log(`[TEMP_COPY_DEBUG] Received params: mode=${mode}, editIndex=${editIndex}, cmdName=${cmdName}, cmd=${cmd}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Drawing "${drawingName}" not found` 
        });
    }
    
    const originalDrawing = `${drawingName}`;
    const tempDrawingName = `${originalDrawing}_touchAction_edit`;
    const previewDrawingName = `${originalDrawing}_touchAction_edit_preview`;
    
    try {
        // Create isolated temp drawing for item management
        const isolatedData = JSON.parse(JSON.stringify(drawings[originalDrawing].data));
        
        if (cmdName) {
            console.log(`[TOUCHACTION_ISOLATE] Creating isolated touchAction environment for cmdName "${cmdName}"`);
            
            // Find touchAction with matching cmdName
            const touchActionItem = isolatedData.items.find(item => 
                item.type === 'touchAction' && item.cmdName === cmdName
            );
            
            if (touchActionItem) {
                console.log(`[TOUCHACTION_ISOLATE] Found existing touchAction with cmdName "${touchActionItem.cmdName}" to isolate`);
                
                // Create isolated environment with the touchAction containing its action items
                isolatedData.items = [JSON.parse(JSON.stringify(touchActionItem))];
                console.log(`[TOUCHACTION_ISOLATE] Added existing touchAction with ${touchActionItem.action ? touchActionItem.action.length : 0} action items to isolated environment`);
                
                // Store the original touchAction info for later
                isolatedData.originalTouchAction = JSON.parse(JSON.stringify(touchActionItem));
                
                // Store the original index for updating
                const originalIndex = drawings[originalDrawing].data.items.findIndex(item => 
                    item.type === 'touchAction' && item.cmdName === cmdName
                );
                isolatedData.originalTouchActionIndex = originalIndex;
            } else {
                console.log(`[TOUCHACTION_ISOLATE] No existing touchAction found with cmdName "${cmdName}", creating new one`);
                
                // Create new touchAction for this cmdName with empty action array
                const newTouchAction = {
                    type: 'touchAction',
                    cmdName: cmdName,
                    cmd: cmd,
                    action: []
                };
                
                // Add the new touchAction to the isolated environment
                isolatedData.items = [newTouchAction];
                console.log(`[TOUCHACTION_ISOLATE] Added new empty touchAction to isolated environment`);
                
                // Store the new touchAction structure for later
                isolatedData.originalTouchAction = JSON.parse(JSON.stringify(newTouchAction));
                
                // Mark as new touchAction (no original index)
                isolatedData.originalTouchActionIndex = -1;
            }
        }
        
        // Create full temp drawing for preview
        const fullData = JSON.parse(JSON.stringify(drawings[originalDrawing].data));
        
        tempEditDrawings[tempDrawingName] = {
            originalName: originalDrawing,
            data: isolatedData,
            updates: [],
            tempPreviewItem: null,
            mode: 'touchAction',
            editIndex: undefined
        };
        
        tempEditDrawings[previewDrawingName] = {
            originalName: originalDrawing,
            data: fullData,
            updates: [],
            mode: 'touchAction'
        };
        
        console.log(`[TOUCHACTION_TEMP_DRAWINGS] Created touchAction temp drawings: ${tempDrawingName} and ${previewDrawingName}`);
        
        // Sync the touchAction to preview
        syncTouchActionToPreview(tempDrawingName, tempEditDrawings);
        
        console.log(`[TOUCHACTION_TEMP_COPY] Successfully created temp drawings: ${tempDrawingName} and ${previewDrawingName}`);
        
        // Don't send response - let the calling GET handler continue to serve HTML
        return { success: true, tempName: tempDrawingName };
        
    } catch (error) {
        console.error(`Error creating temporary copy of "${drawingName}":`, error);
        
        // Don't send response - let the calling GET handler handle the error
        return { success: false, error: error.message };
    }
}

function cleanupEmptyTouchActions(data) {
  let items = data.items;
  let newItems = [];
  items.forEach((item) => {
      console.log(JSON.stringify(item));
      if (item && (item.type === 'touchAction')) {
        const size = item.action?.length || 0;
        if (size == 0) {
          // skip
        } else {
          newItems.push(item);
        }          
      } else {
        newItems.push(item);
      }
  });
  return data.items = newItems;
}

// Accept touchAction edit changes - copy from temporary to original
// remove touchAction if have empty array
function acceptTouchActionChanges(req, res, drawings, tempEditDrawings) {
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
        
        // Handle touchAction editing specially - only update the specific touchAction item
        if (tempName.includes('_touchAction_edit')) {
      //      console.log(`[TOUCHACTION_ACCEPT] Selective update for touchAction editing: ${tempName}`);
            
            const tempData = tempEditDrawings[tempName].data;
            const tempEditData = tempEditDrawings[tempName];
            console.log(`[TOUCHACTION_ACCEPT] tempData.originalTouchAction `, JSON.stringify(tempData.originalTouchAction,null,2));
            // Check if we have the original touchAction info stored (new cmd-based isolation approach)
            if (tempData.originalTouchAction) {
         //       console.log(`[TOUCHACTION_ACCEPT] Using cmd-based isolated touchAction approach`);
                
                // Get the edited touchAction from the isolated environment
                const editedTouchAction = tempData.items.find(item => item.type === 'touchAction' && item.cmdName === tempData.originalTouchAction.cmdName);
                
                if (!editedTouchAction) {
                    console.error(`[TOUCHACTION_ACCEPT] No touchAction found in isolated environment`);
                    return res.status(500).json({ 
                        success: false, 
                        error: 'No touchAction found in isolated environment' 
                    });
                }
                
                const updatedTouchAction = editedTouchAction;
        //        console.log(`[TOUCHACTION_ACCEPT] updatedTouchAction `, JSON.stringify(updatedTouchAction,null,2));

                // Check if touchAction is empty (no action items) and should be removed
                const hasActionItems = updatedTouchAction.action && updatedTouchAction.action.length > 0;
                const shouldRemoveEmptyTouchAction = !hasActionItems && tempData.originalTouchActionIndex === -1;
                
                if (shouldRemoveEmptyTouchAction) {
                    console.log(`[TOUCHACTION_ACCEPT] Empty new touchAction with cmdName "${updatedTouchAction.cmdName}" - not adding to original drawing`);
                    // Clean up temporary copy and return without adding empty touchAction
                    delete tempEditDrawings[tempName];
                    return res.json({ 
                        success: true, 
                        message: `Empty touchAction with cmdName "${updatedTouchAction.cmdName}" was not added`,
                        newVersion: drawings[originalName].data.version
                    });
                }
                
                const originalItems = drawings[originalName].data.items;
        //        console.log(`[TOUCHACTION_ACCEPT] originalItems `, JSON.stringify(originalItems,null,2));
                
                // Check if this is updating an existing touchAction or adding a new one
                if (tempData.originalTouchActionIndex !== undefined && tempData.originalTouchActionIndex >= 0) {
                    // Update existing touchAction
                    const originalIndex = tempData.originalTouchActionIndex;
                    if (!hasActionItems) {
                        console.log(`[TOUCHACTION_ACCEPT] Removing Updated touchAction with cmdName "${updatedTouchAction.cmdName}" at index ${originalIndex} that has no action items`);
                        originalItems.splice(tempData.originalTouchActionIndex,1); // remove it
                    } else {
                    if (originalIndex < originalItems.length && originalItems[originalIndex].type === 'touchAction') {
                        const { __isTemporary, ...cleanTouchAction } = updatedTouchAction;
                        originalItems[originalIndex] = cleanTouchAction;
                        console.log(`[TOUCHACTION_ACCEPT] Updated existing touchAction with cmdName "${updatedTouchAction.cmdName}" at index ${originalIndex} with ${updatedTouchAction.action ? updatedTouchAction.action.length : 0} action items`);
                    } else {
                         console.error(`[TOUCHACTION_ACCEPT] Original index ${originalIndex} no longer valid`);
                        return res.status(500).json({ 
                           success: false, 
                           error: 'Original index ${originalIndex} no longer valid' 
                        });
                    }
                    }
                } else {
                    // Add new touchAction - insert it after the touchZone with matching cmdName
                    const cmdName = updatedTouchAction.cmdName;
                    let insertIndex = originalItems.length; // Default to end
                    
                    // Find touchZone with matching cmdName
                    for (let i = 0; i < originalItems.length; i++) {
                        if (originalItems[i].type === 'touchZone' && originalItems[i].cmdName === cmdName) {
                            // Find the last item with this cmdName to insert after
                            let lastCmdIndex = i;
                            for (let j = i + 1; j < originalItems.length; j++) {
                                if (originalItems[j].cmdName === cmdName) {
                                    lastCmdIndex = j;
                                } else {
                                    break; // Stop when we find an item with different cmdName
                                }
                            }
                            insertIndex = lastCmdIndex + 1;
                            break;
                        }
                    }
                    
                    const { __isTemporary, ...newTouchAction } = updatedTouchAction;
                    originalItems.splice(insertIndex, 0, newTouchAction);
                    console.log(`[TOUCHACTION_ACCEPT] Added new touchAction with cmdName "${cmdName}" at index ${insertIndex} with ${newTouchAction.action ? newTouchAction.action.length : 0} action items`);
                }
                
                // Generate new version for original
                drawings[originalName].data.version = `V${Date.now()}`;
                
                // Clean up temporary copy
                delete tempEditDrawings[tempName];
                // clean up empty touchActions
        //        drawings[originalName].data = cleanupEmptyTouchActions(drawings[originalName].data);
                
                console.log(`Accepted touchAction edit changes from "${tempName}" to "${originalName}"`);
                
                return res.json({ 
                    success: true, 
                    message: `TouchAction changes accepted and applied to ${originalName}`,
                    newVersion: drawings[originalName].data.version
                });
            }
            /**
            else {
                // Fallback to old approach - look for touchAction item in temp drawing
                console.log(`[TOUCHACTION_ACCEPT] Using fallback touchAction approach`);
                const editedTouchAction = tempData.items.find(item => item.type === 'touchAction');
                
                if (editedTouchAction) {
                    // Find and update the corresponding touchAction in the original drawing by edit index
                    const originalItems = drawings[originalName].data.items;
                    
                    // Check if we have the original edit index stored
                    if (tempEditData.editIndex !== undefined) {
                        // Update the item at the specific edit index
                        const editIndex = tempEditData.editIndex;
                        if (editIndex >= 0 && editIndex < originalItems.length && originalItems[editIndex].type === 'touchAction') {
                            const { __isTemporary, ...cleanTouchAction } = editedTouchAction;
                            originalItems[editIndex] = cleanTouchAction;
                            console.log(`[TOUCHACTION_ACCEPT] Updated touchAction at edit index ${editIndex} with cmdName="${editedTouchAction.cmdName}"`);
                        } else {
                            console.log(`[TOUCHACTION_ACCEPT] Invalid edit index ${editIndex}, adding as new item`);
                            const { __isTemporary, ...cleanTouchAction } = editedTouchAction;
                            originalItems.push(cleanTouchAction);
                        }
                    } else {
                        // Fallback to searching by cmdName (for backwards compatibility)
                        const originalIndex = originalItems.findIndex(item => 
                            item.type === 'touchAction' && item.cmdName === editedTouchAction.cmdName
                        );
                        
                        if (originalIndex !== -1) {
                            const { __isTemporary, ...cleanTouchAction } = editedTouchAction;
                            originalItems[originalIndex] = cleanTouchAction;
                            console.log(`[TOUCHACTION_ACCEPT] Updated touchAction cmdName="${editedTouchAction.cmdName}" at index ${originalIndex}`);
                        } else {
                            console.log(`[TOUCHACTION_ACCEPT] TouchAction cmdName="${editedTouchAction.cmdName}" not found in original, adding as new item`);
                            
                            // Use CMD_INSERT logic to position after touchZone
                            const { __isTemporary, ...newTouchAction } = editedTouchAction;
                            
                            // Find all items with matching cmdName to understand the group structure
                            let touchZoneIndex = -1;
                            let lastRelatedIndex = -1;
                            
                            for (let i = 0; i < originalItems.length; i++) {
                                if (originalItems[i].cmdName === newTouchAction.cmdName) {
                                    if (originalItems[i].type === 'touchZone') {
                                        touchZoneIndex = i;
                                        console.log(`[TOUCHACTION_ACCEPT] Found touchZone with cmdName "${newTouchAction.cmdName}" at index ${i}`);
                                    }
                                    lastRelatedIndex = i;
                                    console.log(`[TOUCHACTION_ACCEPT] Found related item "${originalItems[i].type}" with cmdName "${newTouchAction.cmdName}" at index ${i}`);
                                }
                            }
                            
                            // Determine insertion position
                            let insertPosition;
                            if (lastRelatedIndex !== -1) {
                                // Insert after the last item with matching cmdName
                                insertPosition = lastRelatedIndex + 1;
                                console.log(`[TOUCHACTION_ACCEPT] Inserting after last related item at index ${insertPosition}`);
                            } else {
                                // No related items found, add at end
                                insertPosition = originalItems.length;
                                console.log(`[TOUCHACTION_ACCEPT] No related items found, inserting at end (index ${insertPosition})`);
                            }
                            
                            originalItems.splice(insertPosition, 0, newTouchAction);
                            console.log(`[TOUCHACTION_ACCEPT] Inserted new touchAction with cmdName "${newTouchAction.cmdName}" at index ${insertPosition}`);
                        }
                    }
                    
                    // Generate new version for original
                    drawings[originalName].data.version = `V${Date.now()}`;
                    
                    // Clean up temporary copy
                    delete tempEditDrawings[tempName];
                    
                    console.log(`Accepted touchAction edit changes from "${tempName}" to "${originalName}"`);
                    
                    return res.json({ 
                        success: true, 
                        message: `TouchAction changes accepted and applied to ${originalName}`,
                        newVersion: drawings[originalName].data.version
                    });
                }
            }
            **/
        }
        
        // If we reach here, this wasn't a touchAction edit or no touchAction found
        return res.status(400).json({ 
            success: false, 
            error: `Not a touchAction edit or no touchAction changes found` 
        });
        
    } catch (error) {
        console.error(`Error accepting touchAction changes for "${tempName}":`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to accept touchAction changes: ${error.message}` 
        });
    }
}

// Clean up temporary touchAction drawings
function cleanupTouchActionTemp(req, res, tempEditDrawings) {
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
        
        console.log(`Cleaned up temporary touchAction drawing: ${tempName}`);
        
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


// Setup touchAction routes (only for routes that don't conflict with main server)
function setupTouchActionRoutes(app, drawings, tempEditDrawings) {
    // Route for touch-actions.html page
    app.get('/touch-actions.html', (req, res) => {
        res.sendFile(path.join(__dirname, 'touch-actions.html'));
    });
    
    // Note: temp-copy and accept routes are handled by delegation in main server.js
    // Note: temp-cleanup is handled by the main server as well
}

// Utility function to insert touchAction items after their touchZone by cmdName (touchActionInput now handled separately)
function insertTouchActionItemByCMD(items, item) {
    if (item.type === 'touchAction' && item.cmdName) {
        console.log(`[CMD_INSERT] Processing touchAction with cmdName "${item.cmdName}"`);
        
        // Find all items with matching cmdName to understand the group structure
        let touchZoneIndex = -1;
        let lastRelatedIndex = -1;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].cmdName === item.cmdName) {
                if (items[i].type === 'touchZone') {
                    touchZoneIndex = i;
                    console.log(`[CMD_INSERT] Found touchZone with cmdName "${item.cmdName}" at index ${i}`);
                } else if (items[i].type === 'touchActionInput' || items[i].type === 'touchAction') {
                    lastRelatedIndex = i;
                    console.log(`[CMD_INSERT] Found related item ${items[i].type} at index ${i}`);
                }
            }
        }
        
        let insertIndex;
        if (touchZoneIndex >= 0) {
            // Insert after the touchZone or after the last related item
            insertIndex = lastRelatedIndex > touchZoneIndex ? lastRelatedIndex + 1 : touchZoneIndex + 1;
            console.log(`[CMD_INSERT] Inserting touchAction at index ${insertIndex} (after touchZone at ${touchZoneIndex})`);
        } else {
            // No touchZone found with this cmdName, add to end
            insertIndex = items.length;
            console.log(`[CMD_INSERT] No touchZone found with cmdName "${item.cmdName}", adding to end at index ${insertIndex}`);
        }
        
        items.splice(insertIndex, 0, item);
        console.log(`[CMD_INSERT] Inserted touchAction with cmdName "${item.cmdName}" at index ${insertIndex}`);
        return true; // Indicates item was inserted by CMD logic
    }
    return false; // Not a touchAction item
}

// Create temporary drawings for touchAction item editing
function createTouchActionItemTempDrawings(req, res, drawings, tempEditDrawings) {
    const { tempDrawing } = req.params; // e.g., "t_touchAction_edit"
    const { editIndex } = req.body;
    
    console.log(`[TOUCHACTION_ITEM] Creating item temp drawings from: ${tempDrawing}`);
    console.log(`[TOUCHACTION_ITEM] Edit index: ${editIndex}`);
    
    if (!tempEditDrawings[tempDrawing]) {
        return res.status(404).json({ 
            success: false, 
            error: `Temp drawing "${tempDrawing}" not found` 
        });
    }
    
    try {
        // Create item edit temp drawing name (e.g., "t_touchAction_item_edit")
        const itemEditDrawingName = tempDrawing.replace('_touchAction_edit', '_touchAction_item_edit');
        
        // Create preview drawing name (e.g., "t_touchAction_item_edit_preview")
        const itemEditPreviewDrawingName = itemEditDrawingName + '_preview';
        
        // Create the item edit temp drawing (copy of touchAction edit drawing)
        const itemEditData = JSON.parse(JSON.stringify(tempEditDrawings[tempDrawing].data));
        tempEditDrawings[itemEditDrawingName] = {
            data: itemEditData,
            updates: [],
            mode: 'touchActionItem',
            parentDrawing: tempDrawing,
            editIndex: editIndex
        };
        
        // Create the preview drawing from the touchAction preview (full context)
        // Use t_touchAction_edit_preview which contains the full drawing with touchAction updates
        const touchActionPreviewName = tempDrawing.replace('_touchAction_edit', '_touchAction_edit_preview');
        
        if (!tempEditDrawings[touchActionPreviewName]) {
            return res.status(404).json({ 
                success: false, 
                error: `TouchAction preview drawing "${touchActionPreviewName}" not found for item preview creation` 
            });
        }
        
        // Create preview from the touchAction preview data for full context
        const previewData = JSON.parse(JSON.stringify(tempEditDrawings[touchActionPreviewName].data));
        
        tempEditDrawings[itemEditPreviewDrawingName] = {
            data: previewData,
            updates: [],
            mode: 'touchActionItemPreview',
            parentDrawing: tempDrawing,
            touchActionPreview: touchActionPreviewName,
            editIndex: editIndex
        };
        
        console.log(`[TOUCHACTION_ITEM] Created item edit temp drawing: ${itemEditDrawingName}`);
        console.log(`[TOUCHACTION_ITEM] Created item edit preview drawing: ${itemEditPreviewDrawingName}`);
        
        return res.json({ 
            success: true, 
            itemEditDrawing: itemEditDrawingName,
            previewDrawing: itemEditPreviewDrawingName
        });
        
    } catch (error) {
        console.error(`Error creating touchAction item temp drawings:`, error);
        return res.status(500).json({ 
            success: false, 
            error: `Failed to create touchAction item temp drawings: ${error.message}` 
        });
    }
}

// Accept touchAction item changes and update parent drawing
// if touchAction has empty array just remove it
function acceptTouchActionItemChanges(req, res, drawings, tempEditDrawings) {
    const { itemEditDrawing } = req.params; // e.g., "t_touchAction_item_edit"
    
    console.log(`[TOUCHACTION_ITEM_ACCEPT] Accepting changes from: ${itemEditDrawing}`);
    
    if (!tempEditDrawings[itemEditDrawing]) {
        return res.status(404).json({ 
            success: false, 
            error: `Item edit drawing "${itemEditDrawing}" not found` 
        });
    }
    
    try {
        const itemEditData = tempEditDrawings[itemEditDrawing];
        const parentDrawing = itemEditData.parentDrawing;
        
        if (!tempEditDrawings[parentDrawing]) {
            return res.status(404).json({ 
                success: false, 
                error: `Parent drawing "${parentDrawing}" not found` 
            });
        }
        
        // Update the parent touchAction edit drawing with the item changes
        // Don't replace entire data - merge the edited item back into the touchAction structure
        const parentData = tempEditDrawings[parentDrawing].data;
        const itemEditDataCopy = itemEditData.data;
        
        console.log(`[TOUCHACTION_ITEM_ACCEPT] Merging item changes back to touchAction structure`);
        console.log(`[TOUCHACTION_ITEM_ACCEPT] Parent has ${parentData.items.length} items`);
        console.log(`[TOUCHACTION_ITEM_ACCEPT] Item edit has ${itemEditDataCopy.items.length} items`);
        
        // Find the touchAction in the parent data
        const touchActionItem = parentData.items.find(item => item.type === 'touchAction');
        if (!touchActionItem) {
            console.error(`[TOUCHACTION_ITEM_ACCEPT] No touchAction found in parent drawing`);
            return res.status(500).json({ 
                success: false, 
                error: 'No touchAction found in parent drawing' 
            });
        }
        
        // Update the specific item at editIndex in the touchAction's action array
        const editIndex = itemEditData.editIndex;
        
        if (itemEditDataCopy.items && itemEditDataCopy.items.length > 0) {
            // Find the touchAction in the item edit data
            const editedTouchAction = itemEditDataCopy.items.find(item => item.type === 'touchAction');
            if (editedTouchAction && editedTouchAction.action && editedTouchAction.action.length > 0) {
                // Get the edited item at the specific editIndex (editIndex should always be valid since default item is pre-added)
                const numericEditIndex = parseInt(editIndex, 10);
                const editedItem = editedTouchAction.action[numericEditIndex];
                
                if (editedItem && editIndex !== undefined && editIndex !== null) {
                    // editIndex should always be valid, use the already parsed numericEditIndex
                    
                    if (!isNaN(numericEditIndex) && numericEditIndex >= 0) {
                        if (numericEditIndex < touchActionItem.action.length) {
                            // For touchAction editing, no temporary flag to remove - just save the item
                            const cleanedItem = JSON.parse(JSON.stringify(editedItem));
                            
                            // Replace the specific item at editIndex
                            touchActionItem.action[numericEditIndex] = cleanedItem;
                            console.log(`[TOUCHACTION_ITEM_ACCEPT] Updated action item at index ${numericEditIndex}, type: ${editedItem.type}`);
                        } else {
                            console.error(`[TOUCHACTION_ITEM_ACCEPT] Edit index ${numericEditIndex} out of range (action length: ${touchActionItem.action.length})`);
                        }
                    } else {
                        console.error(`[TOUCHACTION_ITEM_ACCEPT] Invalid editIndex: ${editIndex}`);
                    }
                } else if (!editedItem) {
                    console.error(`[TOUCHACTION_ITEM_ACCEPT] No edited item found in item edit data`);
                } else {
                    // No editIndex - this is adding a new item
                    const newItem = editedTouchAction.action[0]; // First item in isolated environment
                    if (newItem) {
                        // For touchAction editing, no temporary flag to remove - just save the item
                        const cleanedNewItem = JSON.parse(JSON.stringify(newItem));
                        
                        touchActionItem.action.push(cleanedNewItem);
                        console.log(`[TOUCHACTION_ITEM_ACCEPT] Added new action item, type: ${newItem.type}, total actions: ${touchActionItem.action.length}`);
                    }
                }
            } else {
                console.error(`[TOUCHACTION_ITEM_ACCEPT] No touchAction or action array found in item edit data`);
            }
        }
        
        parentData.version = `V${Date.now()}`;
        console.log(`[TOUCHACTION_ITEM_ACCEPT] Updated parent drawing: ${parentDrawing}`);
        
        // Sync the updated touchAction to preview
        syncTouchActionToPreview(parentDrawing, tempEditDrawings);
        
        // Clean up temp drawings
        cleanupTouchActionItemTempDrawings(itemEditDrawing, drawings, tempEditDrawings);
        
        return res.json({ 
            success: true, 
            message: `TouchAction item changes accepted and applied to ${parentDrawing}`
        });
        
    } catch (error) {
        console.error(`Error accepting touchAction item changes:`, error);
        return res.status(500).json({ 
            success: false, 
            error: `Failed to accept touchAction item changes: ${error.message}` 
        });
    }
}

// Cancel touchAction item changes and cleanup
function cancelTouchActionItemChanges(req, res, drawings, tempEditDrawings) {
    const { itemEditDrawing } = req.params; // e.g., "t_touchAction_item_edit"
    
    console.log(`[TOUCHACTION_ITEM_CANCEL] Canceling changes from: ${itemEditDrawing}`);
    
    // Get parent drawing for sync (if it exists)
    const parentDrawing = itemEditDrawing.replace('_touchAction_item_edit', '_touchAction_edit');
    
    // Clean up temp drawings
    cleanupTouchActionItemTempDrawings(itemEditDrawing, drawings, tempEditDrawings);
    
    // Sync preview (in case there were changes that need to be reverted)
    if (tempEditDrawings[parentDrawing]) {
        syncTouchActionToPreview(parentDrawing, tempEditDrawings);
    }
    
    return res.json({ 
        success: true, 
        message: `TouchAction item changes canceled and temp drawings cleaned up`
    });
}

// Cleanup touchAction item temp drawings
function cleanupTouchActionItemTempDrawings(itemEditDrawing, drawings, tempEditDrawings) {
    const previewDrawing = itemEditDrawing + '_preview';
    
    // Remove item edit temp drawing
    if (tempEditDrawings[itemEditDrawing]) {
        delete tempEditDrawings[itemEditDrawing];
        console.log(`[TOUCHACTION_ITEM_CLEANUP] Removed item edit drawing: ${itemEditDrawing}`);
    }
    
    // Remove preview drawing from tempEditDrawings
    if (tempEditDrawings[previewDrawing]) {
        delete tempEditDrawings[previewDrawing];
        console.log(`[TOUCHACTION_ITEM_CLEANUP] Removed preview drawing: ${previewDrawing}`);
    }
}

// Utility function to check if touchActionInput items should be rejected in touchAction mode
function validateTouchActionMode(mode, item) {
    if (mode === 'touchAction' && item.type === 'touchActionInput') {
        return {
            valid: false,
            error: "touchActionInput items not allowed in touchAction mode"
        };
    }
    return { valid: true };
}


// Sync touchAction from isolated environment to preview
function syncTouchActionToPreview(tempDrawingName, tempEditDrawings) {
    const previewDrawingName = `${tempDrawingName}_preview`;
    
    if (!tempEditDrawings[tempDrawingName] || !tempEditDrawings[previewDrawingName]) {
        console.error(`[TOUCHACTION_SYNC] Missing drawings: edit=${!!tempEditDrawings[tempDrawingName]}, preview=${!!tempEditDrawings[previewDrawingName]}`);
        return false;
    }
    
    try {
        const editData = tempEditDrawings[tempDrawingName].data;
        const previewData = tempEditDrawings[previewDrawingName].data;
        
        // Find the touchAction in the isolated environment
        const isolatedTouchAction = editData.items.find(item => item.type === 'touchAction');
        
        if (!isolatedTouchAction) {
            console.error(`[TOUCHACTION_SYNC] No touchAction found in isolated environment`);
            return false;
        }
        
        const cmdName = isolatedTouchAction.cmdName;
        
        // Find and replace the touchAction in the preview
        const previewTouchActionIndex = previewData.items.findIndex(item => 
            item.type === 'touchAction' && item.cmdName === cmdName
        );
        
        if (previewTouchActionIndex >= 0) {
            // Replace existing touchAction in preview
            previewData.items[previewTouchActionIndex] = JSON.parse(JSON.stringify(isolatedTouchAction));
            console.log(`[TOUCHACTION_SYNC] Updated existing touchAction with cmdName "${cmdName}" in preview`);
        } else {
            // Add new touchAction to preview (insert after touchZone with matching cmdName)
            let insertIndex = previewData.items.length; // Default to end
            
            // Find touchZone with matching cmdName to insert after
            for (let i = 0; i < previewData.items.length; i++) {
                if (previewData.items[i].type === 'touchZone' && previewData.items[i].cmdName === cmdName) {
                    // Find the last item with this cmdName to insert after
                    let lastCmdIndex = i;
                    for (let j = i + 1; j < previewData.items.length; j++) {
                        if (previewData.items[j].cmdName === cmdName) {
                            lastCmdIndex = j;
                        } else {
                            break; // Stop when we find an item with different cmdName
                        }
                    }
                    insertIndex = lastCmdIndex + 1;
                    break;
                }
            }
            
            previewData.items.splice(insertIndex, 0, JSON.parse(JSON.stringify(isolatedTouchAction)));
            console.log(`[TOUCHACTION_SYNC] Added new touchAction with cmdName "${cmdName}" to preview at index ${insertIndex}`);
        }
        
        // Update preview version
        previewData.version = `V${Date.now()}`;
        
        return true;
        
    } catch (error) {
        console.error(`[TOUCHACTION_SYNC] Error syncing touchAction to preview:`, error);
        return false;
    }
}

// General sync function for all temp edit to preview operations
function syncTempEditToPreview(tempName, tempEditDrawings, drawings) {
    // Handle touchAction item temp drawings
    if (tempName.endsWith('_touchAction_item_edit')) {
        return syncTouchActionItemToPreview(tempName, tempEditDrawings);
    }
    
    // Handle touchAction temp drawings
    if (tempName.endsWith('_touchAction_edit')) {
        return syncTouchActionToPreview(tempName, tempEditDrawings);
    }
    
    // Original logic for regular temp drawings
    let editPreviewName, originalName;
    
    if (tempName.endsWith('_edit_preview')) {
        // The tempName is already the edit preview name
        editPreviewName = tempName;
        originalName = tempName.replace('_edit_preview', '');
    } else {
        // The tempName is the original name, look for edit preview
        editPreviewName = `${tempName}_edit_preview`;
        originalName = tempName;
    }
    
    if (tempEditDrawings[tempName] && drawings[editPreviewName]) {
        // Deep copy the tempEditDrawings data to the edit preview drawing
        drawings[editPreviewName].data = JSON.parse(JSON.stringify(tempEditDrawings[tempName].data));
        console.log(`[SYNC] Synced changes from tempEditDrawings[${tempName}] to ${editPreviewName}`);
        
        // Also sync to the original drawing
        if (drawings[originalName]) {
            drawings[originalName].data = JSON.parse(JSON.stringify(drawings[editPreviewName].data));
            console.log(`[SYNC] Synced changes from ${editPreviewName} to ${originalName}`);
            // Note: Don't delete edit_preview here - it should persist until user returns to control panel
        }
        return true;
    } else {
        console.log(`[SYNC] No sync needed: tempEdit=${!!tempEditDrawings[tempName]}, preview=${!!drawings[editPreviewName]}`);
        return false;
    }
}

// Sync touchAction item from item edit to item edit preview
function syncTouchActionItemToPreview(itemEditDrawingName, tempEditDrawings) {
    const itemEditPreviewDrawingName = `${itemEditDrawingName}_preview`;
    
    if (!tempEditDrawings[itemEditDrawingName] || !tempEditDrawings[itemEditPreviewDrawingName]) {
        console.error(`[TOUCHACTION_ITEM_SYNC] Missing drawings: edit=${!!tempEditDrawings[itemEditDrawingName]}, preview=${!!tempEditDrawings[itemEditPreviewDrawingName]}`);
        return false;
    }
    
    try {
        const itemEditData = tempEditDrawings[itemEditDrawingName].data;
        const itemEditPreviewData = tempEditDrawings[itemEditPreviewDrawingName].data;
        
        // Find the touchAction in the item edit environment
        const itemEditTouchAction = itemEditData.items.find(item => item.type === 'touchAction');
        
        if (!itemEditTouchAction) {
            console.error(`[TOUCHACTION_ITEM_SYNC] No touchAction found in item edit environment`);
            return false;
        }
        
        const cmdName = itemEditTouchAction.cmdName;
        
        // Find and replace the touchAction in the item edit preview
        const previewTouchActionIndex = itemEditPreviewData.items.findIndex(item => 
            item.type === 'touchAction' && item.cmdName === cmdName
        );
        
        if (previewTouchActionIndex >= 0) {
            // Replace existing touchAction in preview with updated version from item edit
            itemEditPreviewData.items[previewTouchActionIndex] = JSON.parse(JSON.stringify(itemEditTouchAction));
            console.log(`[TOUCHACTION_ITEM_SYNC] Updated existing touchAction with cmdName "${cmdName}" in item edit preview`);
        } else {
            // Add new touchAction to preview if not found
            itemEditPreviewData.items.push(JSON.parse(JSON.stringify(itemEditTouchAction)));
            console.log(`[TOUCHACTION_ITEM_SYNC] Added new touchAction with cmdName "${cmdName}" to item edit preview`);
        }
        
        // Update preview version
        itemEditPreviewData.version = `V${Date.now()}`;
        
        return true;
        
    } catch (error) {
        console.error(`[TOUCHACTION_ITEM_SYNC] Error syncing touchAction item to preview:`, error);
        return false;
    }
}


// Handle adding temporary item to touchAction structure for item editing
function addTempItemToTouchAction(items, item, cmdName, tempEditDrawings, tempName) {
    console.log(`[TOUCHACTION_ITEM_TEMP] Adding temp item to touchAction structure with cmdName "${cmdName}"`);
    console.log(`[TOUCHACTION_ITEM_TEMP] Input item:`, JSON.stringify(item));
    
    // For touchAction item editing, we don't use __isTemporary flags
    // Both add and edit modes just replace the item at the specific editIndex
    // This preserves all other items in the action array
    
    // For touchAction item editing, we don't use __isTemporary flag
    // Just use the item as-is since we're replacing at specific editIndex
    const tempItem = { ...item };
    console.log(`[TOUCHACTION_ITEM_TEMP] Created item (no temporary flag needed):`, JSON.stringify(tempItem));
    
    // Find touchAction with matching cmd and add/update temp item to it
    let touchActionFound = false;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type === 'touchAction' && items[i].cmdName === cmdName) {
            console.log(`[TOUCHACTION_ITEM_TEMP] Found touchAction with cmdName "${cmdName}" at index ${i}`);
            console.log(`[TOUCHACTION_ITEM_TEMP] TouchAction before update:`, JSON.stringify(items[i].action));
            
            if (!items[i].action) {
                items[i].action = [];
            }
            
            // Get the editIndex for this item
            const editIndex = tempEditDrawings[tempName].editIndex;
            const numericEditIndex = editIndex !== undefined && editIndex !== null ? parseInt(editIndex, 10) : null;
            console.log(`[TOUCHACTION_ITEM_TEMP] EditIndex: ${editIndex}, numeric: ${numericEditIndex}`);
            
            if (numericEditIndex !== null && !isNaN(numericEditIndex) && numericEditIndex >= 0) {
                // Edit mode: Replace item at the specific editIndex
                console.log(`[TOUCHACTION_ITEM_TEMP] Replacing item at index ${numericEditIndex}, action array length: ${items[i].action.length}`);
                
                if (numericEditIndex < items[i].action.length) {
                    console.log(`[TOUCHACTION_ITEM_TEMP] Replacing existing item at index ${numericEditIndex}. Original item:`, JSON.stringify(items[i].action[numericEditIndex]));
                    items[i].action[numericEditIndex] = tempItem;
                    console.log(`[TOUCHACTION_ITEM_TEMP] Updated temp item at action index ${numericEditIndex} in touchAction with cmdName "${cmdName}"`);
                } else {
                    // editIndex is out of range - this shouldn't happen in normal flow
                    console.error(`[TOUCHACTION_ITEM_TEMP] Edit index ${numericEditIndex} out of range for action array length ${items[i].action.length}`);
                    return null;
                }
            } else {
                // Add mode: Push new item to action array
                console.log(`[TOUCHACTION_ITEM_TEMP] Add mode - pushing new item to action array (current length: ${items[i].action.length})`);
                items[i].action.push(tempItem);
                const newItemIndex = items[i].action.length - 1;
                console.log(`[TOUCHACTION_ITEM_TEMP] Added new temp item to touchAction with cmdName "${cmdName}" (new length: ${items[i].action.length})`);
                
                // Update editIndex to point to the newly added item (last item in array)
                if (tempEditDrawings[tempName]) {
                    tempEditDrawings[tempName].editIndex = newItemIndex;
                    console.log(`[TOUCHACTION_ITEM_TEMP] Updated editIndex to ${newItemIndex} for newly added item (action array length: ${items[i].action.length})`);
                }
            }
            
            console.log(`[TOUCHACTION_ITEM_TEMP] TouchAction after update:`, JSON.stringify(items[i].action));
            touchActionFound = true;
            break;
        }
    }
    
    if (!touchActionFound) {
        console.error(`[TOUCHACTION_ITEM_TEMP] ERROR: No touchAction found with cmdName "${cmdName}" - this should not happen in isolated environment`);
        // Do not add to items array - this indicates a bug in the isolated environment creation
        return null;
    }
    
    tempEditDrawings[tempName].tempPreviewItem = tempItem;
    return tempItem;
}

// Merge touchAction item from item edit temp drawing into touchAction structure
function mergeTouchActionItem(req, res, drawings, tempEditDrawings) {
    console.log(`[ENDPOINT] POST /api/drawings/:tempName/merge-touchaction-item - tempName="${req.params.tempName}"`);
    const { tempName } = req.params;
    const { item, cmdName, itemEditDrawingName, editIndex } = req.body;
    
    if (!tempEditDrawings[tempName]) {
        return res.status(404).json({ 
            success: false, 
            error: `TouchAction edit drawing "${tempName}" not found` 
        });
    }
    
    if (!tempEditDrawings[itemEditDrawingName]) {
        return res.status(404).json({ 
            success: false, 
            error: `Item edit temp drawing "${itemEditDrawingName}" not found` 
        });
    }
    
    if (!item || !cmdName) {
        return res.status(400).json({
            success: false,
            error: "Missing required parameters: item and cmdName"
        });
    }
    
    try {
        const touchActionEditData = tempEditDrawings[tempName].data;
        const items = touchActionEditData.items;
        
        console.log(`[MERGE_TOUCHACTION] Merging item into touchAction for cmdName "${cmdName}"`);
        console.log(`[MERGE_TOUCHACTION] Item to merge:`, item);
        
        // Find existing touchAction item with the matching cmdName, or create a new one
        let touchActionIndex = items.findIndex(existingItem => 
            existingItem.type === 'touchAction' && existingItem.cmdName === cmdName
        );
        
        let touchActionItem;
        if (touchActionIndex >= 0) {
            // Update existing touchAction item
            touchActionItem = items[touchActionIndex];
            console.log(`[MERGE_TOUCHACTION] Found existing touchAction at index ${touchActionIndex}`);
        } else {
            // Create new touchAction item
            touchActionItem = {
                type: 'touchAction',
                cmdName: cmdName,
                cmd: cmd,
                action: []
            };
            touchActionIndex = items.length;
            items.push(touchActionItem);
            console.log(`[MERGE_TOUCHACTION] Created new touchAction item at index ${touchActionIndex}`);
        }
        
        // Ensure action array exists
        if (!touchActionItem.action) {
            touchActionItem.action = [];
        }
        
        // Convert editIndex to number if it's a string
        const numericEditIndex = editIndex !== null && editIndex !== undefined ? parseInt(editIndex, 10) : null;
        
        if (numericEditIndex !== null && !isNaN(numericEditIndex) && numericEditIndex >= 0) {
            // Edit mode: replace specific action item
            console.log(`[MERGE_TOUCHACTION] Edit mode: index ${numericEditIndex}, action array length: ${touchActionItem.action.length}`);
            
            if (numericEditIndex < touchActionItem.action.length) {
                touchActionItem.action[numericEditIndex] = item;
                console.log(`[MERGE_TOUCHACTION] Updated action at index ${numericEditIndex}`);
            } else {
                console.error(`[MERGE_TOUCHACTION] Edit index ${numericEditIndex} out of range (action length: ${touchActionItem.action.length})`);
                return res.status(400).json({
                    success: false,
                    error: `Edit index ${numericEditIndex} out of range`
                });
            }
        } else {
            // Add mode: add new action item
            touchActionItem.action.push(item);
            console.log(`[MERGE_TOUCHACTION] Added new action item (total actions: ${touchActionItem.action.length})`);
        }
        
        // Update version
        touchActionEditData.version = `V${Date.now()}`;
        
        // Sync to preview drawing
        syncTouchActionToPreview(tempName, tempEditDrawings);
        
        console.log(`[MERGE_TOUCHACTION] Successfully merged item into touchAction structure`);
        console.log(`[MERGE_TOUCHACTION] TouchAction now has ${touchActionItem.action.length} actions`);
        
        res.json({ 
            success: true, 
            message: `Item merged into touchAction structure`,
            touchActionIndex: touchActionIndex,
            actionIndex: editIndex !== null ? editIndex : touchActionItem.action.length - 1
        });
    } catch (error) {
        console.error(`[MERGE_TOUCHACTION] Error merging item:`, error);
        res.status(500).json({ 
            success: false, 
            error: `Failed to merge item into touchAction: ${error.message}` 
        });
    }
}

// Sync touchAction structure from client back to server (for removals, etc.)
function syncTouchActionToServer(req, res, tempEditDrawings) {
    const { tempName } = req.params;
    const { touchAction, cmdName } = req.body;
    
    console.log(`[TOUCHACTION_SYNC_SERVER] Starting sync for tempDrawing "${tempName}" with cmdName "${cmdName}" `);
    console.log(`[TOUCHACTION_SYNC_SERVER] Received touchAction with ${touchAction?.action?.length || 0} action items`);
    
    if (!tempEditDrawings[tempName]) {
        console.log(`[TOUCHACTION_SYNC_SERVER] ERROR: Temporary drawing "${tempName}" not found`);
        console.log(`[TOUCHACTION_SYNC_SERVER] Available temp drawings:`, Object.keys(tempEditDrawings));
        return res.status(404).json({ 
            success: false, 
            error: `Temporary drawing "${tempName}" not found` 
        });
    }
    
    if (!touchAction || !cmdName) {
        console.log(`[TOUCHACTION_SYNC_SERVER] ERROR: Missing required parameters - touchAction: ${!!touchAction}, cmdName: ${!!cmdName}`);
        return res.status(400).json({
            success: false,
            error: "Missing required parameters: touchAction and cmdName"
        });
    }
    
    try {
        const tempData = tempEditDrawings[tempName].data;
        const items = tempData.items;
        
        console.log(`[TOUCHACTION_SYNC_SERVER] Isolated environment has ${items.length} items total`);
        
        // Find the touchAction in the isolated environment
        const existingTouchActionIndex = items.findIndex(item => 
            item.type === 'touchAction' && item.cmdName === cmdName
        );
        
        if (existingTouchActionIndex === -1) {
            console.log(`[TOUCHACTION_SYNC_SERVER] ERROR: TouchAction with cmdName "${cmdName}" not found in isolated environment`);
            console.log(`[TOUCHACTION_SYNC_SERVER] Available items in isolated environment:`, items.map(item => ({ type: item.type, cmdName: item.cmdName })));
            return res.status(404).json({
                success: false,
                error: `TouchAction with cmdName "${cmdName}" not found in isolated environment`
            });
        }
        
        const oldTouchAction = items[existingTouchActionIndex];
        const oldActionCount = oldTouchAction.action ? oldTouchAction.action.length : 0;
        const newActionCount = touchAction.action ? touchAction.action.length : 0;
        
        console.log(`[TOUCHACTION_SYNC_SERVER] Found existing touchAction at index ${existingTouchActionIndex}`);
        console.log(`[TOUCHACTION_SYNC_SERVER] Old action count: ${oldActionCount}, New action count: ${newActionCount}`);
        
        // Update the touchAction in the server's isolated environment
        const { __isTemporary, ...cleanTouchAction } = touchAction;
        items[existingTouchActionIndex] = cleanTouchAction;
        
        // Update version
        const oldVersion = tempData.version;
        tempData.version = `V${Date.now()}`;
        
        console.log(`[TOUCHACTION_SYNC_SERVER] Updated touchAction with cmdName "${cmdName}" in isolated environment`);
        console.log(`[TOUCHACTION_SYNC_SERVER] Version updated from ${oldVersion} to ${tempData.version}`);
        console.log(`[TOUCHACTION_SYNC_SERVER] Action items change: ${oldActionCount} → ${newActionCount}`);
        
        // Sync to preview as well
        const baseDrawingName = tempName.replace('_touchAction_edit', '');
        const editPreviewName = `${baseDrawingName}_touchAction_edit_preview`;
        console.log(`[TOUCHACTION_SYNC_SERVER] Syncing to preview drawing: ${editPreviewName}`);
        
        // Manual sync to the correct preview drawing since syncTouchActionToPreview uses wrong naming pattern
        if (tempEditDrawings[editPreviewName]) {
            const previewData = tempEditDrawings[editPreviewName].data;
            const previewTouchActionIndex = previewData.items.findIndex(item => 
                item.type === 'touchAction' && item.cmdName === cmdName
            );
            
            if (previewTouchActionIndex >= 0) {
                // Replace existing touchAction in preview with the updated one
                previewData.items[previewTouchActionIndex] = JSON.parse(JSON.stringify(cleanTouchAction));
                console.log(`[TOUCHACTION_SYNC_SERVER] Updated touchAction in preview: ${editPreviewName}`);
            } else {
                console.log(`[TOUCHACTION_SYNC_SERVER] TouchAction with cmdName "${cmdName}" not found in preview`);
            }
        } else {
            console.log(`[TOUCHACTION_SYNC_SERVER] Preview drawing not found: ${editPreviewName}`);
        }
        
        console.log(`[TOUCHACTION_SYNC_SERVER] Successfully synced touchAction with cmdName "${cmdName}" - final count: ${newActionCount} action items`);
        
        res.json({ 
            success: true, 
            message: `TouchAction with cmdName "${cmdName}" synced to server`,
            actionCount: newActionCount,
            previousCount: oldActionCount,
            tempDrawing: tempName
        });
    } catch (error) {
        console.error(`[TOUCHACTION_SYNC_SERVER] Error syncing touchAction for cmdName "${cmdName}":`, error);
        console.error(`[TOUCHACTION_SYNC_SERVER] Error stack:`, error.stack);
        res.status(500).json({ 
            success: false, 
            error: `Failed to sync touchAction: ${error.message}` 
        });
    }
}

// Function to temporarily hide an item in preview for touchAction selection
function hideItemInPreview(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    const { idx } = req.body;
    
    console.log(`[PREVIEW_HIDE] Request to hide item idx ${idx} in drawing: ${drawingName}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({
            success: false,
            error: `Drawing "${drawingName}" not found`
        });
    }
    
    if (idx === undefined || idx === null) {
        return res.status(400).json({
            success: false,
            error: 'Item idx is required'
        });
    }
    
    try {
        // Use the existing selection preview drawing
        const selectionPreviewName = `${drawingName}_selection_preview`;
        
        if (!tempEditDrawings[selectionPreviewName]) {
            return res.status(404).json({
                success: false,
                error: `Selection preview drawing "${selectionPreviewName}" not found`
            });
        }
        
        // Get the existing selection preview drawing
        const selectionDrawing = tempEditDrawings[selectionPreviewName];
        
        // Remove any existing hide/unhide commands
        selectionDrawing.data.items = selectionDrawing.data.items.filter(item => 
            item.type !== 'hide' && item.type !== 'unhide'
        );
        
        // Add the new hide item
        const hideItem = {
            type: 'hide',
            idx: parseInt(idx)
        };
        
        selectionDrawing.data.items.push(hideItem);
        
        // Update version to trigger update mechanism (essential for preventing iframe reinitialization)
        selectionDrawing.data.version = `V${Date.now()}`;
        
        // Mark for update-only responses
        selectionDrawing.isUpdateOnly = true;
        
        console.log(`[PREVIEW_HIDE] Added hide item for idx ${idx} to selection preview: ${selectionPreviewName}`);
        
        res.json({
            success: true,
            previewDrawingName: selectionPreviewName,
            message: `Temporarily hiding item idx ${idx}`
        });
        
    } catch (error) {
        console.error(`[PREVIEW_HIDE] Error hiding item in preview for drawing "${drawingName}":`, error);
        res.status(500).json({
            success: false,
            error: `Failed to hide item in preview: ${error.message}`
        });
    }
}

// Function to restore original preview by removing hide commands
function restorePreview(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    
    console.log(`[PREVIEW_RESTORE] Request to restore preview for drawing: ${drawingName}`);
    
    try {
        // Get the selection preview drawing
        const selectionPreviewName = `${drawingName}_selection_preview`;
        
        if (!tempEditDrawings[selectionPreviewName]) {
            return res.status(404).json({
                success: false,
                error: `Selection preview drawing "${selectionPreviewName}" not found`
            });
        }
        
        // Get the existing selection preview drawing
        const selectionDrawing = tempEditDrawings[selectionPreviewName];
        
        // Remove any hide/unhide commands to restore original view
        selectionDrawing.data.items = selectionDrawing.data.items.filter(item => 
            item.type !== 'hide' && item.type !== 'unhide'
        );
        
        // Update version to trigger update mechanism (essential for preventing iframe reinitialization)
        selectionDrawing.data.version = `V${Date.now()}`;
        
        // Mark for update-only responses
        selectionDrawing.isUpdateOnly = true;
        
        console.log(`[PREVIEW_RESTORE] Removed hide/unhide commands from selection preview: ${selectionPreviewName}`);
        
        res.json({
            success: true,
            previewDrawingName: selectionPreviewName,
            message: `Preview restored to original state`
        });
        
    } catch (error) {
        console.error(`[PREVIEW_RESTORE] Error restoring preview for drawing "${drawingName}":`, error);
        res.status(500).json({
            success: false,
            error: `Failed to restore preview: ${error.message}`
        });
    }
}

// Function to create initial filtered preview for touchAction selection
function createInitialPreview(req, res, drawings, tempEditDrawings) {
    const { drawingName } = req.params;
    
    console.log(`[INITIAL_PREVIEW] Request to create initial filtered preview for drawing: ${drawingName}`);
    
    if (!drawings[drawingName]) {
        return res.status(404).json({
            success: false,
            error: `Drawing "${drawingName}" not found`
        });
    }
    
    try {
        // Create a filtered preview drawing name
        const previewDrawingName = `${drawingName}_selection_preview`;
        
        // Copy the original drawing from _touchAction_edit_preview in tempEditDrawings
        const tempTouchAction_edit_previewName = `${drawingName}_touchAction_edit_preview`
        const originalDrawing = tempEditDrawings[tempTouchAction_edit_previewName];
        const tempDrawing = JSON.parse(JSON.stringify(originalDrawing));
        
        // Filter out touchActionInputs from the preview
        tempDrawing.data.items = tempDrawing.data.items.filter(item => 
            item.type !== 'touchActionInput'
        );
        
        // Disable auto-refresh for preview by setting refresh to 0
        tempDrawing.data.refresh = 0;
        
        // Assign a fresh version number to ensure first iframe load gets start response
        tempDrawing.data.version = `V${Date.now()}`;
        
        // Store the temporary drawing and mark it as an update-only drawing  
        tempDrawing.isUpdateOnly = true;
        tempEditDrawings[previewDrawingName] = tempDrawing;
        
        console.log(`[INITIAL_PREVIEW] Created initial filtered preview: ${previewDrawingName}`);
        
        res.json({
            success: true,
            previewDrawingName: previewDrawingName,
            message: `Created filtered preview without touchActionInputs and auto-refresh`
        });
        
    } catch (error) {
        console.error(`[INITIAL_PREVIEW] Error creating initial preview for drawing "${drawingName}":`, error);
        res.status(500).json({
            success: false,
            error: `Failed to create initial preview: ${error.message}`
        });
    }
}

module.exports = {
    setupTouchActionRoutes,
    createTouchActionTempCopy,
    acceptTouchActionChanges,
    cleanupTouchActionTemp,
    insertTouchActionItemByCMD,
    validateTouchActionMode,
    acceptTouchActionItemChanges,
    cancelTouchActionItemChanges,
    cleanupTouchActionItemTempDrawings,
    addTempItemToTouchAction,
    createTouchActionItemTempDrawings,
    syncTouchActionToPreview,
    syncTouchActionItemToPreview,
    syncTempEditToPreview,
    mergeTouchActionItem,
    syncTouchActionToServer,
    hideItemInPreview,
    restorePreview,
    createInitialPreview
};