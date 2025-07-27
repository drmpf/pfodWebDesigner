// Add Item Page Script
/*   
   add-item.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log("Add item page loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const drawingName = params.get('drawing');
    const editIndex = params.get('editIndex'); // Index of item to edit
    const editingActionItem = params.get('editingActionItem') === 'true'; // true if editing action item
    const actionIndex = params.get('actionIndex'); // Index of action item to edit
    
    if (!drawingName) {
        alert('No drawing specified');
        window.close();
        return;
    }
    
    // DOM Elements
    const itemTypeDropdown = document.getElementById('item-type');
    const lineProperties = document.getElementById('line-properties');
    const rectangleProperties = document.getElementById('rectangle-properties');
    const pushProperties = document.getElementById('push-properties');
    const popProperties = document.getElementById('pop-properties');
    const indexProperties = document.getElementById('index-properties');
    const eraseProperties = document.getElementById('erase-properties');
    const hideProperties = document.getElementById('hide-properties');
    const unhideProperties = document.getElementById('unhide-properties');
    const insertDwgProperties = document.getElementById('insertDwg-properties');
    const labelProperties = document.getElementById('label-properties');
    const valueProperties = document.getElementById('value-properties');
    const circleProperties = document.getElementById('circle-properties');
    const arcProperties = document.getElementById('arc-properties');
    const addItemBtn = document.getElementById('add-item-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const previewIframe = document.getElementById('preview-iframe');
    const touchZoneProperties = document.getElementById('touchZone-properties');
    
    // Form elements

    const touchZoneXOffset = document.getElementById('touchZone-xoffset');
    const touchZoneYOffset = document.getElementById('touchZone-yoffset');
    const touchZoneXSize = document.getElementById('touchZone-xsize');
    const touchZoneYSize = document.getElementById('touchZone-ysize');
    const touchZoneName = document.getElementById('touchZone-name');
    const touchZoneFilter = document.getElementById('touchZone-filter');
    const touchZoneCentered = document.getElementById('touchZone-centered');
    const touchZonePriority = document.getElementById('touchZone-priority');

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
    const pushX = document.getElementById('push-x');
    const pushY = document.getElementById('push-y');
    const pushScale = document.getElementById('push-scale');
    const insertDwgName = document.getElementById('insertDwg-name');
    const insertDwgXOffset = document.getElementById('insertDwg-xoffset');
    const insertDwgYOffset = document.getElementById('insertDwg-yoffset');
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
    const itemIdxEnable = document.getElementById('item-idx-enable');
    const itemIdx = document.getElementById('item-idx');
    const itemIdxName = document.getElementById('item-idx-name');
    
    // Initialize color picker for item color
    if (typeof createColorPicker !== 'undefined') {
        createColorPicker('item-color-picker', 'item-color', 15);
    }
    
    // Edit mode variables (moved up to avoid initialization errors)
    let isEditMode = editIndex !== null && editIndex !== undefined && editIndex !== '';
    let editingItem = null;
    let originalTouchZoneCmd = null; // Store original cmdName value for touchZone editing
    let tempDrawingName = null; // Temporary drawing name for editing
    let drawingData = null; // Drawing data
    let canvasWidth = 50; // Canvas width 
    let canvasHeight = 50; // Canvas height
    
    // Function to toggle index name field visibility
    window.toggleIndexName = function() {
        const enable = itemIdxEnable.checked;
        if (enable) {
            itemIdx.style.display = 'none'; // Hide the index number field
            itemIdxName.style.display = 'block';
            
            // Generate unique default name if field is empty
            if (!itemIdxName.value.trim()) {
                itemIdxName.value = generateUniqueIndexName();
            }
        } else {
            itemIdx.style.display = 'none';
            itemIdxName.style.display = 'none';
            itemIdxName.value = '';
        }
        // Update preview to reflect checkbox change
        updatePreview();
    };
    
    // Function to generate unique index name
    function generateUniqueIndexName() {
        if (!drawingData || !drawingData.items) {
            return 'idx_1';
        }
        
        const existingNames = new Set();
        drawingData.items.forEach((item, index) => {
            if (item.idxName && (!isEditMode || index !== parseInt(editIndex))) {
                existingNames.add(item.idxName);
            }
        });
        
        let counter = 1;
        let newName = `idx_${counter}`;
        while (existingNames.has(newName)) {
            counter++;
            newName = `idx_${counter}`;
        }
        
        return newName;
    }
    
    // Function to generate unique touchZone command name
    function generateUniqueTouchZoneCommandName() {
        if (!drawingData || !drawingData.items) {
            return 'cmd_c1';
        }
        
        const existingCommandNames = new Set();
        drawingData.items.forEach((item, index) => {
            if (item.type === 'touchZone' && item.cmdName && (!isEditMode || index !== parseInt(editIndex))) {
                existingCommandNames.add(item.cmdName);
            }
        });
        
        let counter = 1;
        let newCommandName = `cmd_c${counter}`;
        while (existingCommandNames.has(newCommandName)) {
            counter++;
            newCommandName = `cmd_c${counter}`;
        }
        
        return newCommandName;
    }
    
    // Function to check if touchZone command name is unique
    function isTouchZoneCommandNameUnique(cmdName) {
        if (!drawingData || !drawingData.items) return true;
        
        for (let i = 0; i < drawingData.items.length; i++) {
            const item = drawingData.items[i];
            // Skip the current item being edited
            if (isEditMode && i === parseInt(editIndex)) continue;
            
            if (item.type === 'touchZone' && item.cmdName === cmdName) {
                return false;
            }
        }
        return true;
    }
    
    // Function to check if index name is unique
    function isIndexNameUnique(name) {
        if (!drawingData || !drawingData.items) return true;
        
        for (let i = 0; i < drawingData.items.length; i++) {
            const item = drawingData.items[i];
            // Skip the current item being edited
            if (isEditMode && i === parseInt(editIndex)) continue;
            if ((item.type == 'index') || (item.type == 'erase') || (item.type == 'hide') || (item.type == 'unhide')) {
              continue;
            }            
            if (item.idxName === name) {
                return false;
            }
        }
        return true;
    }
    
    // Function to initialize the server with the drawing name and set up the iframe
    const initializeDrawingAndIframe = () => {
        console.log(`Initializing temporary copy for drawing: ${drawingName}`);
        
        // Create temporary copy for editing
        fetch(`/api/drawings/${encodeURIComponent(drawingName)}/temp-copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                editIndex: editIndex
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
            
            tempDrawingName = data.tempName;
            console.log(`Created temporary copy: ${tempDrawingName}`);
            
            // Immediately set temp copy refresh to 0 to inhibit refresh during editing
            console.log(`Calling set-refresh-zero for: ${tempDrawingName}`);
            return fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/set-refresh-zero`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
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
                throw new Error(data.error || 'Failed to disable refresh on temporary copy');
            }
            console.log('Disabled refresh on temporary drawing for item editing');
            
            // Set up the iframe source to use /pfodWeb endpoint like edit-drawing page
            // Set up iframe with preview parameter for temp drawing
            setupPreviewIframeWithDrawing(previewIframe, tempDrawingName, true);
        }).catch(error => {
            console.error(`Error creating temporary copy: ${error}`);
            alert('Failed to create temporary copy for preview. Please try again.');
        });
    };
    
    // Start the initialization process
    initializeDrawingAndIframe();
    
    
    // Fetch drawing information to get canvas size
    fetchDrawingInfo();
    
    // Set up event listeners (except for itemTypeDropdown if in edit mode)
    if (!isEditMode) {
        itemTypeDropdown.addEventListener('change', handleItemTypeChange);
    }
    addItemBtn.addEventListener('click', addItem);
    cancelBtn.addEventListener('click', cancel);
    
    // If in edit mode, load the item being edited
    if (isEditMode) {
        loadEditingItem();
    }
    
    
    // Helper function to generate final text for Label and Value items (same logic as pfodWebMouse)
    function generateItemDisplayText(item) {
        if (item.type === 'label') {
            // Label text generation: text + formatted value + units (if value exists)
            let text = item.text || '';
            if (isDefinedAndNotNull(item.value) && item.value !== '') {
                const decimals = (isDefinedAndNotNull(item.decimals) ? parseInt(item.decimals) : 2);
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
            const decimals = (isDefinedAndNotNull(item.decimals) ? parseInt(item.decimals) : 2);
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
     pushX, pushY, pushScale, insertDwgName,insertDwgXOffset, insertDwgYOffset,
     labelXOffset, labelYOffset, labelText, labelFontSize, labelAlign, labelBold, labelItalic, labelUnderline, labelValue, labelDecimals, labelUnits,
     valueXOffset, valueYOffset, valueText, valueFontSize, valueAlign, valueBold, valueItalic, valueUnderline,
     valueIntValue, valueMin, valueMax, valueDisplayMin, valueDisplayMax, valueDecimals, valueUnits,
     circleXOffset, circleYOffset, circleRadius, circleFilled,
     arcXOffset, arcYOffset, arcRadius, arcStart, arcAngle, arcFilled,
     touchZoneXOffset, touchZoneYOffset, touchZoneXSize, touchZoneYSize, touchZoneName, touchZoneFilter, touchZoneCentered, touchZonePriority,
     itemColor, itemIdx, itemIdxEnable, itemIdxName]
    .forEach(input => {
        if (input) {
            input.addEventListener('input', updatePreview);
            input.addEventListener('change', updatePreview);
        }
    });
    
    // Add specific validation for index name field
    if (itemIdxName) {
        itemIdxName.addEventListener('blur', function() {
            if (itemIdxEnable.checked && itemIdxName.value.trim()) {
                if (!isIndexNameUnique(itemIdxName.value.trim())) {
                    itemIdxName.style.borderColor = 'red';
                    itemIdxName.style.backgroundColor = '#ffebee';
                    itemIdxName.title = 'This index name is already in use. Please choose a different name.';
                } else {
                    itemIdxName.style.borderColor = '';
                    itemIdxName.style.backgroundColor = '';
                    itemIdxName.title = '';
                }
            }
        });
        
        itemIdxName.addEventListener('input', function() {
            // Reset visual feedback while typing
            if (itemIdxName.style.borderColor === 'red') {
                itemIdxName.style.borderColor = '';
                itemIdxName.style.backgroundColor = '';
                itemIdxName.title = '';
            }
        });
    }
    
    // Add specific validation for touchZone command name field
    if (touchZoneName) {
        touchZoneName.addEventListener('blur', function() {
            if (touchZoneName.value.trim()) {
                if (!isTouchZoneCommandNameUnique(touchZoneName.value.trim())) {
                    touchZoneName.style.borderColor = 'red';
                    touchZoneName.style.backgroundColor = '#ffebee';
                    touchZoneName.title = 'This command name is already in use. Please choose a different name.';
                } else {
                    touchZoneName.style.borderColor = '';
                    touchZoneName.style.backgroundColor = '';
                    touchZoneName.title = '';
                }
            }
        });
        
        touchZoneName.addEventListener('input', function() {
            // Reset visual feedback while typing
            if (touchZoneName.style.borderColor === 'red') {
                touchZoneName.style.borderColor = '';
                touchZoneName.style.backgroundColor = '';
                touchZoneName.title = '';
            }
        });
    }
    
    
    // Helper functions to determine item category
    function isIndexableItem(type) {
        return ['line', 'rectangle', 'circle', 'arc', 'label', 'value'].includes(type);
    }
    
    function isSpecialItem(type) {
        return ['touchZone', 'insertDwg', 'index'].includes(type);
    }
    
    function isControlItem(type) {
        return ['pushZero', 'popZero', 'erase', 'hide', 'unhide'].includes(type);
    }
    
    // Helper functions for common operations
    function hideAllProperties() {
        lineProperties.style.display = 'none';
        rectangleProperties.style.display = 'none';
        labelProperties.style.display = 'none';
        valueProperties.style.display = 'none';
        circleProperties.style.display = 'none';
        arcProperties.style.display = 'none';
        touchZoneProperties.style.display = 'none';
        pushProperties.style.display = 'none';
        popProperties.style.display = 'none';
        indexProperties.style.display = 'none';
        eraseProperties.style.display = 'none';
        hideProperties.style.display = 'none';
        unhideProperties.style.display = 'none';
        insertDwgProperties.style.display = 'none';
    }
    
    function showIndexCheckbox() {
        if (itemIdxEnable && itemIdxEnable.parentElement) {
            itemIdxEnable.parentElement.style.display = 'block';
            itemIdxEnable.disabled = false; // Reset disabled state
            console.log(`[DEBUG] Showed index checkbox`);
        } else {
            console.log(`[DEBUG] Failed to show index checkbox - element not found!`);
        }
        
        // Ensure index name field is in correct state based on checkbox
        if (itemIdxEnable && itemIdxName) {
            if (itemIdxEnable.checked) {
                itemIdxName.style.display = 'block';
                // Generate unique default name if field is empty and not in edit mode
                if (!itemIdxName.value.trim() && !isEditMode) {
                    itemIdxName.value = generateUniqueIndexName();
                }
            } else {
                itemIdxName.style.display = 'none';
                itemIdxName.value = '';
            }
        }
    }
    
    function hideIndexCheckbox() {
        if (itemIdxEnable && itemIdxEnable.parentElement) {
            itemIdxEnable.parentElement.style.display = 'none';
            itemIdxEnable.disabled = false; // Reset disabled state
            itemIdxEnable.checked = false; // Reset checked state
            console.log(`[DEBUG] Hid index checkbox`);
        } else {
            console.log(`[DEBUG] Failed to hide index checkbox - element not found!`);
        }
        
        // Also hide and clear the index name field
        if (itemIdxName) {
            itemIdxName.style.display = 'none';
            itemIdxName.value = '';
            console.log(`[DEBUG] Cleared and hid index name field`);
        }
    }
    
    function showColorPicker() {
        itemColor.parentElement.style.display = 'block';
    }
    
    function hideColorPicker() {
        itemColor.parentElement.style.display = 'none';
    }
    
    // Handle indexable items (line, rectangle, circle, arc, label, value)
    function handleIndexableItem(itemType) {
        console.log(`[DEBUG] Handling indexable item: ${itemType}`);
        
        // Show index checkbox for ALL indexable items
        showIndexCheckbox();
        
        // Show color picker for ALL indexable items
        showColorPicker();
        
       
        // Handle specific item type
        switch(itemType) {
            case 'line':
                setupLineItem();
                break;
            case 'rectangle':
                setupRectangleItem();
                break;
            case 'label':
                setupLabelItem();
                break;
            case 'value':
                setupValueItem();
                break;
            case 'circle':
                setupCircleItem();
                break;
            case 'arc':
                setupArcItem();
                break;
        }
    }
    
    // Handle special items (touchZone, insertDwg, index)
    function handleSpecialItem(itemType) {
        console.log(`[DEBUG] Handling special item: ${itemType}`);
        
        // Special items have their own index handling
        if (itemType === 'index') {
            showIndexCheckbox();
            itemIdxEnable.disabled = true; // Force enabled
            itemIdxEnable.checked = true;
            itemIdxName.style.display = 'block';
            if (!isEditMode) {
                itemIdxName.value = generateUniqueIndexName();
            }
        } else {
            hideIndexCheckbox();
        }
        
        switch(itemType) {
            case 'touchZone':
                setupTouchZoneItem();
                break;
            case 'insertDwg':
                setupInsertDwgItem();
                break;
            case 'index':
                setupIndexItem();
                break;
        }
    }
    
    // Handle control items (pushZero, popZero, erase, hide, unhide)
    function handleControlItem(itemType) {
        console.log(`[DEBUG] Handling control item: ${itemType}`);
        
        // Control items never use index
        hideIndexCheckbox();
        
        // Control items don't use color picker
        hideColorPicker();
        
        switch(itemType) {
            case 'pushZero':
                setupPushZeroItem();
                break;
            case 'popZero':
                setupPopZeroItem();
                break;
            case 'erase':
                setupEraseItem();
                break;
            case 'hide':
                setupHideItem();
                break;
            case 'unhide':
                setupUnhideItem();
                break;
        }
    }

    function isDefinedAndNotNull(value) {
       return value !== undefined && value !== null;
    }

    // returns true or false
    function checkBool(value) {
      if (value) { 
        if (typeof value === "boolean") {
          return value;
        }// else {
        return value === 'true';
      } //else {
      return false;
    }
    
    // Individual item setup functions
    // carry over value if available
    function setupLineItem() {
        //console.warn(`setupLineItem `,JSON.stringify(editingItem,null,2));

        lineProperties.style.display = 'block';
        if (editingItem) {
          lineX.value = (isDefinedAndNotNull(editingItem.xSize)?editingItem.xSize:1);
          lineY.value = (isDefinedAndNotNull(editingItem.ySize)?editingItem.ySize:1);
          lineXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          lineYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
        } else {
            lineX.value = 1;
            lineY.value = 1;
            lineXOffset.value = Math.floor(canvasWidth / 2);
            lineYOffset.value = Math.floor(canvasHeight / 2);
       }
    }
    
    function setupRectangleItem() {
    //  console.error(`setupRectangleItem `,JSON.stringify(editingItem,null,2));
        rectangleProperties.style.display = 'block';
        if (editingItem) {
          rectWidth.value = (isDefinedAndNotNull(editingItem.xSize)?editingItem.xSize:1);
          rectHeight.value = (isDefinedAndNotNull(editingItem.ySize)?editingItem.ySize:1);
          rectXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          rectYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
            rectStyle.checked = checkBool(editingItem.filled);
            rectCentered.checked = checkBool(editingItem.centered);
            rectCorners.checked = checkBool(editingItem.rounded);
        } else {
            rectXOffset.value = Math.floor(canvasWidth / 2);
            rectYOffset.value = Math.floor(canvasHeight / 2);
            rectWidth.value = 1;
            rectHeight.value = 1;
            rectStyle.checked = true; // filled
            rectCentered.checked = false;
            rectCorners.checked = false; // not rounded
        }
    }
    
    function setupLabelItem() {
        //console.warn(`setupLabelItem `,JSON.stringify(editingItem,null,2));
        labelProperties.style.display = 'block';
        if (editingItem) {
          labelXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          labelYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
          labelText.value = (isDefinedAndNotNull(editingItem.text)?editingItem.text:'Text');
          labelFontSize.value = (isDefinedAndNotNull(editingItem.fontSize)?editingItem.fontSize:0);
          labelAlign.value = (isDefinedAndNotNull(editingItem.align)?editingItem.align:'left');
          labelBold.checked = checkBool(editingItem.bold);
          labelItalic.checked = checkBool(editingItem.italic);
          labelUnderline.checked = checkBool(editingItem.underline);
          labelValue.value = (isDefinedAndNotNull(editingItem.value)?editingItem.value:'');
          labelDecimals.value = (isDefinedAndNotNull(editingItem.decimals)?editingItem.decimals:2);
          labelUnits.value = (isDefinedAndNotNull(editingItem.units)?editingItem.units:'');            
        } else  {
            labelXOffset.value = Math.floor(canvasWidth / 4);
            labelYOffset.value = Math.floor(canvasHeight / 4);
            labelText.value = 'Text';
            labelFontSize.value = 0;
            labelAlign.value = 'left';
            labelBold.checked = false;
            labelItalic.checked = false;
            labelUnderline.checked = false;
            labelValue.value = 50;
            labelDecimals.value = 2;
            labelUnits.value = '';            
        }
    }
    
    function setupValueItem() {
        //console.warn(`setupValueItem `,JSON.stringify(editingItem,null,2));
        valueProperties.style.display = 'block';
        if (editingItem) {
          valueXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          valueYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
          valueText.value = (isDefinedAndNotNull(editingItem.text)?editingItem.text:'Text');
          valueFontSize.value = (isDefinedAndNotNull(editingItem.fontSize)?editingItem.fontSize:0);
          valueAlign.value = (isDefinedAndNotNull(editingItem.align)?editingItem.align:'left');
          valueBold.checked = checkBool(editingItem.bold);
          valueBold.checked = checkBool(editingItem.bold);
          valueItalic.checked = checkBool(editingItem.italic);
          valueUnderline.checked = checkBool(editingItem.underline);
            valueIntValue.value = (isDefinedAndNotNull(editingItem.intValue)?editingItem.intValue:50);
            valueMin.value = (isDefinedAndNotNull(editingItem.min)?editingItem.min:0);
            valueMax.value = (isDefinedAndNotNull(editingItem.max)?editingItem.max:100);
            valueDisplayMin.value = (isDefinedAndNotNull(editingItem.displayMin)?editingItem.displayMin:0.0);
            valueDisplayMax.value = (isDefinedAndNotNull(editingItem.displayMax)?editingItem.displayMax:1.0);
            valueDecimals.value = (isDefinedAndNotNull(editingItem.decimals)?editingItem.decimals:2);
            valueUnits.value = (isDefinedAndNotNull(editingItem.units)?editingItem.units:'');            
        } else  {
            valueXOffset.value = Math.floor(canvasWidth / 4);
            valueYOffset.value = Math.floor(canvasHeight / 4);
            valueText.value = 'Text';
            valueFontSize.value = 0;
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
    }
    
    function setupCircleItem() {
        circleProperties.style.display = 'block';
        if (editingItem) {
          circleXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          circleYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
          circleRadius.value = (isDefinedAndNotNull(editingItem.radius)?editingItem.radius:5);
          circleFilled.checked = checkBool(editingItem.filled);
        } else {
            circleXOffset.value = Math.floor(canvasWidth / 2);
            circleYOffset.value = Math.floor(canvasHeight / 2);
            circleRadius.value = 5;
            circleFilled.checked = false;
        }
    }
    
    function setupArcItem() {
        arcProperties.style.display = 'block';
        if (editingItem) {
          arcXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          arcYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
          arcRadius.value = (isDefinedAndNotNull(editingItem.radius)?editingItem.radius:5);
          arcFilled.checked = checkBool(editingItem.filled);
          arcStart.value = (isDefinedAndNotNull(editingItem.start)?editingItem.start:0);
          arcAngle.value = (isDefinedAndNotNull(editingItem.angle)?editingItem.angle:90);
        } else {
            arcXOffset.value = Math.floor(canvasWidth / 2);
            arcYOffset.value = Math.floor(canvasHeight / 2);
            arcRadius.value = 5;
            arcStart.value = 0;
            arcAngle.value = 90;
            arcFilled.checked = false;
        }
    }
    
    function setupTouchZoneItem() {
        touchZoneProperties.style.display = 'block';
        hideColorPicker();
        
        if (!isEditMode) {
            // Generate unique command name (always for new touchZones)
            const uniqueCommandName = generateUniqueTouchZoneCommandName();
            touchZoneName.value = uniqueCommandName;
            
            // Set position defaults only if canvas dimensions are available
            touchZoneXOffset.value = Math.floor(canvasWidth / 2);
            touchZoneYOffset.value = Math.floor(canvasHeight / 2);
            touchZoneXSize.value = 5;
            touchZoneYSize.value = 5;
            touchZoneFilter.value = 0; // TOUCH - default
            touchZoneCentered.checked = true;
            touchZonePriority.value = 0; // Default priority
        } else {
        //  touchZoneName.value = editingItem.cmdName || generateUniqueTouchZoneCommandName();
          touchZoneXSize.value = (isDefinedAndNotNull(editingItem.xSize)?editingItem.xSize:5);
          touchZoneYSize.value = (isDefinedAndNotNull(editingItem.ySize)?editingItem.ySize:5);
          touchZoneXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:Math.floor(canvasWidth / 2));
          touchZoneYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:Math.floor(canvasHeight / 2));
          touchZoneCentered.checked =  checkBool(editingItem.centered);
          touchZoneFilter.value = (isDefinedAndNotNull(editingItem.filter)?editingItem.filter:0);
          touchZonePriority.value = (isDefinedAndNotNull(editingItem.priority)?editingItem.priority:0);
        }
    }
    
    function setupInsertDwgItem() {
        insertDwgProperties.style.display = 'block';
        hideColorPicker();
        
        if ((editingItem) && (editingItem.type == 'insertDwg')) {
          insertDwgXOffset.value = (isDefinedAndNotNull(editingItem.xOffset)?editingItem.xOffset:0);
          insertDwgYOffset.value = (isDefinedAndNotNull(editingItem.yOffset)?editingItem.yOffset:0);
        } else {
          insertDwgXOffset.value = 0;
          insertDwgYOffset.value = 0;
        }
        // Refresh available drawings and update preview when done
        loadAvailableDrawings(() => {
            updatePreview();
        });
    }
    
    function setupIndexItem() {
        indexProperties.style.display = 'block';
        hideColorPicker();
    }
    
    function setupPushZeroItem() {
        pushProperties.style.display = 'block';
        if (editingItem) {
          pushX.value = (isDefinedAndNotNull(editingItem.x)?editingItem.x:0);
          pushY.value = (isDefinedAndNotNull(editingItem.y)?editingItem.y:0);
          pushScale.value = (isDefinedAndNotNull(editingItem.scale)?editingItem.scale:1);
        } else {
        pushX.value = 0;
        pushY.value = 0;
        pushScale.value = 1.0;
        }        
    }
    
    function setupPopZeroItem() {
        popProperties.style.display = 'block';
    }
    
    function setupEraseItem() {
        eraseProperties.style.display = 'block';
    }
    
    function setupHideItem() {
        hideProperties.style.display = 'block';
    }
    
    function setupUnhideItem() {
        unhideProperties.style.display = 'block';
    }
    
    // Main item type change handler
    function handleItemTypeChange() {
        const itemType = itemTypeDropdown.value;
        console.log(`Item type changed to: ${itemType}`);
        
        // Hide all property sections first
        hideAllProperties();
        
        // Show iframe by default
        const iframeContainer = document.querySelector('.iframe-container');
        if (iframeContainer) {
            iframeContainer.style.display = 'block';
        }
        
        // Route to appropriate handler based on item capability
        if (isIndexableItem(itemType)) {
            handleIndexableItem(itemType);
        } else if (isSpecialItem(itemType)) {
            handleSpecialItem(itemType);
        } else if (isControlItem(itemType)) {
            handleControlItem(itemType);
        }
        
        updatePreview();
    }
    
    // Fetch drawing information
    function fetchDrawingInfo() {
        fetch(`/api/drawings/${drawingName}/data`)
            .then(response => response.json())
            .then(data => {
                drawingData = data;
                canvasWidth = data.canvasWidth || data.x || 100;
                canvasHeight = data.canvasHeight || data.y || 100;
                
                console.log(`Loaded drawing info: ${canvasWidth}x${canvasHeight}`);
                
                // Update the page title to include drawing name and size
                const drawingTitle = document.getElementById('drawing-title');
                if (drawingTitle) {
                    drawingTitle.textContent = `Add Item to ${drawingName} ${canvasWidth}x${canvasHeight}`;
                }
                
                // Also update the document title for browser tab
                document.title = `Add Item to ${drawingName} (${canvasWidth}x${canvasHeight})`;
                
                // We don't need to check for localStorage data anymore
                // We'll just use the server data we already have
                
                // Update default values based on canvas size (only when not in edit mode)
                if (!isEditMode) {
                    handleItemTypeChange();
                }
                
                // Add 1-second timer to post current item values after page load
                setTimeout(() => {
                    console.log('Auto-posting initial item values after 1-second delay');
                    updatePreview();
                }, 1000);
            })
            .catch(error => {
                console.error('Error fetching drawing info:', error);
            });
    }
    
    // Load the item being edited
    function loadEditingItem() {
        if (!editIndex) return;
        
        console.log(`Loading item for editing: index ${editIndex}`);
        
        // Fetch the drawing data to get the item get from _edit_preview which is
        // created BEFORE this page opened, this is to make sure the
        // touchZone cmd matches the actions and actionsInput in case
        // the touchZone cmdName is edited
        fetch(`/${drawingName}_edit_preview`, {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
        .then(response => response.json())
        .then(drawingData => {
            if (!drawingData.items || !drawingData.items[editIndex]) {
                alert(`Item at index ${editIndex} not found`);
                return;
            }
            
            editingItem = drawingData.items[editIndex];
            console.log('Loaded item for editing:', editingItem);
            
            // Store original cmd value for touchZone items to link up later
            if (editingItem.type === 'touchZone' && editingItem.cmd) {
                originalTouchZoneCmd = editingItem.cmd;
                console.log('Stored original touchZone cmd, originalTouchZoneCmd');
            }
            
            // Populate the form with the item's values
            populateFormWithItem(editingItem);
            if (editingItem.type == 'touchZone') {
              itemTypeDropdown.disabled = true;              
            } else {
              itemTypeDropdown.disabled = false;
              const itemTypeDropdownTouchZone = document.getElementById('option-touchZone');
              if (itemTypeDropdownTouchZone) {
                itemTypeDropdownTouchZone.remove();
              }
            }              
            
            // Update the Add Item button text and page title
            if (addItemBtn) {
                addItemBtn.textContent = 'Update Item';
            }
            document.title = `Edit Item - ${drawingName}`;
            
            // Update page heading if it exists
            const pageHeading = document.querySelector('h1');
            if (pageHeading && pageHeading.textContent.includes('Add Item')) {
                pageHeading.textContent = `Edit ${editingItem.type} Item`;
            }
        })
        .catch(error => {
            console.error('Error loading item for editing:', error);
            alert('Failed to load item for editing');
        });
    }
    
    // Populate form fields with item values
    function populateFormWithItem(item) {
        console.log('Populating form with item:', item);
        
        // Set the item type dropdown
        if (itemTypeDropdown && item.type) {
            itemTypeDropdown.value = item.type;
            
        }
        
        
        // For all other types, populate immediately
        populateFormFieldsForItem(item);
        
        // Now that the form is populated with the correct item type, 
        // add the event listener for future changes
        if (isEditMode) {
            itemTypeDropdown.addEventListener('change', handleItemTypeChange);
        }
        handleItemTypeChange(); // Show the correct property panel
    }
    
    // Helper function to populate form fields (separated from async dropdown loading)
    function populateFormFieldsForItem(item) {
        // Populate common fields
        if (itemColor) {
          if (item.color !== undefined) {
            itemColor.value = item.color;
          } else {
            itemColor.value = 15;
            item.color = 15;
          }
          // Update color picker display
          updateColorPickerDisplay('item-color', item.color);
        }
        if (item.indexed) {
            itemIdxEnable.checked = true;
            itemIdxName.style.display = 'block';
            
            // Populate idxName
            if (item.idxName) {
                itemIdxName.value = item.idxName;
            }
        } else {
            itemIdxEnable.checked = false;
            itemIdxName.style.display = 'none';
            itemIdxName.value = '';
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
                
            case 'touchZone':
                if (touchZoneXSize && item.xSize !== undefined) touchZoneXSize.value = item.xSize;
                if (touchZoneYSize && item.ySize !== undefined) touchZoneYSize.value = item.ySize;
                if (touchZoneXOffset && item.xOffset !== undefined) touchZoneXOffset.value = item.xOffset;
                if (touchZoneYOffset && item.yOffset !== undefined) touchZoneYOffset.value = item.yOffset;
                if (touchZoneName && item.cmdName !== undefined) touchZoneName.value = item.cmdName ;
                if (touchZoneFilter && item.filter !== undefined) touchZoneFilter.value = item.filter;
                if (touchZoneCentered && item.centered !== undefined) touchZoneCentered.checked = item.centered === 'true';
                if (touchZonePriority && item.priority !== undefined) touchZonePriority.value = item.priority;
                break;
                
                
            case 'pushZero':
                if (pushX && item.x !== undefined) pushX.value = item.x;
                if (pushY && item.y !== undefined) pushY.value = item.y;
                if (pushScale && item.scale !== undefined) pushScale.value = item.scale;
                break;
                
            case 'insertDwg':
                if (insertDwgName && item.drawingName !== undefined) insertDwgName.value = item.drawingName;
                if (insertDwgXOffset && item.xOffset !== undefined) insertDwgXOffset.value = item.xOffset;
                if (insertDwgYOffset && item.yOffset !== undefined) insertDwgYOffset.value = item.yOffset;
                break;
                
            case 'label':
                if (labelXOffset && item.xOffset !== undefined) labelXOffset.value = item.xOffset;
                if (labelYOffset && item.yOffset !== undefined) labelYOffset.value = item.yOffset;
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
                if (valueXOffset && item.xOffset !== undefined) valueXOffset.value = item.xOffset;
                if (valueYOffset && item.yOffset !== undefined) valueYOffset.value = item.yOffset;
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
                if (circleXOffset && item.xOffset !== undefined) circleXOffset.value = item.xOffset;
                if (circleYOffset && item.yOffset !== undefined) circleYOffset.value = item.yOffset;
                if (circleRadius && item.radius !== undefined) circleRadius.value = item.radius;
                if (circleFilled && item.filled !== undefined) circleFilled.checked = item.filled === 'true';
                break;
                
            case 'arc':
                if (arcXOffset && item.xOffset !== undefined) arcXOffset.value = item.xOffset;
                if (arcYOffset && item.yOffset !== undefined) arcYOffset.value = item.yOffset;
                if (arcRadius && item.radius !== undefined) arcRadius.value = item.radius;
                if (arcStart && item.start !== undefined) arcStart.value = item.start;
                if (arcAngle && item.angle !== undefined) arcAngle.value = item.angle;
                if (arcFilled && item.filled !== undefined) arcFilled.checked = item.filled === 'true';
                break;
                
            case 'hide':
                const hideTypeSelect = document.getElementById('hide-type');
                const hideIdxInput = document.getElementById('hide-idx');
                const hideCmdInput = document.getElementById('hide-cmd');
                if (item.idx !== undefined) {
                    hideTypeSelect.value = 'idx';
                    hideIdxInput.value = item.idx;
                    toggleHideInputs();
                } else if (item.cmd !== undefined) {
                    hideTypeSelect.value = 'cmd';
                    hideCmdInput.value = item.cmd;
                    toggleHideInputs();
                }
                break;
                
            case 'unhide':
                const unhideTypeSelect = document.getElementById('unhide-type');
                const unhideIdxInput = document.getElementById('unhide-idx');
                const unhideCmdInput = document.getElementById('unhide-cmd');
                if (item.idx !== undefined) {
                    unhideTypeSelect.value = 'idx';
                    unhideIdxInput.value = item.idx;
                    toggleUnhideInputs();
                } else if (item.cmd !== undefined) {
                    unhideTypeSelect.value = 'cmd';
                    unhideCmdInput.value = item.cmd;
                    toggleUnhideInputs();
                }
                break;
                
            case 'erase':
                const eraseTypeSelect = document.getElementById('erase-type');
                const eraseIdxInput = document.getElementById('erase-idx');
                const eraseCmdInput = document.getElementById('erase-cmd');
                if (item.idx !== undefined) {
                    eraseTypeSelect.value = 'idx';
                    eraseIdxInput.value = item.idx;
                    toggleEraseInputs();
                } else if (item.cmd !== undefined) {
                    eraseTypeSelect.value = 'cmd';
                    eraseCmdInput.value = item.cmd;
                    toggleEraseInputs();
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
                    console.warn(`Ignoring special offset value ${value}, using 0 instead`);
                    typeSelect.value = 'number';
                    input.style.display = 'block';
                    input.value = 0;
            } else {
                typeSelect.value = 'number';
                input.style.display = 'block';
                input.value = value;
            }
        }
    }
    
    // Fetch available drawings for insertion
    function loadAvailableDrawings(callback) {
        fetch(`/api/drawings/available-for-insert?currentDrawing=${encodeURIComponent(drawingName)}`)
            .then(response => response.json())
            .then(data => {
                if (data.success && data.drawings && data.drawings.length > 0) {
                    // Clear existing options
                    insertDwgName.innerHTML = '';
                    
                    // Add available drawings to dropdown
                    data.drawings.forEach(drawing => {
                        const option = document.createElement('option');
                        option.value = drawing.name;
                        option.textContent = `${drawing.name} (${drawing.canvasWidth}x${drawing.canvasHeight})`;
                        insertDwgName.appendChild(option);
                    });
                    
                    console.log(`Loaded ${data.drawings.length} available drawings for insertion`);
                } else {
                    insertDwgName.innerHTML = '<option value="">No drawings available for insertion</option>';
                    console.log('No available drawings for insertion');
                }
                
                // If in edit mode and editing an insertDwg item, add current drawing back to the list
                if (isEditMode && editingItem && editingItem.type === 'insertDwg' && editingItem.drawingName) {
                    const currentDrawingName = editingItem.drawingName;
                    
                    // Check if the current drawing already exists in the list (shouldn't, but just in case)
                    const existingOption = Array.from(insertDwgName.options).find(option => option.value === currentDrawingName);
                    
                    if (!existingOption) {
                        // Check if the drawing still exists on the server
                        fetch(`/api/drawings/${encodeURIComponent(currentDrawingName)}/exists`)
                            .then(response => response.json())
                            .then(existsData => {
                                const option = document.createElement('option');
                                option.value = currentDrawingName;
                                
                                if (existsData.exists) {
                                    // Drawing exists on server
                                    const dimensions = existsData.dimensions ? `${existsData.dimensions.width}x${existsData.dimensions.height}` : 'unknown size';
                                    option.textContent = `${currentDrawingName} (${dimensions})`;
                                } else {
                                    // Drawing no longer exists on server
                                    option.textContent = `${currentDrawingName} (not loaded)`;
                                    option.style.color = 'red';
                                    option.style.fontStyle = 'italic';
                                }
                                
                                // Add to the beginning of the list
                                insertDwgName.insertBefore(option, insertDwgName.firstChild);
                                
                                // Select the current drawing
                                insertDwgName.value = currentDrawingName;
                                
                                console.log(`Added current insertDwg drawing "${currentDrawingName}" back to list`);
                            })
                            .catch(error => {
                                console.error('Error checking if drawing exists:', error);
                                // Still add the option but mark as unknown status
                                const option = document.createElement('option');
                                option.value = currentDrawingName;
                                option.textContent = `${currentDrawingName} (status unknown)`;
                                option.style.color = 'orange';
                                option.style.fontStyle = 'italic';
                                insertDwgName.insertBefore(option, insertDwgName.firstChild);
                                insertDwgName.value = currentDrawingName;
                            });
                    } else {
                        // Current drawing already in list, just select it
                        insertDwgName.value = currentDrawingName;
                    }
                }
                
                // Call callback if provided
                if (callback && typeof callback === 'function') {
                    callback();
                }
            })
            .catch(error => {
                console.error('Error loading available drawings:', error);
                insertDwgName.innerHTML = '<option value="">Error loading drawings</option>';
                
                // Call callback even on error if provided
                if (callback && typeof callback === 'function') {
                    callback();
                }
            });
    }
    
    

    // Update preview in iframe
    function updatePreview() {
        if (!drawingData) return;
        
        
        const itemType = itemTypeDropdown.value;
        let tempItem = {
            type: itemType
        };
        
        // Add indexed flag and name for line, rectangle, circle, arc, label, value, index, erase, hide, and unhide types
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'circle' || itemType === 'arc' || itemType === 'label' || itemType === 'value' || itemType === 'index' || itemType === 'erase' || itemType === 'hide' || itemType === 'unhide') {
            if (itemIdxEnable.checked) {
                // Validate that name is provided and not empty
                if (!itemIdxName.value.trim()) {
                    console.error('Index name is required when indexed is enabled');
                    return;
                }
                
                // Validate that name is unique
                if (!isIndexNameUnique(itemIdxName.value.trim())) {
                    console.error('Index name must be unique');
                    // Add visual feedback for duplicate name
                    itemIdxName.style.borderColor = 'red';
                    itemIdxName.title = 'This index name is already in use. Please choose a different name.';
                    return;
                } else {
                    // Reset visual feedback if name is valid
                    itemIdxName.style.borderColor = '';
                    itemIdxName.title = '';
                }
                
                tempItem.indexed = true;
                tempItem.idxName = itemIdxName.value.trim();
                // Numeric index is the row number where this item will be added (items are added at the end)
                // Use 'idx' property for pfodWeb viewer compatibility
                const newItemPosition = drawingData.items ? drawingData.items.length : 0;
                tempItem.idx = newItemPosition + 1;
            }
        }
        
        // Add color for line, rectangle, label, value, circle, and arc only (touchZone, index don't need color)
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc') {
            tempItem.color = isNaN(parseInt(itemColor.value))? 15 : parseInt(itemColor.value);
        }
        // Push, pop and insertDwg items never get an idx value
        
        if (itemType === 'line') {
            tempItem = {
                ...tempItem,
                xSize: parseFloat(lineX.value || 1),
                ySize: parseFloat(lineY.value || 1),
                xOffset: parseFloat(lineXOffset.value || 0),
                yOffset: parseFloat(lineYOffset.value || 0)
            };
        } else if (itemType === 'rectangle') {
            tempItem = {
                ...tempItem,
                xSize: parseFloat(rectWidth.value || 1),
                ySize: parseFloat(rectHeight.value || 1),
                xOffset: parseFloat(rectXOffset.value || 0),
                yOffset: parseFloat(rectYOffset.value || 0),
                filled: rectStyle.checked ? 'true' : 'false',
                centered: rectCentered.checked ? 'true' : 'false',
                rounded: rectCorners.checked ? 'true' : 'false'
            };
        } else if (itemType === 'label') {
            tempItem = {
                ...tempItem,
                xOffset: parseFloat(labelXOffset.value || 0),
                yOffset: parseFloat(labelYOffset.value || 0),
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
                xOffset: parseFloat(valueXOffset.value || 0),
                yOffset: parseFloat(valueYOffset.value || 0),
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
                xOffset: parseFloat(circleXOffset.value || 0),
                yOffset: parseFloat(circleYOffset.value || 0),
                radius: parseFloat(circleRadius.value || 1),
                filled: circleFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'arc') {
            tempItem = {
                ...tempItem,
                xOffset: parseFloat(arcXOffset.value || 0),
                yOffset: parseFloat(arcYOffset.value || 0),
                radius: parseFloat(arcRadius.value || 1),
                start: parseFloat(arcStart.value || 0),
                angle: parseFloat(arcAngle.value || 90),
                filled: arcFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'touchZone') {
            // Validate command name is provided and unique
            if (!touchZoneName.value.trim()) {
                console.error('Command name is required for touchZone items');
                return;
            }
            
            if (!isTouchZoneCommandNameUnique(touchZoneName.value.trim())) {
                console.error('TouchZone command name must be unique');
                // Add visual feedback for duplicate command name
                touchZoneName.style.borderColor = 'red';
                touchZoneName.style.backgroundColor = '#ffebee';
                touchZoneName.title = 'This command name is already in use. Please choose a different name.';
                return;
            } else {
                // Reset visual feedback if command name is valid
                touchZoneName.style.borderColor = '';
                touchZoneName.style.backgroundColor = '';
                touchZoneName.title = '';
            }
            
            tempItem = {
                ...tempItem,
                xSize: parseFloat(touchZoneXSize.value || 5),
                ySize: parseFloat(touchZoneYSize.value || 5),
                xOffset: parseFloat(touchZoneXOffset.value || 0),
                yOffset: parseFloat(touchZoneYOffset.value || 0),
                cmdName: touchZoneName.value.trim(),
                cmd: isEditMode && originalTouchZoneCmd ? originalTouchZoneCmd : touchZoneName.value.trim(),
                filter: parseInt(touchZoneFilter.value || 0),
                centered: touchZoneCentered.checked ? 'true' : 'false',
                priority: parseInt(touchZonePriority.value || 0)
            };
            
        } else if (itemType === 'insertDwg') {
            const selectedDrawingName = insertDwgName.value;
            if (!selectedDrawingName) {
                console.log('No drawing selected for insertion');
                return; // Don't update preview if no drawing is selected
            }
            
            tempItem = {
                ...tempItem,
                drawingName: selectedDrawingName,
                xOffset: parseFloat(insertDwgXOffset.value || 0),
                yOffset: parseFloat(insertDwgYOffset.value || 0)
            };
        } else if (itemType === 'pushZero') {
            tempItem = {
                ...tempItem,
                x: parseFloat(pushX.value || 0),
                y: parseFloat(pushY.value || 0),
                scale: parseFloat(pushScale.value || 1.0)
            };
        }
        // No additional properties needed for pop
        // update editingItem
        editingItem = tempItem;
        
        // Update the temporary copy with the new item
        if (tempDrawingName) {
            const requestBody = { item: tempItem };
            
            // If in edit mode, include the edit index
            if (isEditMode && editIndex !== null) {
                requestBody.editIndex = parseInt(editIndex);
            }
            
            fetch(`/api/drawings/${tempDrawingName}/temp-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }).then(response => response.json())
            .then(data => {
                if (data.success) {
                    console.log('Temporary drawing updated for preview');
                    // Trigger restart in existing iframe instead of reloading
                    safelyCallInitializeApp(previewIframe);
                } else {
                    console.error('Error updating temporary drawing:', data.error);
                }
            }).catch(error => {
                console.error('Error updating temporary drawing:', error);
            });
        } else {
            console.warn('No temporary drawing available for preview update');
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
        
        // Add indexed flag and name for line, rectangle, label, value, circle, arc, and index types
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc' || itemType === 'index') {
            if (itemIdxEnable.checked) {
                // Validate that name is provided and not empty
                if (!itemIdxName.value.trim()) {
                    alert('Index name is required when Use Index is enabled');
                    return;
                }
                
                // Validate that name is unique
                if (!isIndexNameUnique(itemIdxName.value.trim())) {
                    alert('Index name must be unique. Please choose a different name.');
                    return;
                }
                
                newItem.indexed = true;
                newItem.idxName = itemIdxName.value.trim();
                // Numeric index is the row number where this item will be added (items are added at the end)
                // Use 'idx' property for pfodWeb viewer compatibility
                const newItemPosition = drawingData.items ? drawingData.items.length : 0;
                newItem.idx = newItemPosition + 1;
            }
        }
        
        // Handle erase, hide, and unhide types with cmd or idx parameters
        if (itemType === 'erase' || itemType === 'hide' || itemType === 'unhide') {
            const typeSelect = document.getElementById(`${itemType}-type`);
            const idxInput = document.getElementById(`${itemType}-idx`);
            const cmdInput = document.getElementById(`${itemType}-cmd`);
            
            if (typeSelect.value === 'idx') {
                if (!idxInput.value || parseInt(idxInput.value) < 1) {
                    alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} items must have an index value ≥ 1`);
                    return;
                }
                newItem.idx = parseInt(idxInput.value);
            } else {
                if (!cmdInput.value || cmdInput.value.trim() === '') {
                    alert(`${itemType.charAt(0).toUpperCase() + itemType.slice(1)} items must have a command value`);
                    return;
                }
                newItem.cmd = cmdInput.value.trim();
            }
        }
        
        // Add color for line, rectangle, label, value, circle, and arc only (touchZone, index don't need color)
        if (itemType === 'line' || itemType === 'rectangle' || itemType === 'label' || itemType === 'value' || itemType === 'circle' || itemType === 'arc') {
            newItem.color = isNaN(parseInt(itemColor.value))? 15 : parseInt(itemColor.value);
        }
        // Push, pop and insertDwg items never get an idx value
        
        if (itemType === 'line') {
            newItem = {
                ...newItem,
                xSize: parseFloat(lineX.value || 1),
                ySize: parseFloat(lineY.value || 1),
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
                xOffset: parseFloat(labelXOffset.value || 0),
                yOffset: parseFloat(labelYOffset.value || 0),
                text: labelText.value || '',
                fontSize: parseFloat(labelFontSize.value || 0),
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
                xOffset: parseFloat(valueXOffset.value || 0),
                yOffset: parseFloat(valueYOffset.value || 0),
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
                xOffset: parseFloat(circleXOffset.value || 0),
                yOffset: parseFloat(circleYOffset.value || 0),
                radius: parseFloat(circleRadius.value || 1),
                filled: circleFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'arc') {
            newItem = {
                ...newItem,
                xOffset: parseFloat(arcXOffset.value || 0),
                yOffset: parseFloat(arcYOffset.value || 0),
                radius: parseFloat(arcRadius.value || 1),
                start: parseFloat(arcStart.value || 0),
                angle: parseFloat(arcAngle.value || 90),
                filled: arcFilled.checked ? 'true' : 'false'
            };
        } else if (itemType === 'touchZone') {
            // Validate command name is provided
            if (!touchZoneName.value.trim()) {
                alert('Command name is required for touchZone items');
                return;
            }
            
            // Validate command name is unique
            if (!isTouchZoneCommandNameUnique(touchZoneName.value.trim())) {
                alert('TouchZone command name must be unique. Please choose a different name.');
                return;
            }
            
            newItem = {
                ...newItem,
                xSize: parseFloat(touchZoneXSize.value || 5),
                ySize: parseFloat(touchZoneYSize.value || 5),
                xOffset: parseFloat(touchZoneXOffset.value || 0),
                yOffset: parseFloat(touchZoneYOffset.value || 0),
                cmdName: touchZoneName.value.trim(),
                cmd: isEditMode && originalTouchZoneCmd ? originalTouchZoneCmd : touchZoneName.value.trim(),
                filter: parseInt(touchZoneFilter.value || 0),
                centered: touchZoneCentered.checked ? 'true' : 'false',
                priority: parseInt(touchZonePriority.value || 0)
            };
            
        } else if (itemType === 'insertDwg') {
            const selectedDrawingName = insertDwgName.value;
            if (!selectedDrawingName) {
                alert('Please select a drawing to insert');
                return;
            }
            
            newItem = {
                ...newItem,
                drawingName: selectedDrawingName,
                xOffset: parseFloat(insertDwgXOffset.value || 0),
                yOffset: parseFloat(insertDwgYOffset.value || 0)
            };
        } else if (itemType === 'pushZero') {
            newItem = {
                ...newItem,
                x: parseFloat(pushX.value || 0),
                y: parseFloat(pushY.value || 0),
                scale: parseFloat(pushScale.value || 1.0)
            };
        }
        // No additional properties needed for pop
        
        console.log('Adding item to drawing:', newItem);
        
        
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
        if (tempDrawingName) {
            // Add the final item to the temporary drawing, then accept all changes
            fetch(`/api/drawings/${tempDrawingName}/temp-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ item: newItem })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || "Failed to add item to temporary drawing");
                }
                
                // Now accept all changes from temporary to real drawing
                return fetch(`/api/drawings/${tempDrawingName}/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || "Failed to accept changes");
                }
                
                console.log('Changes accepted and applied to real drawing');
                handleSuccess();
            })
            .catch(error => {
                handleError(error);
            });
        } else {
            // Fallback to old method if no temporary drawing
            const requestData = {
                drawingName: drawingName,
                item: newItem
            };
            
            fetch('/api/drawing/add-item', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(requestData)
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server returned ${response.status}: ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('Server response:', data);
                
                if (!data.success) {
                    throw new Error(data.error || "Failed to add item to drawing");
                }
                
                handleSuccess();
            })
            .catch(error => {
                handleError(error);
            });
        }
    }
    
    // Function to update an existing item
    function updateExistingItem(updatedItem) {
        if (tempDrawingName) {
            // Update the specific item in the temporary drawing, then accept all changes
            fetch(`/api/drawings/${tempDrawingName}/temp-update`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    item: updatedItem,
                    editIndex: parseInt(editIndex)
                })
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || "Failed to update item in temporary drawing");
                }
                
                // Now accept all changes from temporary to real drawing
                return fetch(`/api/drawings/${tempDrawingName}/accept`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            })
            .then(response => response.json())
            .then(data => {
                if (!data.success) {
                    throw new Error(data.error || "Failed to accept changes");
                }
                
                console.log('Edit changes accepted and applied to real drawing');
                handleSuccess();
            })
            .catch(error => {
                handleError(error);
            });
        } else {
            // Fallback to old method if no temporary drawing
            console.error('No temporary drawing available for edit mode');
            handleError(new Error('No temporary drawing available for edit mode'));
        }
    }
    
    // Handle successful operation
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
        
        if (typeSelect.value === 'number') {
            input.style.display = 'block';
            input.type = 'number';
            input.placeholder = '';
        } else {
            input.style.display = 'none';
        }
    };
    
    // Global functions to toggle hide/unhide/erase input types
    window.toggleEraseInputs = function() {
        const typeSelect = document.getElementById('erase-type');
        const idxInput = document.getElementById('erase-idx-input');
        const cmdInput = document.getElementById('erase-cmd-input');
        
        if (typeSelect.value === 'idx') {
            idxInput.style.display = 'block';
            cmdInput.style.display = 'none';
        } else {
            idxInput.style.display = 'none';
            cmdInput.style.display = 'block';
        }
    };
    
    window.toggleHideInputs = function() {
        const typeSelect = document.getElementById('hide-type');
        const idxInput = document.getElementById('hide-idx-input');
        const cmdInput = document.getElementById('hide-cmd-input');
        
        if (typeSelect.value === 'idx') {
            idxInput.style.display = 'block';
            cmdInput.style.display = 'none';
        } else {
            idxInput.style.display = 'none';
            cmdInput.style.display = 'block';
        }
    };
    
    window.toggleUnhideInputs = function() {
        const typeSelect = document.getElementById('unhide-type');
        const idxInput = document.getElementById('unhide-idx-input');
        const cmdInput = document.getElementById('unhide-cmd-input');
        
        if (typeSelect.value === 'idx') {
            idxInput.style.display = 'block';
            cmdInput.style.display = 'none';
        } else {
            idxInput.style.display = 'none';
            cmdInput.style.display = 'block';
        }
    };
    
    // Helper function to get offset value (numeric or COL/ROW)
    function getOffsetValue(inputId) {
        const typeSelect = document.getElementById(inputId + '-type');
        const input = document.getElementById(inputId);
        
//        if (typeSelect.value === 'number') {
            return parseFloat(input.value || 0);
//        } else {
//            return typeSelect.value; // Returns 'COL' or 'ROW'
//        }
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

    // Call handleItemTypeChange once to initialize the UI correctly (only when not in edit mode)
    if (!isEditMode) {
        handleItemTypeChange();
    }

    // Function to handle cancel button - general purpose for all item types
    function cancel() {
        if (tempDrawingName) {
            // Cancel the temporary changes
            fetch(`/api/drawings/${tempDrawingName}/cancel`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(() => {
                console.log('Temporary changes cancelled');
                window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
            })
            .catch(error => {
                console.error('Error cancelling temporary changes:', error);
                // Still navigate back even if cancel fails
                window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
            });
        } else {
            // No temporary drawing to cancel
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
        }
    }
    
});