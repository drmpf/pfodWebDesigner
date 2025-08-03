/*   
   touchActionInput.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// TouchActionInput Direct Editor

document.addEventListener('DOMContentLoaded', () => {
    console.log("TouchActionInput editor loaded");
    
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const drawingName = params.get('drawing');
    const cmdName = params.get('cmdName');
    
    if (!drawingName || !cmdName) {
        alert('Missing drawing name or cmdName parameter');
        window.location.href = '/control.html';
        return;
    }
    
    // DOM Elements
    const drawingNameDisplay = document.getElementById('drawing-name');
    const touchZoneCmdDisplay = document.getElementById('touchzone-cmd');
    const promptInput = document.getElementById('prompt-input');
    const textIdxSelect = document.getElementById('textidx-select');
    const fontSizeInput = document.getElementById('fontsize-input');
    const colorInput = document.getElementById('color-input');
    const backgroundColorInput = document.getElementById('bgcolor-input');
    const saveBtn = document.getElementById('save-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    const previewIframe = document.getElementById('preview-iframe');
    
    // Variables
    let currentDrawingData = null;
    let editingItemIndex = -1;
    let isEditMode = false;
    let availableIndexedItems = [];
    let tempDrawingName = null; // Single temporary drawing for previews
    
    // Initialize color pickers
    createColorPicker('color-picker', 'color-input', 15);
    createColorPicker('bgcolor-picker', 'bgcolor-input', 0);
    
    // Function to cleanup temporary preview drawing
    function cleanupTempPreview() {
        if (tempDrawingName) {
            fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}`, {
                method: 'DELETE'
            }).catch(err => console.warn('Failed to cleanup temp preview:', tempDrawingName, err));
            tempDrawingName = null;
        }
    }
    
    // Initialize
    loadDrawingData();
    
    // Event Listeners
    saveBtn.addEventListener('click', saveTouchActionInput);
    cancelBtn.addEventListener('click', () => {
        cleanupTempPreview();
        window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
    });
    
    // Add real-time preview update listeners
    [promptInput, textIdxSelect, fontSizeInput, colorInput, backgroundColorInput].forEach(input => {
        input.addEventListener('input', () => {
            updatePreview();
            updatePreviewDialog();
        });
        input.addEventListener('change', () => {
            updatePreview();
            updatePreviewDialog();
        });
    });
    
    // Cleanup temp preview on page unload
    window.addEventListener('beforeunload', cleanupTempPreview);
    
    // Function to load drawing data
    function loadDrawingData() {
        // Load both drawing data and indexed items
        Promise.all([
            fetch(`/${drawingName}`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(response => response.json()),
            fetch(`/api/drawings/${encodeURIComponent(drawingName)}/indexed-labels`, {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            }).then(response => response.json())
        ])
        .then(([drawingData, indexedLabelsResponse]) => {
            console.log("Loaded drawing data:", drawingData);
            console.log("Loaded indexed labels:", indexedLabelsResponse);
            
            currentDrawingData = drawingData;
            // Ensure drawing name is preserved for save operations
            currentDrawingData.name = drawingName;
            availableIndexedItems = indexedLabelsResponse.success ? indexedLabelsResponse.items : [];
            
            // Update display
            drawingNameDisplay.textContent = drawingName;
            touchZoneCmdDisplay.textContent = cmdName;
            
            // Populate textIdx dropdown
            populateTextIdxDropdown();
            
            // Find existing touchActionInput for this cmd
            const existingInput = drawingData.items.find((item, index) => {
                if (item.type === 'touchActionInput' && item.cmdName === cmdName) {
                    editingItemIndex = index;
                    return true;
                }
                return false;
            });
            
            if (existingInput) {
                // Edit mode - populate form with existing data
                isEditMode = true;
                populateForm(existingInput);
                saveBtn.textContent = 'Update touchActionInput';
            } else {
                // Add mode - set defaults
                isEditMode = false;
                setDefaultValues();
                saveBtn.textContent = 'Add touchActionInput';
            }
            
            // Create temporary drawing for previews
            createTempDrawing();
        })
        .catch(error => {
            console.error("Error loading data:", error);
            alert(`Failed to load data: ${error.message}`);
        });
    }
    
    // Function to create temporary drawing for previews
    function createTempDrawing() {
        console.log(`Creating temporary copy for touchActionInput preview: ${drawingName}`);
        
        fetch(`/api/drawings/${encodeURIComponent(drawingName)}/temp-copy`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`Failed to create temporary copy: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to create temporary copy');
            }
            
            tempDrawingName = data.tempName;
            console.log(`Created temporary copy for preview: ${tempDrawingName}`);
            
            // Disable refresh on temporary drawing
            return fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/set-refresh-zero`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to disable refresh on temporary copy');
            }
            console.log('Disabled refresh on temporary drawing for touchActionInput editing');
            
            // Set up the iframe source to use the temp drawing for full context
            setupPreviewIframeWithDrawing(previewIframe, tempDrawingName);
            
            // Now run initial preview update
            updatePreview();
            updatePreviewDialog();
        })
        .catch(error => {
            console.error('Error creating temporary drawing:', error);
            alert(`Failed to create temporary drawing: ${error.message}`);
        });
    }
    
    // Function to populate textIdx dropdown
    function populateTextIdxDropdown() {
        // Clear existing options
        textIdxSelect.innerHTML = '';
        
        if (availableIndexedItems.length === 0) {
            // No indexed items available
            const noItemsOption = document.createElement('option');
            noItemsOption.value = '';
            noItemsOption.textContent = 'No indexed labels or values available';
            noItemsOption.disabled = true;
            textIdxSelect.appendChild(noItemsOption);
        } else {
            // Add default "None" option
            const noneOption = document.createElement('option');
            noneOption.value = '';
            noneOption.textContent = 'Select a label or value...';
            textIdxSelect.appendChild(noneOption);
            
            // Add available indexed items
            availableIndexedItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.idx;
                
                // Get display text using the item-based method
                let displayText = getDisplayTextForItem(item);
                
                // Show "idxName: display text" format
                option.textContent = `${item.idxName}: ${displayText}`;
                textIdxSelect.appendChild(option);
            });
        }
    }
    
    // Function to populate form with existing data
    function populateForm(item) {
        promptInput.value = item.prompt || '';
        textIdxSelect.value = item.textIdx || '';
        fontSizeInput.value = item.fontSize;// || 2;
        colorInput.value = item.color;// || 15;
        backgroundColorInput.value = item.backgroundColor || 0;
    }
    
    // Function to set default values for new touchActionInput
    function setDefaultValues() {
        promptInput.value = 'Enter Value';
        textIdxSelect.value = '';
        fontSizeInput.value = 2;
        colorInput.value = 15;
        backgroundColorInput.value = 0;
    }
    
    // Function to save touchActionInput
    function saveTouchActionInput() {
        // Validate inputs
        const prompt = promptInput.value.trim();
        const textIdx = parseInt(textIdxSelect.value) || 0;
        const fontSize = parseInt(fontSizeInput.value) || 2;
        const color = isNaN(parseInt(colorInput.value))? 15 : parseInt(colorInput.value);
        const backgroundColor = parseInt(backgroundColorInput.value) || 0;
        
        if (!prompt) {
            alert('Prompt is required');
            promptInput.focus();
            return;
        }
        
        if (fontSize < 1 || fontSize > 10) {
            alert('Font size must be between 1 and 10');
            fontSizeInput.focus();
            return;
        }
        
        if (color < 0 || color > 255) {
            alert('Color must be between 0 and 255');
            colorInput.focus();
            return;
        }
        
        if (backgroundColor < 0 || backgroundColor > 255) {
            alert('Background color must be between 0 and 255');
            backgroundColorInput.focus();
            return;
        }
        
        // Find the selected item to get both idx and idxName
        let selectedIdxName = '';
        if (textIdx > 0) {
            const selectedItem = availableIndexedItems.find(item => item.idx === textIdx);
            if (selectedItem) {
                selectedIdxName = selectedItem.idxName || '';
            }
        }
        
        // Create touchActionInput item
        const touchActionInputItem = {
            type: 'touchActionInput',
         //   cmd: cmd,
            cmdName: cmdName,
            prompt: prompt,
            textIdx: textIdx,
            idxName: selectedIdxName,
            fontSize: fontSize,
            color: color,
            backgroundColor: backgroundColor
        };
        
        console.log('Saving touchActionInput:', touchActionInputItem);
        
        if (isEditMode) {
            // Update existing item
            currentDrawingData.items[editingItemIndex] = touchActionInputItem;
        } else {
            // Add new item - insert after the touchZone with same cmd
            const touchZoneIndex = currentDrawingData.items.findIndex(item => 
                item.type === 'touchZone' && item.cmdName === cmdName
            );
            
            if (touchZoneIndex !== -1) {
                // Insert right after the touchZone
                currentDrawingData.items.splice(touchZoneIndex + 1, 0, touchActionInputItem);
            } else {
                // Fallback: add at end if touchZone not found
                currentDrawingData.items.push(touchActionInputItem);
            }
        }
        
        // Save the drawing
        saveDrawingChanges();
    }
    
    // Function to save drawing changes
    function saveDrawingChanges() {
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
                console.log('TouchActionInput saved successfully');
                // Cleanup temp preview before navigating
                cleanupTempPreview();
                // Navigate back to edit drawing
                window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(drawingName)}`;
            } else {
                throw new Error(result.error || 'Failed to save touchActionInput');
            }
        })
        .catch(error => {
            console.error('Error saving touchActionInput:', error);
            alert(`Failed to save touchActionInput: ${error.message}`);
        });
    }
    
    // Function to update preview
    function updatePreview() {
        if (!currentDrawingData || !tempDrawingName) return;
        
        // Find the selected item to get both idx and idxName for preview
        const textIdx = parseInt(textIdxSelect.value) || 0;
        let selectedIdxName = '';
        if (textIdx > 0) {
            const selectedItem = availableIndexedItems.find(item => item.idx === textIdx);
            if (selectedItem) {
                selectedIdxName = selectedItem.idxName || '';
            }
        }
        
        // Create the touchActionInput item for preview
        const tempTouchActionInput = {
            type: 'touchActionInput',
          //  cmd: cmd,
            cmdName: cmdName,
            prompt: promptInput.value.trim() || 'Enter Value',
            textIdx: textIdx,
            idxName: selectedIdxName,
            fontSize: parseInt(fontSizeInput.value) || 2,
            color: isNaN(parseInt(colorInput.value))? 15 : parseInt(colorInput.value),
            backgroundColor: parseInt(backgroundColorInput.value) || 0
        };
        
        const requestBody = { item: tempTouchActionInput };
        
        // If in edit mode, include the edit index
        if (isEditMode && editingItemIndex !== -1) {
            requestBody.editIndex = editingItemIndex;
        }
        
        // Update the temporary drawing with the touchActionInput item
        fetch(`/api/drawings/${encodeURIComponent(tempDrawingName)}/temp-update`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                console.log('Temporary drawing updated for touchActionInput preview');
                // Trigger restart in existing iframe instead of reloading
                safelyCallInitializeApp(previewIframe);
            } else {
                console.error('Error updating temporary drawing:', data.error);
            }
        })
        .catch(error => {
            console.error('Error updating temporary drawing:', error);
        });
    }
    
    // Function to get display text for an item
    function getDisplayTextForItem(item) {
        if (!item) {
            return '';
        }
        
        if (item.type === 'label') {
            // Generate label text using same utility as drawLabel and displayTextUtils
            return addFormattedValueToText(item.text || '', item);
        } else if (item.type === 'value') {
            // For value items, get the displayed text (prefix + scaled value + units)
            const prefix = item.text || '';
            const intValue = parseFloat(item.intValue || 0);
            const min = parseFloat(item.min || 0);
            const max = parseFloat(item.max || 1);
            const displayMin = parseFloat(item.displayMin || 0.0);
            const displayMax = parseFloat(item.displayMax || 1.0);
            const decimals = parseInt(item.decimals || 2);
            const units = item.units || '';
            
            // Calculate scaled value using same logic as drawValue
            let maxMin = max - min;
            if (maxMin === 0) maxMin = 1;
            const scaledValue = (intValue - min) * (displayMax - displayMin) / maxMin + displayMin;
            
            return prefix + printFloatDecimals(scaledValue, decimals) + units;
        }
        
        return '';
    }
    
    // Function to get initial text for preview by finding selected item
    function getInitialTextForPreview() {
        const textIdx = parseInt(textIdxSelect.value) || 0;
        
        if (!textIdx || !availableIndexedItems) {
            return '';
        }
        
        // Find the item with the matching textIdx
        const item = availableIndexedItems.find(indexedItem => indexedItem.idx === textIdx);
        
        return getDisplayTextForItem(item);
    }
    
    // Function to update the preview dialog
    function updatePreviewDialog() {
        const previewPrompt = document.getElementById('preview-prompt');
        const previewInputDialog = document.getElementById('preview-input-dialog');
        const previewInput = document.getElementById('preview-input');
        
        if (!previewPrompt || !previewInputDialog || !previewInput) return;
        
        // Get current form values
        const prompt = promptInput.value.trim() || 'Enter Value';
        const fontSize = parseInt(fontSizeInput.value) || 2;
        const color = isNaN(parseInt(colorInput.value))? 15 : parseInt(colorInput.value);
        const backgroundColor = parseInt(backgroundColorInput.value) || 0;
        
        // Update prompt text
        previewPrompt.textContent = prompt;
        
        // Update input field with initial text
        const initialText = getInitialTextForPreview();
        previewInput.value = initialText;
        
        // Apply font size using the shared function from displayTextUtils
        const actualFontSize = getActualFontSizeForDialog(fontSize);
        previewPrompt.style.fontSize = `${actualFontSize}px`;
        
        // Apply colors using the shared function from displayTextUtils
        try {
            const textColor = convertColorToHex(color);
            const bgColor = convertColorToHex(backgroundColor);
            
            previewPrompt.style.color = textColor;
            previewPrompt.style.backgroundColor = bgColor;
        } catch (error) {
            console.error('Error converting colors:', error);
            // Fallback to basic colors
            previewPrompt.style.color = color === 15 ? '#ffffff' : '#000000';
            previewPrompt.style.backgroundColor = backgroundColor === 0 ? '#000000' : '#ffffff';
        }
    }
    
    // Auto Save functionality - fetch override to trigger JSON saves when Auto Save is enabled
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
        const [url, options] = args;
        
        // Check if this is a touchActionInput save operation and auto save is enabled
        const autoSaveEnabled = localStorage.getItem('autoSaveEnabled') !== 'false';
        const shouldAutoSave = autoSaveEnabled && (
            // TouchActionInput save changes
            (typeof url === 'string' && url.includes('/api/drawings/import') && options && options.method === 'POST')
        );
        
        const result = originalFetch.apply(this, args);
        
        // If this was a touchActionInput save operation and auto save is enabled, trigger save after successful response
        if (shouldAutoSave) {
            result.then(response => {
                if (response.ok) {
                    // Save immediately since page will redirect soon
                    if (autoSaveEnabled && drawingName) {
                        console.log('Auto Save enabled - saving touchActionInput changes as JSON');
                        saveDrawingAsJson(drawingName);
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