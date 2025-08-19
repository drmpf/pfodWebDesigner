/*   
   touch-actions.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Touch Actions Manager Page Script

// Helper function to truncate text to prevent UI overflow
function truncateText(text, maxLength = 10) {
    if (!text) return '';
    const result = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    console.log(`[TRUNCATE_DEBUG] Input: "${text}" (${text.length} chars), Max: ${maxLength}, Result: "${result}"`);
    return result;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Touch actions manager page loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const tempDrawingName = params.get('tempDrawing');
    const touchZoneCmd = params.get('cmd');
    const touchZoneCmdName = params.get('cmdName');
    const editIndex = params.get('editIndex'); // Index of touchAction being edited
    
    // tempDrawingName and touchZoneCmd are always required
    
    // DOM Elements
    const itemsList = document.getElementById('items-list');
    const acceptBtn = document.getElementById('accept-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const addTouchActionBtn = document.getElementById('add-touchaction-btn');
    const previewIframe = document.getElementById('preview-iframe');
    
    // Variables
    let currentDrawingData = null;
    
    // Initialize
    if (editIndex !== null) {
        // We're editing an existing touchAction, need to create temporary drawing first
        initializeTouchActionEditing();
    } else {
        // Temporary drawing should already exist, just load it
        loadDrawingData();
        
        // Set up preview iframe
        setupPreviewIframe();
    }
    
    // Function to initialize touchAction editing (for existing touchActions)
    function initializeTouchActionEditing() {
        console.log(`[TOUCH_ACTION_INIT] Initializing touchAction editing for index ${editIndex}`);
        
        // Temp drawings are already created by the GET request to /touch-actions.html
        // Just proceed with loading the drawing data and setting up preview
        console.log(`[TOUCH_ACTION_INIT] Using existing temp drawings from GET request`);
        
        // Load the drawing data
        loadDrawingData();
        
        // Set up preview iframe
        setupPreviewIframe();
    }
    
    // Event Listeners
    acceptBtn.addEventListener('click', () => {
        acceptTouchActionChanges();
    });
    
    cancelBtn.addEventListener('click', () => {
        cancelTouchActionChanges();
    });
    
    addTouchActionBtn.addEventListener('click', () => {
        addNewTouchAction();
    });
    
    // Function to load drawing data
    function loadDrawingData() {
        Promise.all([
            // Get drawing metadata
            fetch(`/api/drawings/${tempDrawingName}`).then(response => response.json()),
            // Get drawing items
            fetch(`/${tempDrawingName}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(response => response.json())
        ])
        .then(([metadata, drawingData]) => {
            console.log("Loaded drawing metadata:", metadata);
            console.log("Loaded drawing data:", JSON.stringify(drawingData,null,2));
            
            currentDrawingData = drawingData;
            
            // Update page titles with touchZone cmd
            updatePageTitles();
            
            // Update touchAction items list
            updateTouchActionsList();
            
            // Update preview iframe
            updatePreview();
        })
        .catch(error => {
            console.error("Error loading drawing data:", error);
            alert(`Failed to load drawing data: ${error.message}`);
        });
    }
    
    // Function to set up preview iframe initially
    function setupPreviewIframe() {
        const previewDrawingName = tempDrawingName.replace('_touchAction_edit', '_touchAction_edit_preview');
        setupPreviewIframeWithDrawing(previewIframe, previewDrawingName, true);
    }
    
    // Function to update page titles with touchZone cmd
    function updatePageTitles() {
        const pageTitle = document.getElementById('page-title');
        
        // Display cmdName if available, otherwise fall back to cmd
        const displayName = touchZoneCmdName;
        
        if (pageTitle && displayName) {
            pageTitle.textContent = `touchAction Items for touchZone ${displayName}`;
        }
        
        // Update document title
        if (displayName) {
            document.title = `touchAction Items for touchZone ${displayName}`;
        }
    }
    
    // Function to update the touchAction items list
    function updateTouchActionsList() {
        if (!currentDrawingData || !currentDrawingData.items || currentDrawingData.items.length === 0) {
            itemsList.innerHTML = '<div class="no-items">No items in this touchAction</div>';
            return;
        }
        
        // Find the touchAction in the isolated environment
        const touchActionItem = currentDrawingData.items.find(item => item.type === 'touchAction');
        
        if (!touchActionItem) {
            itemsList.innerHTML = '<div class="no-items">No touchAction found in isolated environment</div>';
            return;
        }
        
        // Show the action items inside the touchAction
        const actionItems = touchActionItem.action || [];
        
        if (actionItems.length === 0) {
            itemsList.innerHTML = '<div class="no-items">No action items in this touchAction</div>';
            return;
        }
        
        // Get preview drawing data which contains full context for visibility processing
        const previewDrawingName = tempDrawingName.replace('_touchAction_edit', '_touchAction_edit_preview');
        console.log(`[VISIBILITY_DEBUG] Fetching preview drawing: ${previewDrawingName}`);
        fetch(`/${previewDrawingName}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(previewData => {
            console.log(`[VISIBILITY_DEBUG] Fetched preview data with ${previewData.items ? previewData.items.length : 0} items`);
            console.log(`[DEBUG] Processing ${previewData.items.length} items from preview drawing`);
            
            // Process ALL preview drawing items to determine final visibility states
            const indexedItemsMap = new Map();
            previewData.items.forEach((item, globalIndex) => {
            if (item.idxName !== undefined && 
                item.idxName.trim() !== '' && 
                item.type !== 'touchActionInput' && 
                item.type !== 'touchAction' &&
                !item.__isTemporary) {
                
                // Handle hide/unhide/erase operations
                if (item.type === 'hide' && item.idxName) {
                    // Hide operation: update visible state if item exists
                    if (indexedItemsMap.has(item.idxName)) {
                        const existingItem = indexedItemsMap.get(item.idxName);
                        existingItem.item.visible = false;
                    }
                } else if (item.type === 'unhide' && item.idxName) {
                    // Unhide operation: update visible state if item exists
                    if (indexedItemsMap.has(item.idxName)) {
                        const existingItem = indexedItemsMap.get(item.idxName);
                        existingItem.item.visible = true;
                    }
                } else if (item.type === 'erase' && item.idxName) {
                    // Erase operation: remove item from map
                    indexedItemsMap.delete(item.idxName);
                } else if (item.type === 'index') {
                    // Index item: only add if no existing item, ignore if already exists
                    if (!indexedItemsMap.has(item.idxName)) {
                        const newItem = {
                            item: {...item},
                            globalIndex: globalIndex,
                            idxName: item.idxName,
                            idx: item.idx
                        };
                        indexedItemsMap.set(item.idxName, newItem);
                    }
                } else {
                    // Regular item: add or replace in map, preserving visibility state
                    const existingVisible = indexedItemsMap.has(item.idxName) ? 
                        indexedItemsMap.get(item.idxName).item.visible : item.visible;
                    
                    const newItem = {
                        item: {...item, visible: existingVisible},
                        globalIndex: globalIndex,
                        idxName: item.idxName,
                        idx: item.idx
                    };
                    
                    indexedItemsMap.set(item.idxName, newItem);
                }
            }
        });
        
        itemsList.innerHTML = '';
        
            actionItems.forEach((actionItem, actionIndex) => {
                // For hide/unhide items, get the processed visibility state
                let targetVisible = undefined;
                if ((actionItem.type === 'hide' || actionItem.type === 'unhide') && actionItem.idxName) {
                    const targetItem = indexedItemsMap.get(actionItem.idxName);
                    targetVisible = targetItem ? targetItem.item.visible : undefined;
                }
                
                const itemElement = createActionItemElement(actionItem, actionIndex, actionItem.idx, targetVisible, indexedItemsMap);
                itemsList.appendChild(itemElement);
            });
        })
        .catch(error => {
            console.error('[VISIBILITY_DEBUG] Error fetching preview data:', error);
            
            // Fallback to basic descriptions without target item lookup
            itemsList.innerHTML = '';
            
            actionItems.forEach((actionItem, actionIndex) => {
                const itemElement = createActionItemElement(actionItem, actionIndex, actionItem.idx, undefined, new Map());
                itemsList.appendChild(itemElement);
            });
        });
    }
    
    // Function to create action item element 
    function createActionItemElement(actionItem, actionIndex, itemIdx, targetVisible, indexedItemsMap) {
        const element = document.createElement('div');
        element.className = 'item-row';
        
        // Item index name (show idxName instead of raw idx)
        const indexDiv = document.createElement('div');
        indexDiv.className = 'item-index';
        indexDiv.textContent = actionItem.idxName;
        
        // Item type
        const typeDiv = document.createElement('div');
        typeDiv.className = 'item-type';
        typeDiv.textContent = actionItem.type || 'unknown';
        
        // Item details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'item-details';
        detailsDiv.textContent = getActionItemDetails(actionItem, indexedItemsMap);
        
        // Item actions
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = () => editActionItem(actionIndex, targetVisible);
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = () => removeActionItem(actionIndex);
        
        actionsDiv.appendChild(editBtn);
        actionsDiv.appendChild(removeBtn);
        
        element.appendChild(indexDiv);
        element.appendChild(typeDiv);
        element.appendChild(detailsDiv);
        element.appendChild(actionsDiv);
        
        return element;
    }
    
    // Function to get target item description for hide/unhide actions
    function getTargetItemDescription(targetItem) {
        switch (targetItem.type) {
            case 'line':
                return `Line (${targetItem.xSize || 0}, ${targetItem.ySize || 0})`;
            case 'rectangle':
                return `Rectangle ${targetItem.xSize || 0}x${targetItem.ySize || 0}`;
            case 'circle':
                return `Circle r=${targetItem.radius || 0}`;
            case 'arc':
                return `Arc r=${targetItem.radius || 0}`;
            case 'label':
                return `Label "${truncateText(targetItem.text)}"`;
            case 'value':
                return `Value "${truncateText(targetItem.text)}"`;
            default:
                return `${targetItem.type}`;
        }
    }

    // Function to get action item details for display
    function getActionItemDetails(item, indexedItemsMap) {
        switch (item.type) {
            case 'line':
                return `Line: (${item.xSize || 0}, ${item.ySize || 0}) offset (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'rectangle':
                return `Rectangle: ${item.xSize || 0}x${item.ySize || 0} at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'circle':
                return `Circle: radius ${item.radius || 0} at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'arc':
                return `Arc: radius ${item.radius || 0}, ${item.start || 0}° to ${(item.start || 0) + (item.angle || 0)}°`;
            case 'label':
                return `Label: "${truncateText(item.text)}" at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'value':
                return `Value: "${truncateText(item.text)}" = ${item.intValue || 0}`;
            case 'insertDwg':
                return `Insert: "${truncateText(item.drawingName, 30)}" at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'hide':
                const hideTarget = indexedItemsMap.get(item.idxName);
                console.log(`[HIDE_DESC] Looking for idxName: ${item.idxName}, found: ${hideTarget ? 'yes' : 'no'}`);
                if (hideTarget) {
                    const targetDetails = getTargetItemDescription(hideTarget.item);
                    console.log(`[HIDE_DESC] Generated description: Hide: ${targetDetails}`);
                    return ` ${targetDetails}`;
                }
                return ` idx ${item.idx || 0}`;
            case 'unhide':
                const unhideTarget = indexedItemsMap.get(item.idxName);
                console.log(`[UNHIDE_DESC] Looking for idxName: ${item.idxName}, found: ${unhideTarget ? 'yes' : 'no'}`);
                if (unhideTarget) {
                    const targetDetails = getTargetItemDescription(unhideTarget.item);
                    console.log(`[UNHIDE_DESC] Generated description: Unhide: ${targetDetails}`);
                    return ` ${targetDetails}`;
                }
                return ` idx ${item.idx || 0}`;
            default:
                return `${item.type}: ${JSON.stringify(item)}`;
        }
    }
    
    // Function to add a new touchAction item
    function addNewTouchAction() {
        // Navigate to index selection page first (Step 1 of 2)
        let url = `/select-touchaction-index.html?tempDrawing=${encodeURIComponent(tempDrawingName)}`;
        url += `&cmdName=${encodeURIComponent(touchZoneCmdName)}`;
        window.location.href = url;
    }
    
    // Function to edit an action item
    function editActionItem(actionIndex, targetVisible) {
        // Navigate to the touchAction item editor for editing
        let url = `/add-touchAction-item.html?tempDrawing=${encodeURIComponent(tempDrawingName)}&mode=touchAction&editIndex=${actionIndex}`;
        url += `&cmdName=${encodeURIComponent(touchZoneCmdName)}`;
        if (targetVisible !== undefined) {
            url += `&targetVisible=${encodeURIComponent(targetVisible)}`;
        }
        window.location.href = url;
    }
    
    // Function to remove an action item
    function removeActionItem(actionIndex) {
        if (confirm('Are you sure you want to remove this action item?')) {
            // Find the touchAction in the isolated environment
            const touchActionItem = currentDrawingData.items.find(item => item.type === 'touchAction');
            if (touchActionItem && touchActionItem.action) {
                touchActionItem.action.splice(actionIndex, 1);
                
                // Send the updated touchAction back to the server to sync the removal
                fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/sync-touchaction`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        touchAction: touchActionItem,
                        cmd: touchZoneCmd,
                        cmdName: touchZoneCmdName
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        console.log('TouchAction removal synced to server - now has', data.actionCount, 'action items');
                        updateTouchActionsList();
                        updatePreview();
                    } else {
                        throw new Error(data.error || 'Failed to sync removal');
                    }
                })
                .catch(error => {
                    console.error('Error syncing touchAction removal:', error);
                    alert('Failed to sync removal: ' + error.message);
                    // Reload to get server state
                    window.location.reload();
                });
            }
        }
    }
    
    // Session management functions
    function acceptTouchActionChanges() {
        // Accept all changes from temporary to real drawing        
        fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to accept changes');
            }
            console.log('TouchAction changes accepted and applied to real drawing');
            // Return to edit drawing page with original drawing name
            const originalName = tempDrawingName.replace(/_touchAction_edit$/, '');
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalName)}`;
        })
        .catch(error => {
            console.error('Error accepting changes:', error);
            alert('Failed to accept changes: ' + error.message);
        });
    }
    
    function cancelTouchActionChanges() {
        // Cancel/cleanup temporary changes
        fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/cancel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            console.log('TouchAction changes cancelled and temporary drawing cleaned up');
            // Return to edit drawing page with original drawing name
            const originalName = tempDrawingName.replace(/_touchAction_edit$/, '');
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalName)}`;
        })
        .catch(error => {
            console.warn('Error cancelling changes:', error);
            // Still navigate back even if cancel fails
            const originalName = tempDrawingName.replace(/_touchAction_edit$/, '');
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalName)}`;
        });
    }
    
    
 /**   
    function editTouchAction(cmd) {
        // Navigate directly to touchAction editor using existing temp drawing
        let url = `/add-touchAction-item.html?tempDrawing=${encodeURIComponent(tempDrawingName)}&mode=touchAction`;
        url += `&cmdName=${encodeURIComponent(touchZoneCmdName)}`;
        window.location.href = url;
    }
    
    function addTouchAction(cmd) {
        // Navigate directly to touchAction editor using existing temp drawing
        let url = `/add-touchAction-item.html?tempDrawing=${encodeURIComponent(tempDrawingName)}&mode=touchAction`;
        url += `&cmdName=${encodeURIComponent(touchZoneCmdName)}`;
        window.location.href = url;
    }
 **/   
    
    
    // Function to update preview iframe
    function updatePreview() {
        if (currentDrawingData) {
            // Trigger restart in existing iframe instead of reloading
            safelyCallInitializeApp(previewIframe);
        }
    }
    
    // Function to clean up temporary state
    function cleanupTempState() {
        if (tempDrawingName) {
            fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/temp-cleanup`, {
                method: 'DELETE'
            })
            .then(() => {
                console.log('Cleaned up temporary drawing:', tempDrawingName);
            })
            .catch(error => {
                let strError = "" + error;
                if (strError.startsWith('TypeError: NetworkError')) {
                  // ignore no tempdwg to clean up
                } else {
                  console.warn('Error cleaning up temp drawing:', error);
                }
            });
        }
    }
    
    // Clean up on page unload
    window.addEventListener('beforeunload', () => {
        cleanupTempState();
    });
    
    // Auto Save functionality - fetch override to trigger JSON saves when Auto Save is enabled
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url, options] = args;
        
        // Check if this is a touchAction accept operation and auto save is enabled
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false';
        const shouldAutoSave = autoSaveEnabled && (
            // TouchAction accept changes
            (typeof url === 'string' && (url.includes('/api/touchaction-item/') || url.includes('_touchAction_edit')) && url.includes('/accept'))
        );
        
        const result = originalFetch.apply(this, args);
        
        // If this was a touchAction accept operation and auto save is enabled, trigger save after successful response
        if (shouldAutoSave) {
            result.then(response => {
                if (response.ok) {
                    // Save immediately since page will redirect soon
                    if (autoSaveEnabled && tempDrawingName) {
                        const originalName = tempDrawingName.replace(/_touchAction_edit$/, '');
                        console.log('Auto Save enabled - saving touchAction changes as JSON');
                        saveDrawingAsJson(originalName);
                    }
                }
            }).catch(() => {
                // Ignore fetch errors for auto save purposes
            });
        }
        
        return result;
    };
    
    // Function to save drawing as JSON file
    function saveDrawingAsJson(drawingName) {
        if (!drawingName) return;
        
        try {
            console.log(`Exporting drawing "${drawingName}" as JSON`);
            
            // Create download link and download the file
            const downloadLink = document.createElement('a');
            downloadLink.href = `/api/drawings/${drawingName}/export`;
            downloadLink.download = `${drawingName}.json`;
            
            // Append to body, click to download, then remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            console.log(`Drawing "${drawingName}" export triggered`);
        } catch (error) {
            console.error(`Error exporting drawing "${drawingName}":`, error);
            // Don't show alert here since this is automatic - just log the error
        }
    }
});