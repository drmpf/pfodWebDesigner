/*   
   add-touchAction-item.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Add Item Page Script

document.addEventListener('DOMContentLoaded', () => {
    console.log("Add item page loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const drawingName = params.get('tempDrawing'); // Use tempDrawing for touchAction editing
    const editIndex = params.get('editIndex'); // Index of item to edit
    const editingActionItem = params.get('editingActionItem') === 'true'; // true if editing action item
    const actionIndex = params.get('actionIndex'); // Index of action item to edit
    const selectedIdx = params.get('selectedIdx'); // Index selected from step 1 (for new items)
    const selectedIdxName = params.get('selectedIdxName'); // IdxName selected from step 1 (for new items)
    const selectionMode = params.get('selectionMode'); // 'add' or 'replace' mode from step 1
    
    if (!drawingName) {
        alert('No drawing specified');
        window.close();
        return;
    }
    
    // DOM Elements
    const itemTypeDropdown = document.getElementById('item-type');
    const lineProperties = document.getElementById('line-properties');
    const rectangleProperties = document.getElementById('rectangle-properties');
    const hideProperties = document.getElementById('hide-properties');
    const unhideProperties = document.getElementById('unhide-properties');
    const labelProperties = document.getElementById('label-properties');
    const valueProperties = document.getElementById('value-properties');
    const circleProperties = document.getElementById('circle-properties');
    const arcProperties = document.getElementById('arc-properties');
    const addItemBtn = document.getElementById('add-item-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const previewIframe = document.getElementById('preview-iframe');
    

    const lineX = document.getElementById('line-x');
    const lineY = document.getElementById('line-y');
    const lineXOffset = document.getElementById('line-xoffset');
    const lineYOffset = document.getElementById('line-yoffset');
    const rectXOffset = document.getElementById('rect-xoffset');
    const rectYOffset = document.getElementById('rect-yoffset');
    const rectWidth = document.getElementById('rect-width');
    const rectHeight = document.getElementById('rect-height');
    const rectStyle = document.getElementById('rect-style');
    const rectCentered = document.getElementById('rect-centered');
    const rectCorners = document.getElementById('rect-corners');
    const labelXOffset = document.getElementById('label-xoffset');
    const labelYOffset = document.getElementById('label-yoffset');
    const labelText = document.getElementById('label-text');
    const labelFontSize = document.getElementById('label-fontsize');
    const labelAlign = document.getElementById('label-align');
    const labelBold = document.getElementById('label-bold');
    const labelItalic = document.getElementById('label-italic');
    const labelUnderline = document.getElementById('label-underline');
    const labelValue = document.getElementById('label-value');
    const labelDecimals = document.getElementById('label-decimals');
    const labelUnits = document.getElementById('label-units');
    const valueXOffset = document.getElementById('value-xoffset');
    const valueYOffset = document.getElementById('value-yoffset');
    const valueText = document.getElementById('value-text');
    const valueFontSize = document.getElementById('value-fontsize');
    const valueAlign = document.getElementById('value-align');
    const valueBold = document.getElementById('value-bold');
    const valueItalic = document.getElementById('value-italic');
    const valueUnderline = document.getElementById('value-underline');
    const valueIntValue = document.getElementById('value-intvalue');
    const valueMin = document.getElementById('value-min');
    const valueMax = document.getElementById('value-max');
    const valueDisplayMin = document.getElementById('value-displaymin');
    const valueDisplayMax = document.getElementById('value-displaymax');
    const valueDecimals = document.getElementById('value-decimals');
    const valueUnits = document.getElementById('value-units');
    
    // Circle form elements
    const circleXOffset = document.getElementById('circle-xoffset');
    const circleYOffset = document.getElementById('circle-yoffset');
    const circleRadius = document.getElementById('circle-radius');
    const circleFilled = document.getElementById('circle-filled');
    
    // Arc form elements
    const arcXOffset = document.getElementById('arc-xoffset');
    const arcYOffset = document.getElementById('arc-yoffset');
    const arcRadius = document.getElementById('arc-radius');
    const arcStart = document.getElementById('arc-start');
    const arcAngle = document.getElementById('arc-angle');
    const arcFilled = document.getElementById('arc-filled');
    
    const itemColor = document.getElementById('item-color');
    const itemIdx = document.getElementById('item-idx');
    
    // Initialize color picker for item color
    if (typeof createColorPicker !== 'undefined') {
        createColorPicker('item-color-picker', 'item-color', 0);
    }
    
    // Edit mode variables (moved up to avoid initialization errors)
    let isEditMode = editIndex !== null && editIndex !== undefined && editIndex !== '';
    let editingItem = null;
    
    // Index selection mode variables (for new two-step flow)
    let hasSelectedIndex = selectedIdx !== null && selectedIdx !== undefined && selectedIdx !== '';
    let lockedIndex = hasSelectedIndex ? parseInt(selectedIdx) : null;
    let lockedIndexName = hasSelectedIndex ? selectedIdxName : null;
    
    console.log(`[INDEX_DEBUG] selectedIdx: "${selectedIdx}", selectedIdxName: "${selectedIdxName}"`);
    console.log(`[INDEX_DEBUG] hasSelectedIndex: ${hasSelectedIndex}, lockedIndex: ${lockedIndex}, lockedIndexName: "${lockedIndexName}"`);
    
    console.log(`[EDIT_MODE_DEBUG] editIndex: "${editIndex}", isEditMode: ${isEditMode}`);
    let itemEditDrawingName = null; // Item edit temporary drawing name (xx_touchAction_item_edit)
    let itemEditPreviewDrawingName = null; // Item edit preview drawing name (xx_touchAction_item_edit_preview)
    let touchActionEditDrawingName = null; // TouchAction edit drawing name (xx_touchAction_edit)
    let drawingData = null; // Drawing data
    let canvasWidth = 50; // Canvas width 
    let canvasHeight = 50; // Canvas height
    
    
    
    // Function to initialize the server with the drawing name and set up the iframe
    const initializeDrawingAndIframe = () => {
        console.log(`Initializing for touchAction item editing: ${drawingName}`);
        
        // drawingName is the touchAction edit drawing (xx_touchAction_edit)
        touchActionEditDrawingName = drawingName;
        
        // Create the item edit temp drawing name
        itemEditDrawingName = drawingName.replace('_touchAction_edit', '_touchAction_item_edit');
        
        // Create the preview drawing name (shows full context with item being edited)
        itemEditPreviewDrawingName = itemEditDrawingName + '_preview';
        
        console.log(`TouchAction edit drawing: ${touchActionEditDrawingName}`);
        console.log(`Item edit temp drawing: ${itemEditDrawingName}`);
        console.log(`Item edit preview drawing: ${itemEditPreviewDrawingName}`);
        
        // Set up iframe with the item edit temp drawing
        setupIframeWithTempDrawing();
    };
    
    // Helper function to set up iframe with temp drawing
    function setupIframeWithTempDrawing() {
        // Create the touchAction item temp drawings using the new endpoint
        console.log(`Creating touchAction item temp drawings from: ${touchActionEditDrawingName}`);
        
        fetch(`/api/touchaction-item/${encodeURIComponent(touchActionEditDrawingName)}/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                editIndex: editIndex
            })
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to create touchAction item temp drawings: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to create touchAction item temp drawings');
            }
            
            console.log(`Created touchAction item temp drawings successfully`);
            console.log(`Item edit drawing: ${data.itemEditDrawing}`);
            console.log(`Preview drawing: ${data.previewDrawing}`);
            
            // Update the drawing names with the server response
            itemEditDrawingName = data.itemEditDrawing;
            itemEditPreviewDrawingName = data.previewDrawing;
            
            // Set refresh to 0 for the item edit temp drawing
            console.log(`Calling set-refresh-zero for item edit drawing: ${itemEditDrawingName}`);
            
            return fetch(`/api/drawings/${encodeURIComponent(itemEditDrawingName)}/set-refresh-zero`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            console.log(`set-refresh-zero response status: ${response.status}`);
            if (!response.ok) {
                throw new Error(`Failed to disable refresh: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('set-refresh-zero response data:', data);
            if (!data.success) {
                throw new Error(data.error || 'Failed to disable refresh on item edit temp drawing');
            }
            console.log('Disabled refresh on item edit temp drawing');
            
            // Set up the iframe source to use the item edit preview drawing for full context
            setupPreviewIframeWithDrawing(previewIframe, itemEditPreviewDrawingName);
        }).catch(error => {
            console.error(`Error in set-refresh-zero: ${error}`);
            alert('Failed to disable refresh. Preview may not work correctly.');
        });
        }).catch(error => {
            console.error(`Error setting up iframe: ${error}`);
            alert('Failed to set up preview. Please try again.');
        });
    }
    
    // Start the initialization process
    initializeDrawingAndIframe();
    
    
    // Fetch drawing information to get canvas size
    fetchDrawingInfo();
    
    // If in edit mode, load the item being edited
    if (isEditMode) {
        loadEditingItem();
    }
    
    // Set up event listeners
    itemTypeDropdown.addEventListener('change', handleItemTypeChange);
    addItemBtn.addEventListener('click', addItem);
    cancelBtn.addEventListener('click', cancel);
    
    
    // Helper function to generate final text for Label and Value items (same logic as pfodWebMouse)
    function generateItemDisplayText(item) {
        if (item.type === 'label') {
            // Label text generation: text + formatted value + units (if value exists)
            let text = item.text || '';
            if (item.value !== undefined && item.value !== null && item.value !== '') {
                const decimals = (item.decimals !== undefined && item.decimals !== null) ? parseInt(item.decimals) : 2;
                const units = item.units || '';
                const formattedValue = parseFloat(item.value).toFixed(decimals);
                text = text + formattedValue + units;
            }
            return text;
        } else if (item.type === 'value') {
            // Value text generation: text + scaled/formatted intValue + units
            const textPrefix = item.text || '';
            const intValue = parseFloat(item.intValue || 0);
            const max = parseFloat(item.max || 1);
            const min = parseFloat(item.min || 0);
            const displayMax = parseFloat(item.displayMax || 1.0);
            const displayMin = parseFloat(item.displayMin || 0.0);
            const decimals = (item.decimals !== undefined && item.decimals !== null) ? parseInt(item.decimals) : 2;
            const units = item.units || '';
            
            // Scale the value (same logic as pfodWebMouse)
            let maxMin = max - min;
            if (maxMin === 0) maxMin = 1;  // Prevent division by zero
            const scaledValue = (intValue - min) * (displayMax - displayMin) / maxMin + displayMin;
            
            // Format and combine
            const formattedValue = scaledValue.toFixed(decimals);
            const displayText = textPrefix + formattedValue + units;
            
            return displayText;
        } else {
            // For other item types, just return the basic text
            return item.text || item.textFormat || '';
        }
    }

    
    // Add event listeners for all form inputs to update the preview
    [lineX, lineY, lineXOffset, lineYOffset, rectXOffset, rectYOffset, 
     rectWidth, rectHeight, rectStyle, rectCentered, rectCorners,
     labelXOffset, labelYOffset, labelText, labelFontSize, labelAlign, labelBold, labelItalic, labelUnderline, labelValue, labelDecimals, labelUnits,
     valueXOffset, valueYOffset, valueText, valueFontSize, valueAlign, valueBold, valueItalic, valueUnderline,
     valueIntValue, valueMin, valueMax, valueDisplayMin, valueDisplayMax, valueDecimals, valueUnits,
     circleXOffset, circleYOffset, circleRadius, circleFilled,
     arcXOffset, arcYOffset, arcRadius, arcStart, arcAngle, arcFilled,
     itemColor, itemIdx,
     document.getElementById('hide-idx'), document.getElementById('unhide-idx')]
    .forEach(input => {
        if (input) {
            input.addEventListener('input', updatePreview);
            input.addEventListener('change', updatePreview);
        }
    });
    
    // Add event listeners for offset type dropdowns to update preview when COL/ROW is selected
    ['line-xoffset-type', 'line-yoffset-type', 'rect-xoffset-type', 'rect-yoffset-type',
     'circle-xoffset-type', 'circle-yoffset-type', 'arc-xoffset-type', 'arc-yoffset-type',
     'label-xoffset-type', 'label-yoffset-type', 'value-xoffset-type', 'value-yoffset-type']
    .forEach(selectId => {
        const select = document.getElementById(selectId);
        if (select) {
            select.addEventListener('change', updatePreview);
        }
    });
    
    
    // Handle item type change
    function handleItemTypeChange() {
        const itemType = itemTypeDropdown.value;
        console.log(`Item type changed to: ${itemType}`);
        
        
        // Hide all property sections first
        lineProperties.style.display = 'none';
        rectangleProperties.style.display = 'none';
        labelProperties.style.display = 'none';
        valueProperties.style.display = 'none';
        circleProperties.style.display = 'none';
        arcProperties.style.display = 'none';
        hideProperties.style.display = 'none';
        unhideProperties.style.display = 'none';
        
        
        // Show iframe by default
        const iframeContainer = document.querySelector('.iframe-container');
        if (iframeContainer) {
            iframeContainer.style.display = 'block';
        }
        
        // Show appropriate section based on item type
        if (itemType === 'line') {
            lineProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for lines
            if (canvasWidth && canvasHeight) {
                lineX.value = 1;
                lineY.value = 1;
                lineXOffset.value = Math.floor(canvasWidth / 2);
                lineYOffset.value = Math.floor(canvasHeight / 2);
            }
            // Show color picker for lines
            itemColor.parentElement.style.display = 'block';
            // Show idx input for lines
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'rectangle') {
            rectangleProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for rectangles
            if (canvasWidth && canvasHeight) {
                rectXOffset.value = Math.floor(canvasWidth / 2);
                rectYOffset.value = Math.floor(canvasHeight / 2);
                rectWidth.value = 1;
                rectHeight.value = 1;
                rectStyle.checked = true; // filled
                rectCentered.checked = false;
                rectCorners.checked = false; // not rounded
            }
            // Show color picker for rectangles
            itemColor.parentElement.style.display = 'block';
            // Show idx input for rectangles
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'label') {
            labelProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for labels
            if (canvasWidth && canvasHeight) {
                labelXOffset.value = Math.floor(canvasWidth / 4);
                labelYOffset.value = Math.floor(canvasHeight / 4);
                labelText.value = 'Label Text';
                labelFontSize.value = 12;
                labelAlign.value = 'left';
                labelBold.checked = false;
                labelItalic.checked = false;
                labelUnderline.checked = false;
            }
            // Show color picker for labels
            itemColor.parentElement.style.display = 'block';
            // Show idx input for labels
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'value') {
            valueProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for values
            if (canvasWidth && canvasHeight) {
                valueXOffset.value = Math.floor(canvasWidth / 4);
                valueYOffset.value = Math.floor(canvasHeight / 4);
                valueText.value = 'Value: ';
                valueFontSize.value = 12;
                valueAlign.value = 'left';
                valueBold.checked = false;
                valueItalic.checked = false;
                valueUnderline.checked = false;
                valueIntValue.value = 50;
                valueMin.value = 0;
                valueMax.value = 100;
                valueDisplayMin.value = 0.0;
                valueDisplayMax.value = 1.0;
                valueDecimals.value = 2;
                valueUnits.value = '';
            }
            // Show color picker for values
            itemColor.parentElement.style.display = 'block';
            // Show idx input for values
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'circle') {
            circleProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for circles
            if (canvasWidth && canvasHeight) {
                circleXOffset.value = Math.floor(canvasWidth / 2);
                circleYOffset.value = Math.floor(canvasHeight / 2);
                circleRadius.value = 5;
                circleFilled.checked = false;
            }
            // Show color picker for circles
            itemColor.parentElement.style.display = 'block';
            // Show idx input for circles
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'arc') {
            arcProperties.style.display = 'block';
            // Configure offset dropdowns based on mode
            configureOffsetDropdowns();
            // Set default values for arcs
            if (canvasWidth && canvasHeight) {
                arcXOffset.value = Math.floor(canvasWidth / 2);
                arcYOffset.value = Math.floor(canvasHeight / 2);
                arcRadius.value = 5;
                arcStart.value = 0;
                arcAngle.value = 90;
                arcFilled.checked = false;
            }
            // Show color picker for arcs
            itemColor.parentElement.style.display = 'block';
            // Show idx input for arcs
            itemIdx.parentElement.style.display = 'block';
            // Always lock index in touchAction mode
            lockIndexField();
        } else if (itemType === 'hide') {
            hideProperties.style.display = 'block';
            // Hide color picker for hide
            itemColor.parentElement.style.display = 'none';
            // Hide main idx input for hide - hide uses its own idx input
            itemIdx.parentElement.style.display = 'none';
            // Set default value for hide idx
            const hideIdxInput = document.getElementById('hide-idx');
            if (hideIdxInput && !hideIdxInput.value) {
                hideIdxInput.value = 1;
            }
        } else if (itemType === 'unhide') {
            unhideProperties.style.display = 'block';
            // Hide color picker for unhide
            itemColor.parentElement.style.display = 'none';
            // Hide main idx input for unhide - unhide uses its own idx input
            itemIdx.parentElement.style.display = 'none';
            // Set default value for unhide idx
            const unhideIdxInput = document.getElementById('unhide-idx');
            if (unhideIdxInput && !unhideIdxInput.value) {
                unhideIdxInput.value = 1;
            }
        }
        
        updatePreview();
    }
    
    // Fetch drawing information
    function fetchDrawingInfo() {
        // For touchAction editing, get metadata from the original drawing
        const originalDrawingName = drawingName.replace('_touchAction_edit', '');
        fetch(`/api/drawings/${originalDrawingName}`)
            .then(response => response.json())
            .then(data => {
                drawingData = data;
                canvasWidth = data.canvasWidth || data.x || 50;
                canvasHeight = data.canvasHeight || data.y || 50;
                
                console.log(`Loaded drawing info: ${canvasWidth}x${canvasHeight}`);
                
                // Update the page title to include drawing name and size
                const drawingTitle = document.getElementById('drawing-title');
                if (drawingTitle) {
                    drawingTitle.textContent = `Add TouchAction Item to Drawing ${originalDrawingName} ${canvasWidth} x ${canvasHeight}`;
                }
                
                // Also update the document title for browser tab
                document.title = `Add TouchAction Item to ${originalDrawingName} (${canvasWidth}x${canvasHeight})`;
                
                // We don't need to check for localStorage data anymore
                // We'll just use the server data we already have
                
                // Update default values based on canvas size
                handleItemTypeChange();
                
                // Post current item values after page load (only for add mode)
                if (!isEditMode) {
                    console.log('Auto-posting initial item values for add mode');
                    updatePreview();
                } else {
                    console.log('Skipping auto-post in edit mode - item will be loaded from existing data');
                }
            })
            .catch(error => {
                console.error('Error fetching drawing info:', error);
            });
    }
    
    // Load the item being edited
    function loadEditingItem() {
        if (editIndex === null || editIndex === undefined || editIndex === '') return;
        
        console.log(`Loading touchAction action item for editing: action index ${editIndex}`);
        
        // Fetch the drawing data to get the touchAction
        fetch(`/${drawingName}`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(drawingData => {
            // For touchAction item editing, the drawing should contain only the touchAction
            if (!drawingData.items || drawingData.items.length === 0) {
                alert('No touchAction found in isolated environment');
                return;
            }
            
            const touchAction = drawingData.items[0]; // Should be the only item in isolated environment
            if (touchAction.type !== 'touchAction' || !touchAction.action) {
                alert('Invalid touchAction structure in isolated environment');
                return;
            }
            
            // editIndex refers to the action item index within the touchAction's action array
            const actionIndex = parseInt(editIndex);
            if (actionIndex < 0 || actionIndex >= touchAction.action.length) {
                alert(`Action item at index ${actionIndex} not found in touchAction (has ${touchAction.action.length} items)`);
                return;
            }
            
            editingItem = touchAction.action[actionIndex];
            console.log('Loaded touchAction action item for editing:', editingItem);
            
            // Populate the form with the item's values
            populateFormWithItem(editingItem);
            
            // Update the Add Item button text and page title
            if (addItemBtn) {
                addItemBtn.textContent = 'Update touchAction Item';
            }
            
            // Get cmdName from URL params for title
            const cmdName = params.get('cmdName');
            const displayName = cmdName;
            document.title = `Edit touchAction Item for touchZone ${displayName} (Index ${editingItem.idx})`;
            
            // Update page heading if it exists - use HTML for line break
            const pageHeading = document.querySelector('h1');
            if (pageHeading) {
                pageHeading.innerHTML = `Edit touchAction Item for touchZone ${displayName}<br>(Index ${editingItem.idx})`;
            }
        })
        .catch(error => {
            console.error('Error loading touchAction action item for editing:', error);
            alert('Failed to load touchAction action item for editing');
        });
    }
    
    // Populate form fields with item values
    function populateFormWithItem(item) {
        console.log('Populating form with item:', item);
        
        // Set the item type dropdown
        if (itemTypeDropdown && item.type) {
            itemTypeDropdown.value = item.type;
            handleItemTypeChange(); // Show the correct property panel
            
        }
        
        
        // For all other types, populate immediately
        populateFormFieldsForItem(item);
    }
    
    // Helper function to populate form fields (separated from async dropdown loading)
    function populateFormFieldsForItem(item) {
        // Populate common fields
        if (itemColor && item.color !== undefined) {
            itemColor.value = item.color;
            // Update color picker display
            updateColorPickerDisplay('item-color', item.color);
        }
        if (itemIdx && item.idxName) {
            // Show idxName and always lock the field in touchAction mode
            itemIdx.value = item.idxName;
            itemIdx.readOnly = true;
            itemIdx.style.backgroundColor = '#f8f9fa';
            itemIdx.title = `Index ${item.idxName} cannot be changed when editing touchAction item`;
            console.log(`[EDIT_MODE_INDEX_LOCK] Locked index ${item.idxName} for editing`);
        }
        
        // Populate type-specific fields
        switch (item.type) {
            case 'line':
                if (lineX && item.xSize !== undefined) lineX.value = item.xSize;
                if (lineY && item.ySize !== undefined) lineY.value = item.ySize;
                if (lineXOffset && item.xOffset !== undefined) setOffsetValue('line-xoffset', item.xOffset);
                if (lineYOffset && item.yOffset !== undefined) setOffsetValue('line-yoffset', item.yOffset);
                break;
                
            case 'rectangle':
                if (rectWidth && item.xSize !== undefined) rectWidth.value = item.xSize;
                if (rectHeight && item.ySize !== undefined) rectHeight.value = item.ySize;
                if (rectXOffset && item.xOffset !== undefined) setOffsetValue('rect-xoffset', item.xOffset);
                if (rectYOffset && item.yOffset !== undefined) setOffsetValue('rect-yoffset', item.yOffset);
                if (rectStyle && item.filled !== undefined) rectStyle.checked = item.filled === 'true';
                if (rectCentered && item.centered !== undefined) rectCentered.checked = item.centered === 'true';
                if (rectCorners && item.rounded !== undefined) rectCorners.checked = item.rounded === 'true';
                break;
                
                
                
            case 'label':
                if (labelXOffset && item.xOffset !== undefined) setOffsetValue('label-xoffset', item.xOffset);
                if (labelYOffset && item.yOffset !== undefined) setOffsetValue('label-yoffset',item.yOffset);
                if (labelText && item.text !== undefined) labelText.value = item.text;
                if (labelFontSize && item.fontSize !== undefined) labelFontSize.value = item.fontSize;
                if (labelAlign && item.align !== undefined) labelAlign.value = item.align;
                if (labelBold && item.bold !== undefined) labelBold.checked = item.bold === 'true';
                if (labelItalic && item.italic !== undefined) labelItalic.checked = item.italic === 'true';
                if (labelUnderline && item.underline !== undefined) labelUnderline.checked = item.underline === 'true';
                if (labelValue && item.value !== undefined) labelValue.value = item.value;
                if (labelUnits && item.units !== undefined) labelUnits.value = item.units;
                if (labelDecimals && item.decimals !== undefined) labelDecimals.value = item.decimals;
                break;
                
            case 'value':
                if (valueXOffset && item.xOffset !== undefined) setOffsetValue('value-xoffset', item.xOffset);
                if (valueYOffset && item.yOffset !== undefined) setOffsetValue('value-yoffset',item.yOffset);
                if (valueText && item.text !== undefined) valueText.value = item.text;
                if (valueFontSize && item.fontSize !== undefined) valueFontSize.value = item.fontSize;
                if (valueAlign && item.align !== undefined) valueAlign.value = item.align;
                if (valueBold && item.bold !== undefined) valueBold.checked = item.bold === 'true';
                if (valueItalic && item.italic !== undefined) valueItalic.checked = item.italic === 'true';
                if (valueUnderline && item.underline !== undefined) valueUnderline.checked = item.underline === 'true';
                if (valueIntValue && item.intValue !== undefined) valueIntValue.value = item.intValue;
                if (valueMin && item.min !== undefined) valueMin.value = item.min;
                if (valueMax && item.max !== undefined) valueMax.value = item.max;
                if (valueDisplayMin && item.displayMin !== undefined) valueDisplayMin.value = item.displayMin;
                if (valueDisplayMax && item.displayMax !== undefined) valueDisplayMax.value = item.displayMax;
                if (valueDecimals && item.decimals !== undefined) valueDecimals.value = item.decimals;
                if (valueUnits && item.units !== undefined) valueUnits.value = item.units;
                break;
                
            case 'circle':
                if (circleXOffset && item.xOffset !== undefined) setOffsetValue('circle-xoffset', item.xOffset);
                if (circleYOffset && item.yOffset !== undefined) setOffsetValue('circle-yoffset',item.yOffset);
                if (circleRadius && item.radius !== undefined) circleRadius.value = item.radius;
                if (circleFilled && item.filled !== undefined) circleFilled.checked = item.filled === 'true';
                break;
                
            case 'arc':
                if (arcXOffset && item.xOffset !== undefined) setOffsetValue('arc-xoffset',item.xOffset);
                if (arcYOffset && item.yOffset !== undefined) setOffsetValue('arc-yoffset',item.yOffset);
                if (arcRadius && item.radius !== undefined) arcRadius.value = item.radius;
                if (arcStart && item.start !== undefined) arcStart.value = item.start;
                if (arcAngle && item.angle !== undefined) arcAngle.value = item.angle;
                if (arcFilled && item.filled !== undefined) arcFilled.checked = item.filled === 'true';
                break;
                
            case 'hide':
                const hideIdxInput = document.getElementById('hide-idx');
                if (hideIdxInput && item.idx !== undefined) {
                    hideIdxInput.value = item.idx;
                }
                break;
                
            case 'unhide':
                const unhideIdxInput = document.getElementById('unhide-idx');
                if (unhideIdxInput && item.idx !== undefined) {
                    unhideIdxInput.value = item.idx;
                }
                break;
                
        }
        
        // Update preview after populating fields
        setTimeout(() => {
            updatePreview();
        }, 100);
    }
    
    // Helper function to update color picker display
    function updateColorPickerDisplay(inputId, colorValue) {
        const preview = document.getElementById(`${inputId}-preview`);
        const numberSpan = document.getElementById(`${inputId}-number`);
        
        if (preview && numberSpan) {
            // Use colorUtils function to get hex color
            const hexColor = typeof getColorHex === 'function' ? getColorHex(colorValue) : '#000000';
            preview.style.backgroundColor = hexColor;
            numberSpan.textContent = `Color ${colorValue}`;
            console.log(`Updated color picker display for ${inputId}: color ${colorValue} -> ${hexColor}`);
        }
    }

    // Helper function to set offset values (handles both numeric and string values like COL/ROW)
    function setOffsetValue(inputId, value) {
        const typeSelect = document.getElementById(inputId + '-type');
        const input = document.getElementById(inputId);
        
        if (typeSelect && input) {
            if (typeof value === 'string' && (value === 'COL' || value === 'ROW')) {
                typeSelect.value = value;
                input.value = 0;
                // Call toggleOffsetInput to properly hide/show the input field
                toggleOffsetInput(inputId);
            } else {
                typeSelect.value = 'number';
                input.value = value;
                // Call toggleOffsetInput to properly hide/show the input field
                toggleOffsetInput(inputId);
            }
        }
    }
    
    
    

    // Update preview in iframe
    function updatePreview() {
        if (!drawingData) return;
        
        
        const itemType = itemTypeDropdown.value;
        let tempItem = {
            type: itemType
        };
        
        // Add idx for line, rectangle, circle, arc, label, value, hide, and unhide types
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'circle' || itemType === 'arc' || itemType === 'label' || itemType === 'value' || itemType === 'hide' || itemType === 'unhide') {
            // If this is a replacement (selectedIdx mode), use the locked numeric index and name
            if (hasSelectedIndex && lockedIndex !== null && lockedIndexName) {
                tempItem.idx = lockedIndex;
                tempItem.idxName = lockedIndexName;
            } else if (isEditMode && editingItem) {
                // In edit mode, preserve the original item's idx and idxName
                tempItem.idx = editingItem.idx;
                tempItem.idxName = editingItem.idxName;
            }
        }
        
        // Add color for line, rectangle, label, value, circle, and arc only 
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc') {
            tempItem.color = isNaN(parseInt(itemColor.value))? 15 : parseInt(itemColor.value);
        }
        // Note: push, pop, insertDwg, and index items are not available in touchAction mode
        
        if (itemType === 'line') {
            tempItem = {
                ...tempItem,
                x: parseFloat(lineX.value || 1),
                y: parseFloat(lineY.value || 1),
                xOffset: getOffsetValue('line-xoffset'),
                yOffset: getOffsetValue('line-yoffset')
            };
        } else if (itemType === 'rectangle') {
            tempItem = {
                ...tempItem,
                xSize: parseFloat(rectWidth.value || 1),
                ySize: parseFloat(rectHeight.value || 1),
                xOffset: getOffsetValue('rect-xoffset'),
                yOffset: getOffsetValue('rect-yoffset'),
                filled: rectStyle.checked ? 'true' : 'false',
                centered: rectCentered.checked ? 'true' : 'false',
                rounded: rectCorners.checked ? 'true' : 'false'
            };
        } else if (itemType === 'label') {
            tempItem = {
                ...tempItem,
                xOffset: getOffsetValue('label-xoffset'),
                yOffset: getOffsetValue('label-yoffset'),
                text: labelText.value || '',
                fontSize: parseFloat(labelFontSize.value || 12),
                bold: labelBold.checked ? 'true' : 'false',
                italic: labelItalic.checked ? 'true' : 'false',
                underline: labelUnderline.checked ? 'true' : 'false',
                align: labelAlign.value || 'left'
            };
            
            // Add optional value, units, decimals properties (only if they have values)
            if (labelValue.value !== '') {
                tempItem.value = parseFloat(labelValue.value);
            }
            if (labelUnits.value !== '') {
                tempItem.units = labelUnits.value;
            }
            if (labelDecimals.value !== '') {
                tempItem.decimals = parseInt(labelDecimals.value);
            }
        } else if (itemType === 'value') {
            tempItem = {
                ...tempItem,
                xOffset: getOffsetValue('value-xoffset'),
                yOffset: getOffsetValue('value-yoffset'),
                text: valueText.value || '',
                fontSize: parseFloat(valueFontSize.value || 12),
                bold: valueBold.checked ? 'true' : 'false',
                italic: valueItalic.checked ? 'true' : 'false',
                underline: valueUnderline.checked ? 'true' : 'false',
                align: valueAlign.value || 'left',
                intValue: parseFloat(valueIntValue.value || 0),
                min: parseFloat(valueMin.value || 0),
                max: parseFloat(valueMax.value || 1),
                displayMin: parseFloat(valueDisplayMin.value || 0.0),
                displayMax: parseFloat(valueDisplayMax.value || 1.0),
                decimals: parseInt(valueDecimals.value || 2),
                units: valueUnits.value || ''
            };
        } else if (itemType === 'circle') {
            tempItem = {
                ...tempItem,
                xOffset: getOffsetValue('circle-xoffset'),
                yOffset: getOffsetValue('circle-yoffset'),
                radius: parseFloat(circleRadius.value || 1),
                filled: circleFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'arc') {
            tempItem = {
                ...tempItem,
                xOffset: getOffsetValue('arc-xoffset'),
                yOffset: getOffsetValue('arc-yoffset'),
                radius: parseFloat(arcRadius.value || 1),
                start: parseFloat(arcStart.value || 0),
                angle: parseFloat(arcAngle.value || 90),
                filled: arcFilled.checked ? 'true' : 'false'
            };
        }
        
        
        // Update the item edit temp drawing with the new item
        editingItem = tempItem;
        if (itemEditDrawingName) {
            const requestBody = { 
                item: tempItem,
                cmdName: params.get('cmdName'), // Include cmdName for display
                cmd: params.get('cmd') // Include cmdName for display
            };
            
            // If in edit mode, include the edit index
            if (isEditMode && editIndex !== null) {
                requestBody.editIndex = parseInt(editIndex);
            }
            
            fetch(`/api/drawings/${itemEditDrawingName}/temp-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Item edit temp drawing updated for preview');
                    // Trigger restart in existing iframe instead of reloading
                    safelyCallInitializeApp(previewIframe);
                } else {
                    console.error('Error updating item edit temp drawing:', data.error);
                }
            }).catch(error => {
                console.error('Error updating item edit temp drawing:', error);
            });
        } else {
            console.warn('No item edit temp drawing available for preview update');
        }
    }
    
    // Add item to drawing
    function addItem() {
        if (!drawingData) {
            alert('Drawing information not loaded');
            return;
        }
        
        const itemType = itemTypeDropdown.value;
        let newItem = {
            type: itemType
        };
        
        // Add idx for line, rectangle, label, value, circle, and arc types
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc') {
            console.log(`[ADD_ITEM_DEBUG] hasSelectedIndex: ${hasSelectedIndex}, lockedIndex: ${lockedIndex}, lockedIndexName: "${lockedIndexName}"`);
            console.log(`[ADD_ITEM_DEBUG] isEditMode: ${isEditMode}, editingItem:`, editingItem);
            
            // If this is a replacement (selectedIdx mode), use the locked numeric index and name
            if (hasSelectedIndex && lockedIndex !== null && lockedIndexName) {
                newItem.idx = lockedIndex;
                newItem.idxName = lockedIndexName;
                console.log(`[ADD_ITEM_DEBUG] Set replacement idx: ${newItem.idx}, idxName: "${newItem.idxName}"`);
            } else if (isEditMode && editingItem) {
                // In edit mode, preserve the original item's idx and idxName
                newItem.idx = editingItem.idx;
                newItem.idxName = editingItem.idxName;
                console.log(`[ADD_ITEM_DEBUG] Set edit mode idx: ${newItem.idx}, idxName: "${newItem.idxName}"`);
            }
        }
        
        // Handle hide and unhide types with idx parameters
        if (itemType === 'hide' || itemType === 'unhide') {
            const idxInput = document.getElementById(`${itemType}-idx`);
            
            if (!idxInput.value || parseInt(idxInput.value) < 1) {
                alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} items must have an index value ≥ 1`);
                return;
            }
            newItem.idx = parseInt(idxInput.value);
        }
        
        // Add color for line, rectangle, label, value, circle, and arc only 
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc') {
            newItem.color = isNaN(parseInt(itemColor.value))? 15 : parseInt(itemColor.value);
        }
        // Note: push, pop, insertDwg, and index items are not available in touchAction mode
        
        if (itemType === 'line') {
            newItem = {
                ...newItem,
                x: parseFloat(lineX.value || 1),
                y: parseFloat(lineY.value || 1),
                xOffset: getOffsetValue('line-xoffset'),
                yOffset: getOffsetValue('line-yoffset')
            };
        } else if (itemType === 'rectangle') {
            newItem = {
                ...newItem,
                xSize: parseFloat(rectWidth.value || 1),
                ySize: parseFloat(rectHeight.value || 1),
                xOffset: getOffsetValue('rect-xoffset'),
                yOffset: getOffsetValue('rect-yoffset'),
                filled: rectStyle.checked ? 'true' : 'false',
                centered: rectCentered.checked ? 'true' : 'false',
                rounded: rectCorners.checked ? 'true' : 'false'
            };
        } else if (itemType === 'label') {
            newItem = {
                ...newItem,
                xOffset: getOffsetValue('label-xoffset'),
                yOffset: getOffsetValue('label-yoffset'),
                text: labelText.value || '',
                fontSize: parseFloat(labelFontSize.value || 12),
                bold: labelBold.checked ? 'true' : 'false',
                italic: labelItalic.checked ? 'true' : 'false',
                underline: labelUnderline.checked ? 'true' : 'false',
                align: labelAlign.value || 'left'
            };
            
            // Add optional value, units, decimals properties (only if they have values)
            if (labelValue.value !== '') {
                newItem.value = parseFloat(labelValue.value);
            }
            if (labelUnits.value !== '') {
                newItem.units = labelUnits.value;
            }
            if (labelDecimals.value !== '') {
                newItem.decimals = parseInt(labelDecimals.value);
            }
        } else if (itemType === 'value') {
            newItem = {
                ...newItem,
                xOffset: getOffsetValue('value-xoffset'),
                yOffset: getOffsetValue('value-yoffset'),
                text: valueText.value || '',
                fontSize: parseFloat(valueFontSize.value || 12),
                bold: valueBold.checked ? 'true' : 'false',
                italic: valueItalic.checked ? 'true' : 'false',
                underline: valueUnderline.checked ? 'true' : 'false',
                align: valueAlign.value || 'left',
                intValue: parseFloat(valueIntValue.value || 0),
                min: parseFloat(valueMin.value || 0),
                max: parseFloat(valueMax.value || 1),
                displayMin: parseFloat(valueDisplayMin.value || 0.0),
                displayMax: parseFloat(valueDisplayMax.value || 1.0),
                decimals: parseInt(valueDecimals.value || 2),
                units: valueUnits.value || ''
            };
        } else if (itemType === 'circle') {
            newItem = {
                ...newItem,
                xOffset: getOffsetValue('circle-xoffset'),
                yOffset: getOffsetValue('circle-yoffset'),
                radius: parseFloat(circleRadius.value || 1),
                filled: circleFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'arc') {
            newItem = {
                ...newItem,
                xOffset: getOffsetValue('arc-xoffset'),
                yOffset: getOffsetValue('arc-yoffset'),
                radius: parseFloat(arcRadius.value || 1),
                start: parseFloat(arcStart.value || 0),
                angle: parseFloat(arcAngle.value || 90),
                filled: arcFilled.checked ? 'true' : 'false'
            };
        }
        
        console.log('Adding item to drawing:', newItem);
        console.log(`[FINAL_ITEM_DEBUG] newItem.idx: ${newItem.idx}, newItem.idxName: "${newItem.idxName}"`);
        
        
        if (isEditMode && editIndex !== null) {
            // Edit mode: update the existing item
            console.log(`Updating item at index ${editIndex}`);
            updateExistingItem(newItem);
        } else {
            // Add mode: add new item
            console.log('Adding new item');
            addNewItem(newItem);
        }
    }
    
    // Function to add a new item
    function addNewItem(newItem) {
        console.log('Adding new touchAction item:', newItem);
        
        // Use the new merge endpoint to add the item to the touchAction structure
        fetch(`/api/drawings/${touchActionEditDrawingName}/merge-touchaction-item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                item: newItem,
                cmdName: params.get('cmdName'),
                cmd: params.get('cmd'),
                itemEditDrawingName: itemEditDrawingName
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || "Failed to add item to touchAction");
            }
            
            console.log('TouchAction item successfully merged into touchAction structure');
            handleTouchActionSuccess();
        })
        .catch(error => {
            handleError(error);
        });
    }
    
    // Function to update an existing item
    function updateExistingItem(updatedItem) {
        console.log('Updating existing touchAction item:', updatedItem);
        
        // Use the new merge endpoint to update the item in the touchAction structure
        fetch(`/api/drawings/${touchActionEditDrawingName}/merge-touchaction-item`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                item: updatedItem,
                cmdName: params.get('cmdName'),
                cmd: params.get('cmd'),
                itemEditDrawingName: itemEditDrawingName,
                editIndex: parseInt(editIndex)
            })
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || "Failed to update item in touchAction");
            }
            
            console.log('TouchAction item successfully updated in touchAction structure');
            handleTouchActionSuccess();
        })
        .catch(error => {
            handleError(error);
        });
    }
    
    // Handle successful operation for touchAction items
    function handleTouchActionSuccess() {
        // Get cmdName parameters to pass back to touch-actions page
        const cmdName = params.get('cmdName');
        
        console.log(`TouchAction item processed - accepting changes and returning to touch-actions page`);
        
        // Accept the touchAction item changes using the new endpoint
        fetch(`/api/touchaction-item/${encodeURIComponent(itemEditDrawingName)}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => {
            if (!response.ok) {
                throw new Error(`Failed to accept touchAction item changes: ${response.status}`);
            }
            return response.json();
        }).then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to accept touchAction item changes');
            }
            console.log('TouchAction item changes accepted successfully');
        }).catch(error => {
            console.error('Error accepting touchAction item changes:', error);
            alert('Warning: Failed to properly save changes. You may need to manually check your work.');
        }).finally(() => {
            // Return to touch-actions page with the touchAction edit drawing to continue editing session
            let url = `/touch-actions.html?tempDrawing=${encodeURIComponent(touchActionEditDrawingName)}`;
            url += `&cmdName=${encodeURIComponent(cmdName)}`;
            window.location.href = url;
        });
    }

    // Handle successful operation (unused for touchAction items)
    function handleSuccess() {
        // Success - store the drawing name in localStorage so it will be selected
        // when redirected back to appropriate page
        localStorage.setItem('selectedDrawingName', drawingName);
        console.log(`Setting drawing "${drawingName}" as selected before redirect`);
        
        // Always return to edit page
        window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
    }
    
    // Handle errors
    function handleError(error) {
        console.error(`Error: ${error.message}`);
        alert(`Error: ${error.message}`);
        
        // Always return to edit page
        window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
    }
    
    
    // Removed popup window message handling code - now using inline editing

    
    // Global function to toggle offset input type
    window.toggleOffsetInput = function(inputId) {
        const typeSelect = document.getElementById(inputId + '-type');
        const input = document.getElementById(inputId);
        
        if (!typeSelect) {
            console.warn(`toggleOffsetInput: typeSelect not found for ${inputId}`);
            return;
        }
        
        console.log(`toggleOffsetInput: typeSelect.value = "${typeSelect.value}"`);
        
        if (typeSelect.value === 'number') {
            console.log(`toggleOffsetInput: showing input field for ${inputId}`);
            input.style.display = 'block';
            input.type = 'number';
            input.placeholder = '';
        } else {
            console.log(`toggleOffsetInput: hiding input field for ${inputId}, value is "${typeSelect.value}"`);
            input.style.display = 'none';
        }
    };
    
    
    // Helper function to get offset value (numeric or COL/ROW)
    function getOffsetValue(inputId) {
        const typeSelect = document.getElementById(inputId + '-type');
        const input = document.getElementById(inputId);
        
        if (!typeSelect) {
            console.warn(`getOffsetValue: typeSelect not found for ${inputId}`);
            return 0;
        }
        
        console.log(`getOffsetValue(${inputId}): typeSelect.value = "${typeSelect.value}"`);
        
        if (typeSelect.value === 'number') {
            const numValue = parseFloat(input.value || 0);
            console.log(`getOffsetValue(${inputId}): returning number = ${numValue}`);
            return numValue;
        } else {
            console.log(`getOffsetValue(${inputId}): returning string = "${typeSelect.value}"`);
            return typeSelect.value; // Returns 'COL' or 'ROW'
        }
    }

    // Window resize handler to reposition the preview dialog
    function repositionPreviewDialog() {
        const iframeContainer = document.querySelector('.iframe-container');
        if (iframeContainer && iframeContainer.style.position === 'fixed') {
            // Keep the dialog positioned at bottom right with some margin
            iframeContainer.style.bottom = '20px';
            iframeContainer.style.right = '20px';
            
            // Adjust if the window is too small
            const minWindowWidth = 500;
            const minWindowHeight = 250;
            
            if (window.innerWidth < minWindowWidth) {
                iframeContainer.style.right = '10px';
                iframeContainer.style.width = (window.innerWidth - 30) + 'px';
            } else {
                iframeContainer.style.width = '400px';
            }
            
            if (window.innerHeight < minWindowHeight) {
                iframeContainer.style.bottom = '10px';
                iframeContainer.style.height = Math.max(100, window.innerHeight - 50) + 'px';
            } else {
                iframeContainer.style.height = '150px';
            }
        }
    }
    
    // Add window resize event listener
    window.addEventListener('resize', repositionPreviewDialog);
    
    
    // Initial positioning
    repositionPreviewDialog();

    // Function to lock index field in touchAction mode
    function lockIndexField() {
        if (hasSelectedIndex && lockedIndexName) {
            // Pre-populate with selected index name from selection page
            itemIdx.value = lockedIndexName;
            itemIdx.title = `Index ${lockedIndexName} selected from previous step - cannot be changed`;
            
            // Update page title to indicate step 2
            const pageTitle = document.querySelector('h1');
            const cmdName = params.get('cmdName');
            if (pageTitle) {
                pageTitle.innerHTML = `Step 2 of 2: Add touchAction Item for touchZone ${cmdName}<br>(Index ${lockedIndexName})`;
            }
            document.title = `Add touchAction Item for touchZone ${cmdName} - Index ${lockedIndexName}`;
        } else if (isEditMode && editingItem && editingItem.idxName) {
            // Pre-populate with existing item's index name in edit mode
            itemIdx.value = editingItem.idxName;
            itemIdx.title = `Index ${editingItem.idxName} from existing item - cannot be changed`;
        } else {
            // Default behavior - should not happen in proper touchAction workflow
            itemIdx.value = '';
            itemIdx.title = 'Index required for touchAction items';
        }
        
        // Always lock the index field in touchAction mode
        itemIdx.readOnly = true;
        itemIdx.style.backgroundColor = '#f8f9fa';
        
        console.log(`[INDEX_LOCK] Locked index field in touchAction mode`);
    }

    // Call handleItemTypeChange once to initialize the UI correctly
    handleItemTypeChange();

    // Function to handle cancel button - general purpose for all item types
    function cancel() {
        if (itemEditDrawingName) {
            // Cancel the touchAction item changes using the new endpoint
            fetch(`/api/touchaction-item/${encodeURIComponent(itemEditDrawingName)}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to cancel touchAction item changes: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || 'Failed to cancel touchAction item changes');
                }
                console.log('TouchAction item changes cancelled and temp drawings cleaned up');
            })
            .catch(error => {
                console.error('Error cancelling touchAction item changes:', error);
                // Continue anyway since we want to navigate back regardless
            })
            .finally(() => {
                // Navigate back based on how we got here
                const cmdName = params.get('cmdName');
                if (hasSelectedIndex) {
                    // We came from index selection page, go back there
                    window.location.href = `/select-touchaction-index.html?tempDrawing=${encodeURIComponent(touchActionEditDrawingName)}&cmdName=${encodeURIComponent(cmdName)}`;
                } else {
                    // We came directly from touch-actions page (editing mode)
                    window.location.href = `/touch-actions.html?tempDrawing=${encodeURIComponent(touchActionEditDrawingName)}&cmdName=${encodeURIComponent(cmdName)}`;
                }
            });
        } else {
            // No temporary drawing to cancel
            const cmdName = params.get('cmdName');
            if (hasSelectedIndex) {
                // We came from index selection page, go back there
                window.location.href = `/select-touchaction-index.html?tempDrawing=${encodeURIComponent(touchActionEditDrawingName)}&cmdName=${encodeURIComponent(cmdName)}`;
            } else {
                // We came directly from touch-actions page (editing mode)
                window.location.href = `/touch-actions.html?tempDrawing=${encodeURIComponent(touchActionEditDrawingName)}&cmdName=${encodeURIComponent(cmdName)}`;
            }
        }
    }
    
    // Function to configure offset dropdowns for regular items
    function configureOffsetDropdowns() {
        const offsetInputs = [
            'line-xoffset',
            'line-yoffset', 
            'rect-xoffset',
            'rect-yoffset',
            'circle-xoffset',
            'circle-yoffset',
            'arc-xoffset',
            'arc-yoffset',
            'label-xoffset',
            'label-yoffset',
            'value-xoffset',
            'value-yoffset'
        ];
        
        offsetInputs.forEach(inputId => {
            const typeSelect = document.getElementById(inputId + '-type');
            if (typeSelect) {
                // Initialize the display state based on current dropdown value
                toggleOffsetInput(inputId);
            }
        });
        
        console.log('Configured offset dropdowns for regular item editing');
    }
});