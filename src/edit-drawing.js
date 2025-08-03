/*   
   edit-drawing.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Edit Drawing Items Page Script

document.addEventListener('DOMContentLoaded', () => {
    console.log("Edit drawing items page loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const drawingName = params.get('drawing');
    
    if (!drawingName) {
        alert('No drawing specified');
        window.location.href = '/control.html';
        return;
    }
    
    // DOM Elements
    const drawingNameDisplay = document.getElementById('drawing-name');
    const canvasSizeDisplay = document.getElementById('canvas-size');
    const canvasColorDisplay = document.getElementById('canvas-color');
    const refreshRateDisplay = document.getElementById('refresh-rate');
    const totalItemsDisplay = document.getElementById('total-items');
    const itemsList = document.getElementById('items-list');
    const addItemBtn = document.getElementById('add-item-btn');
    const saveDwgBtn = document.getElementById('save-dwg-btn');
    const autoSaveBtn = document.getElementById('auto-save-btn');
    const previewIframe = document.getElementById('preview-iframe');
    
    // Variables
    let currentDrawingData = null;
    let selectedItemIndex = -1;
    let tempCanvasDrawingName = null; // For canvas property editing
    let originalRefreshRate = null; // Store original refresh rate during editing
    let editingRefreshRate = null; // Track user's refresh changes during editing
    let autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false'; // Auto Save state (default true)
    
    // Initialize
    loadDrawingData();
    
    // Event Listeners
    addItemBtn.addEventListener('click', () => {
        window.location.href = `/add-item.html?drawing=${encodeURIComponent(drawingName)}`;
    });
    
    saveDwgBtn.addEventListener('click', () => {
        saveDrawingAsJson(drawingName);
    });
    
    // Auto Save button event listener
    autoSaveBtn.addEventListener('click', () => {
        toggleAutoSave();
    });
    
    // Initialize Auto Save button text
    updateAutoSaveButton();
    
    // Canvas editing elements
    const editCanvasBtn = document.getElementById('edit-canvas-btn');
    const canvasEditForm = document.getElementById('canvas-edit-form');
    const saveCanvasBtn = document.getElementById('save-canvas-btn');
    const cancelCanvasBtn = document.getElementById('cancel-canvas-btn');
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const canvasBgColorInput = document.getElementById('canvas-bg-color');
    const canvasRefreshInput = document.getElementById('canvas-refresh');

    // Canvas editing event listeners
    editCanvasBtn.addEventListener('click', () => {
        showCanvasEditForm();
    });

    saveCanvasBtn.addEventListener('click', () => {
        saveCanvasProperties();
    });

    cancelCanvasBtn.addEventListener('click', () => {
        hideCanvasEditForm();
    });
    
    // Window resize handler to update preview scaling
    window.addEventListener('resize', () => {
        if (currentDrawingData && previewIframe.contentWindow) {
            setTimeout(() => {
                try {
                    // Trigger resize on iframe content when parent window resizes
                    previewIframe.contentWindow.dispatchEvent(new Event('resize'));
                } catch (e) {
                    console.log('Could not dispatch resize event during window resize:', e.message);
                }
            }, 100); // Delay to allow layout to settle
        }
    });
    
    // Function to load drawing data
    function loadDrawingData() {
        Promise.all([
            // Get drawing metadata
            fetch(`/api/drawings/${drawingName}`).then(response => response.json()),
            // Get full drawing data
            fetch(`/api/drawings/${drawingName}/data`).then(response => response.json())
        ])
        .then(([metadata, drawingData]) => {
            console.log("Loaded drawing metadata:", metadata);
            console.log("Loaded drawing data:", drawingData);
            
            currentDrawingData = drawingData;
            
            // Update drawing info
            drawingNameDisplay.textContent = drawingName;
            canvasSizeDisplay.textContent = `${drawingData.x || metadata.canvasWidth} x ${drawingData.y || metadata.canvasHeight}`;
            const canvasColorNum = parseInt(drawingData.color) || 0;
            const canvasColorHex = typeof getColorHex !== 'undefined' ? getColorHex(canvasColorNum) : '#000000';
            canvasColorDisplay.innerHTML = `<span style="display:inline-block; width:14px; height:14px; background-color:${canvasColorHex}; border: 1px solid #ccc; margin-right: 5px;"></span>Color ${canvasColorNum}`;
            refreshRateDisplay.textContent = drawingData.refresh === 0 ? 'No auto-refresh' : `${drawingData.refresh}ms`;
            totalItemsDisplay.textContent = drawingData.items ? drawingData.items.length : 0;
            
            // Update items list
            updateItemsList();
            
            // Set up preview iframe initially
            setupPreviewIframe();
            
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
        setupPreviewIframeWithDrawing(previewIframe, drawingName);
    }
    
    // Get full drawing data with name (for edit screens and controller)
    // Function to update numeric indices for indexed items based on current position
    function updateNumericIndices(drawing) {
      if (!drawing || !drawing.items) return;
    
      drawing.items.forEach((item, index) => {
        if (item.indexed) {
            // Numeric index is simply the row number (1-based) - use 'idx' for pfodWeb viewer
            item.idx = index + 1;
            if (item.idxName == null || item.idxName == undefined) {
              item.idxName = `missingIndexName_${item.dx}`;
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
   }

    // Function to update the items list
    function updateItemsList() {
        if (!currentDrawingData || !currentDrawingData.items || currentDrawingData.items.length === 0) {
            itemsList.innerHTML = '<div class="no-items">No items in this drawing</div>';
            return;
        }
        
        // Update numeric indices before displaying
        updateNumericIndices();
        
        itemsList.innerHTML = '';
        
        // Create merged view of items
        const mergedItems = createMergedItemsView();
        
        mergedItems.forEach((mergedItem, mergedIndex) => {
            const itemRow = document.createElement('div');
            itemRow.className = 'item-row';
            itemRow.dataset.mergedIndex = mergedIndex;
            
            if (mergedItem.type === 'touchZone') {
                // Create touchZone with nested items
                createTouchZoneItemRow(itemRow, mergedItem, mergedIndex);
            } else {
                // Create regular item row
                createRegularItemRow(itemRow, mergedItem, mergedIndex);
            }
            
            itemsList.appendChild(itemRow);
        });
    }
    
    // Function to create merged items view - groups touchZone with associated touchActionInput and touchActions
    function createMergedItemsView() {
        const mergedItems = [];
        const processedIndices = new Set();
        
        currentDrawingData.items.forEach((item, index) => {
            if (processedIndices.has(index)) return;
            
            if (item.type === 'touchZone') {
                // Find associated touchActionInput and touchActions with same 
                const associatedItems = {
                    touchZone: { item, originalIndex: index },
                    touchActionInput: null,
                    touchActions: []
                };
                
                // Look for touchActionInput and touchActions with matching cmdcmdName
                currentDrawingData.items.forEach((otherItem, otherIndex) => {
                    if (otherIndex === index || processedIndices.has(otherIndex)) return;
                    
                    if (otherItem.cmdName === item.cmdName) {
                        if (otherItem.type === 'touchActionInput') {
                            associatedItems.touchActionInput = { item: otherItem, originalIndex: otherIndex };
                            processedIndices.add(otherIndex);
                        } else if (otherItem.type === 'touchAction') {
                            associatedItems.touchActions.push({ item: otherItem, originalIndex: otherIndex });
                            processedIndices.add(otherIndex);
                        }
                    }
                });
                
                mergedItems.push({
                    type: 'touchZone',
                    ...associatedItems
                });
                processedIndices.add(index);
            } else if (!processedIndices.has(index)) {
                // Regular item that wasn't processed as part of a touchZone
                mergedItems.push({
                    type: 'regular',
                    item: item,
                    originalIndex: index
                });
                processedIndices.add(index);
            }
        });
        
        return mergedItems;
    }
    
    // Function to create touchZone item row with nested items
    function createTouchZoneItemRow(itemRow, mergedItem, mergedIndex) {
        itemRow.classList.add('touch-zone-item');
        
        // Create main touchZone info
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        
        const itemType = document.createElement('div');
        itemType.className = 'item-type';
        itemType.textContent = 'touchZone (merged)';
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';
        itemDetails.innerHTML = getItemDetailsText(mergedItem.touchZone.item);
        
        itemInfo.appendChild(itemType);
        itemInfo.appendChild(itemDetails);
        
        // Create action buttons for touchZone
        const itemActions = document.createElement('div');
        itemActions.className = 'item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-edit';
        editBtn.textContent = 'Edit Zone';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editMergedTouchZone(mergedItem);
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-remove';
        removeBtn.textContent = 'Remove All';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeMergedTouchZone(mergedItem);
        };
        
        const upBtn = document.createElement('button');
        upBtn.className = 'btn btn-up';
        upBtn.textContent = '↑';
        upBtn.disabled = mergedIndex === 0;
        upBtn.onclick = (e) => {
            e.stopPropagation();
            moveMergedTouchZoneUp(mergedItem, mergedIndex);
        };
        
        const downBtn = document.createElement('button');
        downBtn.className = 'btn btn-down';
        downBtn.textContent = '↓';
        const mergedItems = createMergedItemsView();
        downBtn.disabled = mergedIndex === mergedItems.length - 1;
        downBtn.onclick = (e) => {
            e.stopPropagation();
            moveMergedTouchZoneDown(mergedItem, mergedIndex);
        };
        
        itemActions.appendChild(editBtn);
        itemActions.appendChild(removeBtn);
        itemActions.appendChild(upBtn);
        itemActions.appendChild(downBtn);
        
        // Add click handler for row selection
        itemRow.addEventListener('click', () => {
            selectMergedItem(mergedIndex);
        });
        
        itemRow.appendChild(itemInfo);
        itemRow.appendChild(itemActions);
        
        // Create nested items container
        const nestedContainer = document.createElement('div');
        nestedContainer.className = 'nested-items';
        nestedContainer.style.display = 'none';
        
        // Add touchActionInput if present, or Add button if not
        if (mergedItem.touchActionInput) {
            const nestedRow = createNestedItemRow(mergedItem.touchActionInput, 'touchActionInput');
            nestedContainer.appendChild(nestedRow);
        } else {
            // Show option to add touchActionInput
            const addInputBtn = createAddItemButton('Add touchActionInput', () => 
                addTouchActionInput(mergedItem.touchZone.item.cmdName)
            );
            nestedContainer.appendChild(addInputBtn);
        }
        
        // Add touchActions if present, or Add button if not
        if (mergedItem.touchActions.length > 0) {
            mergedItem.touchActions.forEach(touchAction => {
                const nestedRow = createNestedItemRow(touchAction, 'touchAction');
                nestedContainer.appendChild(nestedRow);
            });
        } else {
            // Show option to add touchAction
            const addActionBtn = createAddItemButton('Add touchAction', () => 
                addTouchAction(mergedItem.touchZone.item.cmdName,mergedItem.touchZone.item.cmd)
            );
            nestedContainer.appendChild(addActionBtn);
        }
        
        // Always add expand/collapse button for touchZones to show Add buttons when no items exist
        const expandBtn = document.createElement('button');
        expandBtn.className = 'btn btn-expand';
        expandBtn.textContent = '▼ Show Details';
        expandBtn.onclick = (e) => {
            e.stopPropagation();
            toggleNestedItems(nestedContainer, expandBtn);
        };
        itemActions.insertBefore(expandBtn, itemActions.firstChild);
        
        itemRow.appendChild(nestedContainer);
    }
    
    // Function to create regular item row
    function createRegularItemRow(itemRow, mergedItem, mergedIndex) {
        const item = mergedItem.item;
        const originalIndex = mergedItem.originalIndex;
        
        itemRow.dataset.index = originalIndex;
        
        // Create item info
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        
        const itemType = document.createElement('div');
        itemType.className = 'item-type';
        itemType.textContent = (item.type || 'Unknown');
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';
        itemDetails.innerHTML = getItemDetailsText(item);
        
        itemInfo.appendChild(itemType);
        itemInfo.appendChild(itemDetails);
        
        // Create action buttons
        const itemActions = document.createElement('div');
        itemActions.className = 'item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-edit';
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editItem(originalIndex);
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-remove';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeItem(originalIndex);
        };
        
        const upBtn = document.createElement('button');
        upBtn.className = 'btn btn-up';
        upBtn.textContent = '↑';
        upBtn.disabled = originalIndex === 0;
        upBtn.onclick = (e) => {
            e.stopPropagation();
            moveItemUp(originalIndex);
        };
        
        const downBtn = document.createElement('button');
        downBtn.className = 'btn btn-down';
        downBtn.textContent = '↓';
        downBtn.disabled = originalIndex === currentDrawingData.items.length - 1;
        downBtn.onclick = (e) => {
            e.stopPropagation();
            moveItemDown(originalIndex);
        };
        
        itemActions.appendChild(editBtn);
        itemActions.appendChild(removeBtn);
        itemActions.appendChild(upBtn);
        itemActions.appendChild(downBtn);
        
        // Add click handler for row selection
        itemRow.addEventListener('click', () => {
            selectItem(originalIndex);
        });
        
        itemRow.appendChild(itemInfo);
        itemRow.appendChild(itemActions);
    }
    
    // Function to create nested item row
    function createNestedItemRow(itemData, type) {
        const nestedRow = document.createElement('div');
        nestedRow.className = 'nested-item-row';
        
        const itemInfo = document.createElement('div');
        itemInfo.className = 'item-info';
        
        const itemType = document.createElement('div');
        itemType.className = 'item-type nested-type';
        itemType.textContent = type;
        
        const itemDetails = document.createElement('div');
        itemDetails.className = 'item-details';
        itemDetails.innerHTML = getItemDetailsText(itemData.item);
        
        itemInfo.appendChild(itemType);
        itemInfo.appendChild(itemDetails);
        
        const itemActions = document.createElement('div');
        itemActions.className = 'item-actions';
        
        const editBtn = document.createElement('button');
        editBtn.className = 'btn btn-edit btn-small';
        editBtn.textContent = 'Edit';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            editItem(itemData.originalIndex);
        };
        
        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn btn-remove btn-small';
        removeBtn.textContent = 'Remove';
        removeBtn.onclick = (e) => {
            e.stopPropagation();
            removeItem(itemData.originalIndex);
        };
        
        itemActions.appendChild(editBtn);
        itemActions.appendChild(removeBtn);
        
        nestedRow.appendChild(itemInfo);
        nestedRow.appendChild(itemActions);
        
        return nestedRow;
    }
    
    // Function to toggle nested items visibility
    function toggleNestedItems(container, button) {
        if (container.style.display === 'none') {
            container.style.display = 'block';
            button.textContent = '▲ Hide Details';
        } else {
            container.style.display = 'none';
            button.textContent = '▼ Show Details';
        }
    }
    
    // Function to select merged item
    function selectMergedItem(mergedIndex) {
        // Update visual selection
        document.querySelectorAll('.item-row').forEach((row, i) => {
            if (i === mergedIndex) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }
    
    // Function to edit merged touchZone
    function editMergedTouchZone(mergedItem) {
        // Edit the touchZone itself, not create a touchAction
        const touchZoneIndex = mergedItem.touchZone.originalIndex;
        editItem(touchZoneIndex);
    }
    
    // Function to remove merged touchZone and all associated items
    function removeMergedTouchZone(mergedItem) {
        const itemsToRemove = [];
        
        // Add touchZone
        itemsToRemove.push(mergedItem.touchZone.originalIndex);
        
        // Add touchActionInput if present
        if (mergedItem.touchActionInput) {
            itemsToRemove.push(mergedItem.touchActionInput.originalIndex);
        }
        
        // Add touchActions
        mergedItem.touchActions.forEach(touchAction => {
            itemsToRemove.push(touchAction.originalIndex);
        });
        
        // Sort indices in descending order to remove from end to avoid index shifting
        itemsToRemove.sort((a, b) => b - a);
        
        const touchZoneCmd = mergedItem.touchZone.item.cmdName;
        const itemCount = itemsToRemove.length;
        
        if (confirm(`Are you sure you want to remove the touchZone "${touchZoneCmd}" and all ${itemCount} associated items?`)) {
            itemsToRemove.forEach(index => {
                currentDrawingData.items.splice(index, 1);
            });
            saveDrawingChanges();
        }
    }
    
    // Function to move merged touchZone group up
    function moveMergedTouchZoneUp(mergedItem, mergedIndex) {
        if (mergedIndex === 0) return;
        
        const mergedItems = createMergedItemsView();
        const targetMergedItem = mergedItems[mergedIndex - 1];
        
        // Move touchZone first, then reposition related items
        moveTouchZoneAndRepositionRelated(mergedItem, targetMergedItem, 'up');
    }
    
    // Function to move merged touchZone group down
    function moveMergedTouchZoneDown(mergedItem, mergedIndex) {
        const mergedItems = createMergedItemsView();
        if (mergedIndex === mergedItems.length - 1) return;
        
        const targetMergedItem = mergedItems[mergedIndex + 1];
        
        // Move touchZone first, then reposition related items
        moveTouchZoneAndRepositionRelated(mergedItem, targetMergedItem, 'down');
    }
    
    // Helper function to get all indices for a merged item
    function getMergedItemIndices(mergedItem) {
        const indices = [];
        
        if (mergedItem.type === 'touchZone') {
            // Add touchZone
            indices.push(mergedItem.touchZone.originalIndex);
            
            // Add touchActionInput if present
            if (mergedItem.touchActionInput) {
                indices.push(mergedItem.touchActionInput.originalIndex);
            }
            
            // Add touchActions
            mergedItem.touchActions.forEach(touchAction => {
                indices.push(touchAction.originalIndex);
            });
        } else {
            // Regular item
            indices.push(mergedItem.originalIndex);
        }
        
        return indices.sort((a, b) => a - b);
    }
    
    // New approach: Move touchZone first, then reposition related items
    function moveTouchZoneAndRepositionRelated(mergedItem, targetMergedItem, direction) {
        const items = [...currentDrawingData.items];
        const touchZoneIndex = mergedItem.touchZone.originalIndex;
        const touchZoneCmd = mergedItem.touchZone.item.cmdName;
        
        console.log(`[TOUCHZONE_MOVE] Moving touchZone with cmdcmdName="${touchZoneCmd}" from index ${touchZoneIndex} ${direction}`);
        
        // Step 1: Move just the touchZone to its new position
        const touchZone = items.splice(touchZoneIndex, 1)[0];
        
        // Calculate target position for touchZone
        let targetPosition;
        if (direction === 'up') {
            if (targetMergedItem.type === 'touchZone') {
                targetPosition = Math.min(targetMergedItem.touchZone.originalIndex);
            } else {
                targetPosition = targetMergedItem.originalIndex;
            }
            // Adjust for removed touchZone if it was before target
            if (touchZoneIndex < targetPosition) {
                targetPosition--;
            }
        } else {
            if (targetMergedItem.type === 'touchZone') {
                const targetIndices = getMergedItemIndices(targetMergedItem);
                targetPosition = Math.max(...targetIndices) + 1;
            } else {
                targetPosition = targetMergedItem.originalIndex + 1;
            }
            // Adjust for removed touchZone if it was before target
            if (touchZoneIndex < targetPosition) {
                targetPosition--;
            }
        }
        
        // Insert touchZone at new position
        items.splice(targetPosition, 0, touchZone);
        console.log(`[TOUCHZONE_MOVE] TouchZone moved to position ${targetPosition}`);
        
        // Step 2: Find and reposition related touchActionInput and touchAction items
        const relatedItems = [];
        const relatedIndices = [];
        
        // Find items with matching 
        for (let i = items.length - 1; i >= 0; i--) {
            const item = items[i];
            if (item.cmdName === touchZoneCmd && item.type !== 'touchZone') {
                if (item.type === 'touchActionInput' || item.type === 'touchAction') {
                    relatedItems.unshift(items.splice(i, 1)[0]); // Add to front to maintain order
                    relatedIndices.unshift(i);
                    console.log(`[TOUCHZONE_MOVE] Found related ${item.type} at index ${i}`);
                }
            }
        }
        
        // Step 3: Insert related items directly after the touchZone
        let insertionIndex = items.findIndex(item => item === touchZone) + 1;
        relatedItems.forEach(item => {
            items.splice(insertionIndex, 0, item);
            console.log(`[TOUCHZONE_MOVE] Inserted ${item.type} at position ${insertionIndex}`);
            insertionIndex++;
        });
        
        console.log(`[TOUCHZONE_MOVE] Final order:`, items.map((item, idx) => `${idx}: ${item.type}${item.cmdName ? `(cmdName=${item.cmdName})` : ''}${item.cmd ? `(cmd=${item.cmd})` : `('')`}${item.idxName ? `(idxName=${item.idxName})` : ''}`));
        
        // Update the drawing data
        currentDrawingData.items = items;
        
        // Refresh the merged items view to ensure UI stays in sync
        updateItemsList();
        
        // Save changes
        saveDrawingChanges();
    }
    
    // Function to get item details text
    function getItemDetailsText(item) {
        const details = [];
        
        if (item.xSize !== undefined && item.ySize !== undefined) {
            details.push(`Size: (${item.xSize}, ${item.ySize})`);
        }
        
        if (item.text) {
            details.push(`Text: "${item.text}"`);
        }
        
        if (item.w !== undefined && item.h !== undefined) {
            details.push(`Size: ${item.w}x${item.h}`);
        }
        
        if (item.color !== undefined) {
            const colorNum = parseInt(item.color) || 0;
            const colorHex = typeof getColorHex !== 'undefined' ? getColorHex(colorNum) : '#000000';
            details.push(`<span style="display:inline-block; width:12px; height:12px; background-color:${colorHex}; border: 1px solid #ccc; margin-right: 3px; vertical-align: middle;"></span>Color ${colorNum}`);
        }
        
        if (item.drawingName) {
            details.push(`Drawing: ${item.drawingName}`);
        }
        
        if (item.indexed && item.idxName) {
            details.push(`idxName: ${item.idxName}`);
        }
        
        // Note: idx is non-visible (used by pfodWeb viewer but not displayed to user)
        
        if (item.cmdName !== undefined) {
            details.push(`cmdName: ${item.cmdName}`);
        }
        // Note: cmd is non-visible (used by pfodWeb viewer but not displayed to user)
        
        if (item.type == 'pushZero') {
          details.push(`(${item.x},${item.y}) scale:${item.scale}`);
        }
        return details.join(' | ') || 'No additional details';
    }
    
    // Function to select an item
    function selectItem(index) {
        selectedItemIndex = index;
        
        // Update visual selection
        document.querySelectorAll('.item-row').forEach((row, i) => {
            if (i === index) {
                row.classList.add('selected');
            } else {
                row.classList.remove('selected');
            }
        });
    }
    
    // Function to edit an item
    function editItem(index) {
        const item = currentDrawingData.items[index];
        
        console.log(`[EDIT_DEBUG] Editing item at index ${index}:`, item);
        console.log(`[EDIT_DEBUG] Item type: "${item.type}" (type: ${typeof item.type})`);
        
        // Special handling for touchActionInput items - use dedicated editor
        if (item.type === 'touchActionInput') {
            console.log(`[EDIT_DEBUG] Routing touchActionInput to touch-action-inputs.html`);
            let url = `/touch-action-inputs.html?drawing=${encodeURIComponent(drawingName)}`;
                url += `&cmdName=${encodeURIComponent(item.cmdName)}`;
            console.log(`[EDIT_DEBUG] Final URL: ${url}`);
            window.location.href = url;
            return;
        }
        
        // Special handling for touchAction items - use dedicated touchAction editor
        if (item.type === 'touchAction') {
            console.log(`[EDIT_DEBUG] Detected touchAction item, routing to touch-actions.html`);
            const tempDrawingName = `${drawingName}_touchAction_edit`;
            let url = `/touch-actions.html?tempDrawing=${encodeURIComponent(tempDrawingName)}`;
                url += `&cmdName=${encodeURIComponent(item.cmdName)}`;
            // Add editIndex to indicate we're editing an existing touchAction
            url += `&editIndex=${index}`;
            console.log(`[EDIT_DEBUG] TouchAction URL: ${url}`);
            window.location.href = url;
            return;
        }
        
        console.log(`[EDIT_DEBUG] Regular item, routing to add-item.html`);
        let url = `/add-item.html?drawing=${encodeURIComponent(drawingName)}&editIndex=${index}`;
        console.log(`[EDIT_DEBUG] Regular item URL: ${url}`);
        
        window.location.href = url;
    }
    
    // Function to remove an item
    function removeItem(index) {
        if (confirm(`Are you sure you want to remove this ${currentDrawingData.items[index].type} item?`)) {
            currentDrawingData.items.splice(index, 1);
            saveDrawingChanges();
        }
    }
    
    // Function to move item up
    function moveItemUp(index) {
        if (index > 0) {
            const items = currentDrawingData.items;
            const currentItem = items[index];
            let targetIndex = index - 1;
            
            // If current item is not a touchZone-related item, we need to skip over touchAction/touchActionInput
            // to avoid getting caught in the merge reorganization
            if (currentItem.type !== 'touchZone' && currentItem.type !== 'touchAction' && currentItem.type !== 'touchActionInput') {
                // Look backwards from current position to find the target insertion point
                while (targetIndex > 0) {
                    const targetItem = items[targetIndex];
                    
                    // If we hit a touchAction or touchActionInput, we need to skip to its touchZone
                    if (targetItem.type === 'touchAction' || targetItem.type === 'touchActionInput') {
                        // Find the touchZone with matching 
                        let touchZoneIndex = -1;
                        for (let i = targetIndex - 1; i >= 0; i--) {
                            if (items[i].type === 'touchZone' && items[i].cmdName === targetItem.cmdName) {
                                touchZoneIndex = i;
                                break;
                            }
                        }
                        
                        if (touchZoneIndex >= 0) {
                            targetIndex = touchZoneIndex;
                        } else {
                            // No matching touchZone found, just move up one position
                            break;
                        }
                    } else {
                        // This is a regular item or touchZone, safe to place here
                        break;
                    }
                }
            }
            
            // Remove current item and insert at target position
            const itemToMove = items.splice(index, 1)[0];
            items.splice(targetIndex, 0, itemToMove);
            
            // Update selected index if needed
            if (selectedItemIndex === index) {
                selectedItemIndex = targetIndex;
            } else if (selectedItemIndex >= targetIndex && selectedItemIndex < index) {
                selectedItemIndex = selectedItemIndex + 1;
            }
            
            saveDrawingChanges();
        }
    }
    
    // Function to move item down
    function moveItemDown(index) {
        if (index < currentDrawingData.items.length - 1) {
            const items = currentDrawingData.items;
            [items[index], items[index + 1]] = [items[index + 1], items[index]];
            
            // Update selected index if needed
            if (selectedItemIndex === index) {
                selectedItemIndex = index + 1;
            } else if (selectedItemIndex === index + 1) {
                selectedItemIndex = index;
            }
            
            saveDrawingChanges();
        }
    }
    
    // Function to save drawing changes
    function saveDrawingChanges() {
      console.log(`saveDrawingChanges `, JSON.stringify(currentDrawingData,null,2));
        fetch('/api/drawings/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(currentDrawingData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Drawing updated successfully');
                // Reload the data to reflect changes
                loadDrawingData();
                
                // Trigger iframe refresh to show updated drawing
                setTimeout(() => {
                    updatePreview();
                }, 200);
            } else {
                throw new Error(result.error || 'Failed to update drawing');
            }
        })
        .catch(error => {
            console.error('Error saving drawing changes:', error);
            alert(`Failed to save changes: ${error.message}`);
            // Reload the original data
            loadDrawingData();
        });
    }
    
    // Function to update the preview iframe
    function updatePreview() {
        if (!drawingName) return;
        
        // Trigger restart in existing iframe instead of reloading
        safelyCallInitializeApp(previewIframe);
    }

    // Canvas editing functions
    function showCanvasEditForm() {
        if (!currentDrawingData) {
            alert('No drawing data loaded');
            return;
        }

        // Create temporary copy for canvas editing using existing temp system
        fetch(`/api/drawings/${encodeURIComponent(drawingName)}/temp-copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                mode: 'canvas_edit'
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to create temporary copy: ${response.status}`);
            }
            return response.json();
        }).then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to create temporary copy');
            }
            
            const tempDrawingName = data.tempName;
            console.log(`Created temporary copy for canvas editing: ${tempDrawingName}`);
            
            // Redirect to edit-canvas.html with the temp drawing name as parameter
            window.location.href = `/edit-canvas.html?drawing=${encodeURIComponent(tempDrawingName)}&original=${encodeURIComponent(drawingName)}`;
            
        }).catch(error => {
            console.error(`Error creating temporary copy: ${error}`);
            alert('Failed to create temporary copy for canvas editing. Please try again.');
        });
    }

    function hideCanvasEditForm() {
        // Remove event listeners to prevent memory leaks
        canvasWidthInput.removeEventListener('input', updateCanvasPreview);
        canvasHeightInput.removeEventListener('input', updateCanvasPreview);
        canvasBgColorInput.removeEventListener('change', updateCanvasPreview);
        canvasRefreshInput.removeEventListener('input', updateCanvasPreview);
        
        // Cancel temporary drawing if it exists
        if (tempCanvasDrawingName) {
            fetch(`/api/drawings/${tempCanvasDrawingName}/cancel`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(() => {
                console.log('Cancelled canvas editing temporary drawing');
                tempCanvasDrawingName = null;
                originalRefreshRate = null;
                editingRefreshRate = null;
                // Restore original preview
                updatePreview();
            })
            .catch(error => {
                console.error('Error cancelling temporary drawing:', error);
                tempCanvasDrawingName = null;
                originalRefreshRate = null;
                editingRefreshRate = null;
                // Still restore original preview
                updatePreview();
            });
        }
        
        // Hide edit form and show info display
        canvasEditForm.style.display = 'none';
        document.querySelector('.drawing-info').style.display = 'block';
    }

    function updateCanvasPreview() {
        if (!tempCanvasDrawingName) return;
        
        // Get current form values
        const width = parseInt(canvasWidthInput.value) || 50;
        const height = parseInt(canvasHeightInput.value) || 50;
        const color = isNaN(parseInt(canvasBgColorInput.value)) ? 15 : parseInt(canvasBgColorInput.value);
        const refreshSeconds = parseInt(canvasRefreshInput.value) || 0;
        
        // Validate values
        if (width < 1 || width > 255 || height < 1 || height > 255 || 
            color < 0 || color > 255 || refreshSeconds < 0 || refreshSeconds > 3600) {
            return; // Don't update preview with invalid values
        }
        
        // Convert seconds to milliseconds and track for later
        const refreshMs = refreshSeconds === 0 ? 0 : Math.max(refreshSeconds * 1000, 1000);
        editingRefreshRate = refreshMs; // Track user's refresh changes
        
        console.log(`Tracking refresh change: ${refreshSeconds}s (${refreshMs}ms)`);
        
        // Update the temporary drawing's canvas properties (excluding refresh - always 0 during editing)
        fetch(`/api/drawings/${tempCanvasDrawingName}/update-canvas`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                x: width,
                y: height,
                color: color
                // No refresh - temp drawing always has refresh=0 during editing
            })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Updated canvas preview properties');
                // Trigger restart in existing iframe instead of reloading
                safelyCallInitializeApp(previewIframe);
            } else {
                console.error('Error updating canvas preview:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating canvas preview:', error);
        });
    }

    function saveCanvasProperties() {
        if (!tempCanvasDrawingName) {
            alert('No temporary drawing available');
            return;
        }

        // Validate inputs
        const width = parseInt(canvasWidthInput.value);
        const height = parseInt(canvasHeightInput.value);
        const color = isNaN(parseInt(canvasBgColorInput.value)) ? 15 : parseInt(canvasBgColorInput.value);
        const refreshSeconds = parseInt(canvasRefreshInput.value);

        if (width < 1 || width > 255) {
            alert('Width must be between 1 and 255');
            return;
        }

        if (height < 1 || height > 255) {
            alert('Height must be between 1 and 255');
            return;
        }

        if (color < 0 || color > 255) {
            alert('Color must be between 0 and 255');
            return;
        }

        if (refreshSeconds < 0 || refreshSeconds > 3600) {
            alert('Refresh rate must be 0 (no refresh) or between 1 and 3600 seconds');
            return;
        }

        // Additional validation: if not 0, must be at least 1
        if (refreshSeconds > 0 && refreshSeconds < 1) {
            alert('Refresh rate must be 0 (no refresh) or at least 1 second');
            return;
        }

        // Convert seconds to milliseconds
        const refreshMs = refreshSeconds === 0 ? 0 : refreshSeconds * 1000;

        console.log('Saving canvas properties:', {
            width, height, color, refreshSeconds, refreshMs
        });

        // First, update the main drawing's refresh rate with the user's choice
        fetch(`/api/drawings/${encodeURIComponent(drawingName)}/update-refresh`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                refresh: refreshMs
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to update main drawing refresh rate');
            }
            console.log(`Updated main drawing refresh rate to ${refreshMs}ms`);
            
            // Then accept changes from temporary drawing to original (excluding refresh)
            return fetch(`/api/drawings/${tempCanvasDrawingName}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Canvas properties updated successfully');
                tempCanvasDrawingName = null;
                originalRefreshRate = null;
                editingRefreshRate = null;
                
                // Remove event listeners
                canvasWidthInput.removeEventListener('input', updateCanvasPreview);
                canvasHeightInput.removeEventListener('input', updateCanvasPreview);
                canvasBgColorInput.removeEventListener('change', updateCanvasPreview);
                canvasRefreshInput.removeEventListener('input', updateCanvasPreview);
                
                // Hide edit form and show info display
                canvasEditForm.style.display = 'none';
                document.querySelector('.drawing-info').style.display = 'block';
                
                // Reload the data to reflect changes (but don't update iframe preview)
                Promise.all([
                    // Get drawing metadata
                    fetch(`/api/drawings/${drawingName}`).then(response => response.json()),
                    // Get drawing items
                    fetch(`/${drawingName}`, {
                        headers: {
                            'Accept': 'application/json',
                            'X-Requested-With': 'XMLHttpRequest'
                        }
                    }).then(response => response.json())
                ])
                .then(([metadata, drawingData]) => {
                    console.log("Loaded drawing metadata:", metadata);
                    console.log("Loaded drawing data:", drawingData);
                    
                    currentDrawingData = drawingData;
                    
                    // Update drawing info
                    drawingNameDisplay.textContent = drawingName;
                    canvasSizeDisplay.textContent = `${drawingData.x || metadata.canvasWidth} x ${drawingData.y || metadata.canvasHeight}`;
                    const canvasColorNum = parseInt(drawingData.color) || 0;
                    const canvasColorHex = typeof getColorHex !== 'undefined' ? getColorHex(canvasColorNum) : '#000000';
                    canvasColorDisplay.innerHTML = `<span style="display:inline-block; width:14px; height:14px; background-color:${canvasColorHex}; border: 1px solid #ccc; margin-right: 5px;"></span>Color ${canvasColorNum}`;
                    refreshRateDisplay.textContent = drawingData.refresh === 0 ? 'No auto-refresh' : `${drawingData.refresh}ms`;
                    totalItemsDisplay.textContent = drawingData.items ? drawingData.items.length : 0;
                    
                    // Update items list
                    updateItemsList();
                    
                    // DON'T update preview iframe - let it keep old version to force start response
                    console.log('Canvas properties updated - iframe will keep old version to get fresh data');
                })
                .catch(error => {
                    console.error("Error loading drawing data:", error);
                    alert(`Failed to load drawing data: ${error.message}`);
                });
            } else {
                throw new Error(result.error || 'Failed to save canvas properties');
            }
        })
        .catch(error => {
            console.error('Error saving canvas properties:', error);
            alert(`Failed to save canvas properties: ${error.message}`);
        });
    }

    // Function to create add item button
    function createAddItemButton(text, onclick) {
        const element = document.createElement('div');
        element.className = 'nested-item-row';
        element.style.border = '2px dashed #ccc';
        element.style.backgroundColor = '#fafafa';
        element.style.marginBottom = '5px';
        
        const button = document.createElement('button');
        button.className = 'btn btn-add';
        button.textContent = text;
        button.style.width = '100%';
        button.onclick = onclick;
        
        element.appendChild(button);
        return element;
    }

    // Function to add touchAction - navigate to dedicated touch-actions page
    function addTouchAction(cmdName,cmd) {
        const tempDrawingName = `${drawingName}_touchAction_edit`;
        let url = `/touch-actions.html?tempDrawing=${encodeURIComponent(tempDrawingName)}&cmd=${encodeURIComponent(cmd)}`;
        url += `&cmdName=${encodeURIComponent(cmdName)}`;
        window.location.href = url;
    }

    // Function to add touchActionInput - navigate to dedicated touch-action-inputs page
    function addTouchActionInput(cmdName) {
        let url = `/touch-action-inputs.html?drawing=${encodeURIComponent(drawingName)}`;
        url += `&cmdName=${encodeURIComponent(cmdName)}`;
        window.location.href = url;
    }
    
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
            alert(`Error saving drawing: ${error.message}`);
        }
    }
    
    // Auto Save functionality
    function toggleAutoSave() {
        autoSaveEnabled = !autoSaveEnabled;
        localStorage.setItem('autoSaveEnabled', autoSaveEnabled.toString());
        updateAutoSaveButton();
        console.log(`Auto Save ${autoSaveEnabled ? 'enabled' : 'disabled'}`);
    }
    
    function updateAutoSaveButton() {
        autoSaveBtn.textContent = autoSaveEnabled ? 'Auto Save is On' : 'Auto Save is Off';
        autoSaveBtn.className = autoSaveEnabled ? 'btn btn-primary' : 'btn btn-secondary';
    }
    
    function autoSaveIfEnabled() {
        if (autoSaveEnabled) {
            console.log('Auto Save triggered - saving drawing as JSON');
            saveDrawingAsJson(drawingName);
        }
    }
    
    // Override the original fetch function to add auto save hooks
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url, options] = args;
        
        // Check if this is a server change that should trigger auto save
        const shouldAutoSave = autoSaveEnabled && (
            // Canvas changes acceptance
            (typeof url === 'string' && url.includes('/accept')) ||
            // Drawing changes from this page
            (typeof url === 'string' && url.includes('/api/drawings/import') && options?.method === 'POST') ||
            // Canvas property updates
            (typeof url === 'string' && url.includes('/update-canvas') && options?.method === 'POST') ||
            // Refresh rate updates
            (typeof url === 'string' && url.includes('/update-refresh') && options?.method === 'POST')
        );
        
        const result = originalFetch.apply(this, args);
        
        // If this was a change operation and auto save is enabled, trigger save after successful response
        if (shouldAutoSave) {
            result.then(response => {
                if (response.ok) {
                    // Delay slightly to ensure server has processed the change
                    setTimeout(() => {
                        autoSaveIfEnabled();
                    }, 500);
                }
            }).catch(() => {
                // Ignore fetch errors for auto save purposes
            });
        }
        
        return result;
    };
});