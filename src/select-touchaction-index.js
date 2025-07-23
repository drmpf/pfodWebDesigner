/*   
   select-touchaction-index.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Select TouchAction Index Page Script

document.addEventListener('DOMContentLoaded', () => {
    console.log("Select TouchAction index page loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const tempDrawingName = params.get('tempDrawing');
    const cmdName = params.get('cmdName');
    
    if (!tempDrawingName || !cmdName) {
        alert('Missing required parameters: tempDrawing and cmdName');
        window.close();
        return;
    }
    
    // DOM Elements
    const itemsList = document.getElementById('items-list');
    const backBtn = document.getElementById('back-btn');
    const previewIframe = document.getElementById('preview-iframe');
    
    // Variables
    let drawingData = null;
    let tempDrawingData = null; // current edit values
    let originalPreviewDrawingName = null;
    
    // Event Listeners
    backBtn.addEventListener('click', () => {
        // Return to touch actions manager
        let url = `/touch-actions.html?tempDrawing=${encodeURIComponent(tempDrawingName)}`;
        url += `&cmdName=${encodeURIComponent(cmdName)}`;
        window.location.href = url;
    });
    
    // Initialize
    updatePageTitle();
    loadAvailableIndexedItems();
    initializePreview();
    
    // Function to update page title with touchZone cmdName
    function updatePageTitle() {
        const pageTitle = document.getElementById('page-title');
        
        const displayName = cmdName;
        if (pageTitle && displayName) {
            pageTitle.textContent = `Select Idx for touchAction Item for touchZone ${displayName}`;
        }
        
        // Update document title
        if (displayName) {
            document.title = `Select Idx for touchAction Item for touchZone ${displayName}`;
        }
    }
    
    // Function to load available indexed items from the drawing
    function loadAvailableIndexedItems() {
        console.log(`Loading indexed items from original drawing for tempDrawing: ${tempDrawingName}`);
        
        // Get the original drawing name (remove _touchAction_edit suffix)
        const originalDrawingName = tempDrawingName.replace('_touchAction_edit', '');
        
        // Fetch the original drawing data to get all indexed items
        fetch(`/${originalDrawingName}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Loaded original drawing data:", JSON.stringify(data,null,2));
            drawingData = data;
            
            // Fetch the temp drawing data to get all indexed items
            fetch(`/${tempDrawingName}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            })
            .then(response => response.json())
            .then(data => {
                console.log(`Loaded ${tempDrawingName} drawing data:`, JSON.stringify(data,null,2));
                tempDrawingData = data;
                displayIndexedItems();
            })
            .catch(error => {
                console.error("Error loading temp drawing data:", error);
                itemsList.innerHTML = '<div class="no-items">Error loading indexed items</div>';
            });
        })
        .catch(error => {
            console.error("Error loading original drawing data:", error);
            itemsList.innerHTML = '<div class="no-items">Error loading indexed items</div>';
        });
    }
    
    // Function to display indexed items
    function displayIndexedItems() {
        if (!drawingData || !drawingData.items || drawingData.items.length === 0) {
            itemsList.innerHTML = '<div class="no-items">No items found in drawing</div>';
            return;
        }
        
        // Get all touchAction items for the current cmdName to find which indices are already used
        const existingTouchActionIndices = new Set();
        drawingData.items.forEach(item => {
            if (item.type === 'touchAction' && item.cmdName === cmdName && item.action) {
                item.action.forEach(actionItem => {
                    if (actionItem.idxName !== undefined && actionItem.idxName.trim() !== '') {
                        existingTouchActionIndices.add(actionItem.idxName);
                    }
                });
            }
        });
        
        console.log(`Found existing touchAction indices for cmdName "${cmdName}":`, Array.from(existingTouchActionIndices));
        let tempDwgIndexedItems = []
        if (tempDrawingData) {
         // console.log(`displayIndexedItems tempDrawingData :`, JSON.stringify(tempDrawingData,null,2));
          tempDrawingData.items.forEach(item => {
            if (item.type === 'touchAction' && item.cmdName === cmdName && item.action) {
                item.action.forEach(actionItem => {
                    if (actionItem.idxName !== undefined && actionItem.idxName.trim() !== '') {
                        existingTouchActionIndices.add(actionItem.idxName);
                    }
                });
            }
          });
        }
        // Get all items that have an idx property (indexed items)
        const indexedItems = [];
        const otherItems = [];
        
        drawingData.items.forEach((item, globalIndex) => {
            if (item.idxName !== undefined && item.idxName.trim() !== '') {
                const itemIdxName = item.idxName;
                
                // Only include items that don't already have a touchAction for this cmdName
                if (!existingTouchActionIndices.has(itemIdxName)) {
                    indexedItems.push({
                        item: item,
                        globalIndex: globalIndex, // row index
                        idxName: itemIdxName,
                        idx: item.idx
                    });
                   console.log(`Found unused `, JSON.stringify(item));
                }
            } else {
                otherItems.push({
                    item: item,
                    globalIndex: globalIndex, // row index
                    idx: item.idx
                });
            }
        });
        
        // Sort indexed items by their idx value
        indexedItems.sort((a, b) => a.idx - b.idx);
        
        itemsList.innerHTML = '';
        
        if (indexedItems.length === 0) {
            // No available indexed items found (either none exist or all already have touchActions for this cmdName)
            const totalIndexedItems = drawingData.items.filter(item => 
                item.idx !== undefined && item.idx !== null && item.idx !== ''
            ).length;
            
            if (totalIndexedItems === 0) {
                itemsList.innerHTML = '<div class="no-items">No indexed items found in this drawing</div>';
            } else {
                itemsList.innerHTML = `<div class="no-items">All indexed items already have touchAction items for touchZone cmdName "${cmdName}"</div>`;
            }
            return;
        } else {
            // Show indexed items with replace options
            const headerDiv = document.createElement('div');
            headerDiv.className = 'section-header';
            headerDiv.textContent = `Available Indexed Items for TouchZone "${cmdName}" (select an item to replace when touched)`;
            itemsList.appendChild(headerDiv);
            
            indexedItems.forEach((indexedItem) => {
                const itemElement = createIndexedItemElement(indexedItem);
                itemsList.appendChild(itemElement);
            });
        }
    }
    
    // Function to create indexed item element with replace button
    function createIndexedItemElement(indexedItem) {
        const element = document.createElement('div');
        element.className = 'item-row';
        
        // Item index name (display idxName instead of raw idx)
        const indexDiv = document.createElement('div');
        indexDiv.className = 'item-index';
        indexDiv.textContent = indexedItem.item.idxName;
        
        // Item type
        const typeDiv = document.createElement('div');
        typeDiv.className = 'item-type';
        typeDiv.textContent = indexedItem.item.type || 'unknown';
        
        // Item details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'item-details';
        detailsDiv.textContent = getItemDetails(indexedItem.item);
        
        // Replace button
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'item-actions';
        
        const showBtn = document.createElement('button');
        showBtn.className = 'btn btn-show';
        showBtn.textContent = 'Show';
        showBtn.onmousedown = (e) => {
            console.log(`[SHOW_BUTTON] mousedown event on idx ${indexedItem.idx}`);
            e.preventDefault();
            hideItemInPreview(indexedItem.idx);
        };
        showBtn.onmouseup = (e) => {
            console.log(`[SHOW_BUTTON] mouseup event on idx ${indexedItem.idx}`);
            e.preventDefault();
            restorePreview();
        };
        
        const replaceBtn = document.createElement('button');
        replaceBtn.className = 'btn btn-replace';
        replaceBtn.textContent = 'Replace on Touch';
        replaceBtn.onclick = () => proceedToItemSelection(indexedItem.idx, 'replace');
        
        actionsDiv.appendChild(showBtn);
        actionsDiv.appendChild(replaceBtn);
        
        element.appendChild(indexDiv);
        element.appendChild(typeDiv);
      //  element.appendChild(detailsDiv);
        element.appendChild(actionsDiv);
        
        return element;
    }
    
    
    // Function to get item details for display
    function getItemDetails(item) {
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
                return `Label: "${item.text || ''}" at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'value':
                return `Value: "${item.text || ''}" = ${item.intValue || 0}`;
            case 'insertDwg':
                return `Insert: "${item.drawingName || ''}" at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'hide':
                return `Hide: idx ${item.idx || 0}`;
            case 'unhide':
                return `Unhide: idx ${item.idx || 0}`;
            case 'touchZone':
                return `TouchZone: cmdName "${item.cmdcmdName}" at (${item.xOffset || 0}, ${item.yOffset || 0})`;
            case 'touchAction':
                return `TouchAction: cmdcmdName "${item.cmdcmdName}" with ${item.action ? item.action.length : 0} actions`;
            case 'touchActionInput':
                return `TouchActionInput: cmdcmdName "${item.cmdcmdName}"`;
            default:
                return `${item.type}: ${JSON.stringify(item).substring(0, 50)}...`;
        }
    }
    
    // Function to proceed to item selection with chosen index
    function proceedToItemSelection(selectedIdx, mode) {
        console.log(`Proceeding to item selection with index ${selectedIdx}, mode: ${mode}`);
        
        // Find the selected item to get its idxName
        const selectedItem = drawingData.items.find(item => 
            item.idx !== undefined && item.idx !== null && item.idx !== '' && parseInt(item.idx) === selectedIdx
        );
        
        const selectedIdxName = selectedItem.idxName;
        const actualIdx = selectedItem.idx;
        
        // Navigate to add-touchAction-item.html with the selected index and idxName
        let url = `/add-touchAction-item.html?tempDrawing=${encodeURIComponent(tempDrawingName)}&mode=touchAction&selectedIdx=${actualIdx}&selectedIdxName=${encodeURIComponent(selectedIdxName)}&selectionMode=${mode}`;
        url += `&cmdName=${encodeURIComponent(cmdName)}`;
       
        window.location.href = url;
    }
    
    // Function to initialize preview iframe
    function initializePreview() {
        // Get the original drawing name (remove _touchAction_edit suffix)
        const originalDrawingName = tempDrawingName.replace('_touchAction_edit', '');
        originalPreviewDrawingName = originalDrawingName;
        
        // Create initial filtered preview on server
        fetch(`/api/drawings/${encodeURIComponent(originalDrawingName)}/create-initial-preview`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Set up the preview iframe to show the filtered preview (no auto-refresh, no touchActionInputs)
                setupPreviewIframeWithDrawing(previewIframe, data.previewDrawingName, true);
                console.log(`Initialized preview iframe with filtered preview: ${data.previewDrawingName}`);
            } else {
                console.error('Error creating initial preview:', data.error);
                // Fallback to original drawing
                setupPreviewIframeWithDrawing(previewIframe, originalDrawingName, true);
            }
        })
        .catch(error => {
            console.error('Error creating initial preview:', error);
            // Fallback to original drawing
            setupPreviewIframeWithDrawing(previewIframe, originalDrawingName, true);
        });
    }
    
    // Function to hide specific item in preview
    function hideItemInPreview(itemIdx) {
        console.log(`[SHOW_BUTTON] Hiding item idx ${itemIdx} in preview`);
        
        // Call server endpoint to temporarily hide the item
        fetch(`/api/drawings/${encodeURIComponent(originalPreviewDrawingName)}/preview-hide-item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ idx: itemIdx })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log(`[SHOW_BUTTON] Item hidden on server side, refreshing iframe for update`);
                // Trigger restart in existing iframe instead of reloading
                safelyCallInitializeApp(previewIframe);
            } else {
                console.error('Error hiding item in preview:', data.error);
            }
        })
        .catch(error => {
            console.error('Error hiding item in preview:', error);
        });
    }
    
    // Function to restore original preview
    function restorePreview() {
        console.log('[SHOW_BUTTON] Restoring original preview');
        
        // Call server endpoint to restore the original preview
        fetch(`/api/drawings/${encodeURIComponent(originalPreviewDrawingName)}/preview-restore`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('[SHOW_BUTTON] Preview restored on server side, refreshing iframe for update');
                // Trigger restart in existing iframe instead of reloading
                safelyCallInitializeApp(previewIframe);
            } else {
                console.error('Error restoring preview:', data.error);
            }
        })
        .catch(error => {
            console.error('Error restoring preview:', error);
        });
    }
});