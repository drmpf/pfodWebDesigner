/*   
   control.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// pfodWeb Designer Control Panel
// DOM Elements
document.addEventListener('DOMContentLoaded', () => {
    console.log("Control panel loaded");
    
    // Tab controls
    const tabs = document.querySelectorAll('.tab');
    const tabContents = document.querySelectorAll('.tab-content');
    
    // Drawings tab
    const drawingsTable = document.getElementById('drawings-table').querySelector('tbody');
    
    // Action buttons
    const viewDrawingBtn = document.getElementById('view-drawing-btn');
    const editDrawingBtn = document.getElementById('edit-drawing-btn');
    const copyDrawingBtn = document.getElementById('copy-drawing-btn');
    const saveDrawingBtn = document.getElementById('save-drawing-btn');
    const arduinoExportBtn = document.getElementById('arduino-export-btn');
    const deleteDrawingBtn = document.getElementById('delete-drawing-btn');
    
    // Variable to track the currently selected drawing
    // Check localStorage for previously selected drawing
    let selectedDrawingName = localStorage.getItem('selectedDrawingName') || null;
    
    // Immediately disable all action buttons
    if (viewDrawingBtn) viewDrawingBtn.disabled = true;
    if (editDrawingBtn) editDrawingBtn.disabled = true;
    if (copyDrawingBtn) copyDrawingBtn.disabled = true;
    if (saveDrawingBtn) saveDrawingBtn.disabled = true;
    if (arduinoExportBtn) arduinoExportBtn.disabled = true;
    if (deleteDrawingBtn) deleteDrawingBtn.disabled = true;
    
    // Create drawing tab
    const createDrawingForm = document.getElementById('create-drawing-form');
    const drawingNameInput = document.getElementById('drawing-name');
    const canvasWidthInput = document.getElementById('canvas-width');
    const canvasHeightInput = document.getElementById('canvas-height');
    const canvasColorInput = document.getElementById('canvas-color');
    const canvasRefreshInput = document.getElementById('canvas-refresh');
    
    // Function to clean up edit preview drawings when returning to control panel
    function cleanupEditPreviews() {
        fetch('/api/cleanup-edit-previews', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('Edit preview cleanup completed:', result.message);
            } else {
                console.log('Edit preview cleanup failed:', result.error);
            }
        })
        .catch(error => {
            console.log('Edit preview cleanup error:', error);
            // Don't show alert for this, it's not critical
        });
    }
    
    // Function to clean up touchAction temporary drawings when returning to control panel
    function cleanupTouchActionTemps() {
        fetch('/api/cleanup-touchaction-temps', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                console.log('TouchAction temp cleanup completed:', result.message);
            } else {
                console.log('TouchAction temp cleanup failed:', result.error);
            }
        })
        .catch(error => {
            console.log('TouchAction temp cleanup error:', error);
            // Don't show alert for this, it's not critical
        });
    }
    
    // Initialize color picker for canvas color
    if (typeof createColorPicker !== 'undefined') {
        createColorPicker('canvas-color-picker', 'canvas-color', 0);
    }
    
    // Action buttons for drawings - already declared above
    // Removed duplicate declaration of addItemsBtn
    // Preview canvas no longer needed in main control page
    // const previewCanvas = document.getElementById('preview-canvas');
    // const previewCtx = previewCanvas ? previewCanvas.getContext('2d') : null;
    
    // No longer needed since we removed the Add Item button from the form
    
    // Tab switching
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab');
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show active content
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            
            // Make sure the tab content exists before trying to access it
            const tabContent = document.getElementById(`${tabId}-tab`);
            if (tabContent) {
                tabContent.classList.add('active');
            } else {
                // If the tab content doesn't exist, default to showing the drawings tab
                document.getElementById('drawings-tab').classList.add('active');
            }
            
            // When a user clicks the Create Drawing tab, ensure we still fetch the latest drawings
            // so the list updates when they return to the drawings view
            fetchDrawings();
        });
    });
    
    // We no longer need event delegation for the buttons
    // since we're now using direct event handlers
    
    // Load JSON button and file input setup
    const loadJsonBtn = document.getElementById('load-json-btn');
    const fileInput = document.getElementById('file-input');
    
    loadJsonBtn.addEventListener('click', function() {
        fileInput.click(); // Trigger file input click
    });
    
    // Add hover effect to match other tabs
    loadJsonBtn.addEventListener('mouseenter', function() {
        this.style.backgroundColor = '#f5f5f5';
    });
    
    loadJsonBtn.addEventListener('mouseleave', function() {
        this.style.backgroundColor = '#ddd';
    });
    
    fileInput.addEventListener('change', function(event) {
        if (event.target.files.length > 0) {
            loadDrawingFromJson(event.target.files[0]);
        }
    });
    
    // Item type change handler is no longer needed in the control panel
    // as it has been moved to add-item.js
    
    // Removed drawing selection change event listener
    // as it's no longer needed since we removed the items tab
    
    // Log the previously selected drawing for debugging
    console.log("Previously selected drawing from localStorage:", localStorage.getItem('selectedDrawingName'));
    
    // Initialize
    cleanupEditPreviews();
    cleanupTouchActionTemps();
    fetchDrawings();
    
    // This is redundant since we now disable buttons immediately after defining them
    // We'll leave it here for clarity, with null checks for extra safety
    // Only disable buttons if no drawing is selected
    if (!selectedDrawingName) {
        if (viewDrawingBtn) viewDrawingBtn.disabled = true;
        if (editDrawingBtn) editDrawingBtn.disabled = true;
        if (copyDrawingBtn) copyDrawingBtn.disabled = true; 
        if (saveDrawingBtn) saveDrawingBtn.disabled = true;
        if (arduinoExportBtn) arduinoExportBtn.disabled = true;
        if (deleteDrawingBtn) deleteDrawingBtn.disabled = true;
    }
    
    // Event Listeners
    createDrawingForm.addEventListener('submit', createDrawing);
    
    // Cancel button event listener
    const cancelBtn = document.getElementById('cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            // Clear the form
            drawingNameInput.value = '';
            canvasWidthInput.value = '50';
            canvasHeightInput.value = '50';
            canvasColorInput.value = '15';
            canvasRefreshInput.value = '0';
            
            // Reset color picker if it exists
            if (typeof createColorPicker !== 'undefined') {
                createColorPicker('canvas-color-picker', 'canvas-color', 15);
            }
            
            // Switch back to drawings tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById('drawings-tab').classList.add('active');
            
            // Refresh drawings list to ensure current state
            fetchDrawings();
        });
    }
    
    // Global flag to control auto-refresh
    let autoRefreshEnabled = true;
    
    // Auto-refresh the drawings list every 10 seconds
    // TEMPORARILY DISABLED - Remove comment to re-enable
    // let refreshInterval = setInterval(() => {
    //     if (autoRefreshEnabled) {
    //         fetchDrawings();
    //     }
    // }, 10000);
    let refreshInterval = null; // Disabled for testing
    
    // Clean up the interval when the page is unloaded
    window.addEventListener('beforeunload', () => {
        autoRefreshEnabled = false;
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
            console.log('Control panel closing - stopped auto-refresh timer');
        }
    });
    
    // Pause/resume timer based on page visibility (more reliable)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            autoRefreshEnabled = false;
            if (refreshInterval) {
                clearInterval(refreshInterval);
                refreshInterval = null;
                console.log('Control panel hidden - stopped auto-refresh timer');
            }
        } else {
            autoRefreshEnabled = true;
            if (!refreshInterval) {
                refreshInterval = setInterval(() => {
                    if (autoRefreshEnabled) {
                        fetchDrawings();
                    }
                }, 10000);
                console.log('Control panel visible - restarted auto-refresh timer');
            }
        }
    });
    
    // Also clean up on page unload (alternative event)
    window.addEventListener('unload', () => {
        autoRefreshEnabled = false;
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
            console.log('Control panel unloaded - stopped auto-refresh timer');
        }
    });
    
    // Add a click handler on the document to handle clicks outside the table
    document.addEventListener('click', function(event) {
        // Only deselect if the click is outside both the drawings table AND the action buttons
        // This prevents deselection when clicking action buttons
        const isClickOnTable = event.target.closest('#drawings-table');
        const isClickOnActionButton = event.target.closest('.drawing-actions');
        const isClickOnTab = event.target.closest('.tabs');
        
        // If the click is outside all of these areas, deselect
        if (!isClickOnTable && !isClickOnActionButton && !isClickOnTab) {
            console.log("Click outside table and buttons, deselecting");
            
            // Deselect any selected row
            document.querySelectorAll('#drawings-table tbody tr').forEach(tr => {
                tr.classList.remove('selected');
            });
            
            // Reset selected drawing and clear from localStorage
            selectedDrawingName = null;
            localStorage.removeItem('selectedDrawingName');
            
            // Disable all action buttons (with null checks for safety)
            if (viewDrawingBtn) viewDrawingBtn.disabled = true;
            if (editDrawingBtn) editDrawingBtn.disabled = true;
            if (copyDrawingBtn) copyDrawingBtn.disabled = true;
            if (saveDrawingBtn) saveDrawingBtn.disabled = true;
            if (arduinoExportBtn) arduinoExportBtn.disabled = true;
            if (deleteDrawingBtn) deleteDrawingBtn.disabled = true;
        }
    });
    
    // Action button event listeners
    viewDrawingBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            try {
                // Notify server about the main drawing selection
                const response = await fetch('/api/set-main-drawing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ mainDrawing: selectedDrawingName })
                });
                
                if (response.ok) {
                    // Open the pfodWeb endpoint which will serve index.html with the correct main drawing
                    window.open('/pfodWeb', '_blank');
                } else {
                    console.error('Failed to set main drawing');
                    alert('Failed to set main drawing');
                }
            } catch (error) {
                console.error('Error setting main drawing:', error);
                alert('Error setting main drawing');
            }
        }
    });
    
    
    copyDrawingBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            // Prompt user for new drawing name
            const newDrawingName = prompt(`Enter a name for the copy of "${selectedDrawingName}":`, `${selectedDrawingName}_copy`);
            
            if (newDrawingName && newDrawingName.trim()) {
                const trimmedName = newDrawingName.trim();
                
                if (trimmedName === selectedDrawingName) {
                    alert('The new drawing name must be different from the original.');
                    return;
                }
                
                try {
                    // First get the current drawing data
                    const response = await fetch(`/api/drawings/${selectedDrawingName}/data`);
                    if (!response.ok) {
                        throw new Error(`Failed to get drawing data: ${response.status}`);
                    }
                    
                    const drawingData = await response.json();
                    console.log(`Copying drawing "${selectedDrawingName}" with ${drawingData.items ? drawingData.items.length : 0} items`);
                    
                    // Get drawing info for canvas properties
                    const infoResponse = await fetch(`/api/drawings/${selectedDrawingName}`);
                    if (!infoResponse.ok) {
                        throw new Error(`Failed to get drawing info: ${infoResponse.status}`);
                    }
                    
                    const drawingInfo = await infoResponse.json();
                    
                    // Create new drawing with the same properties but different name
                    const newDrawingData = {
                        name: trimmedName,
                        x: drawingInfo.canvasWidth,
                        y: drawingInfo.canvasHeight,
                        color: drawingInfo.color,
                        refresh: drawingInfo.refresh,
                        items: drawingData.items || []
                    };
                    
                    // Use the import endpoint to create the drawing with all data including items
                    const importResponse = await fetch('/api/drawings/import', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newDrawingData)
                    });
                    
                    if (!importResponse.ok) {
                        const errorText = await importResponse.text();
                        throw new Error(`Failed to create copy: ${importResponse.status} - ${errorText}`);
                    }
                    
                    const importResult = await importResponse.json();
                    
                    if (importResult.success) {
                        console.log(`Drawing "${trimmedName}" created successfully with all ${newDrawingData.items.length} items`);
                        
                        // Select the new drawing
                        selectedDrawingName = trimmedName;
                        localStorage.setItem('selectedDrawingName', trimmedName);
                        
                        // Add the new drawing to the list and refresh
                        fetchDrawings();
                        
                        // Save the new drawing to local disk (same as Save button functionality)
                        const downloadLink = document.createElement('a');
                        downloadLink.href = `/api/drawings/${trimmedName}/export`;
                        downloadLink.download = `${trimmedName}.json`;
                        document.body.appendChild(downloadLink);
                        downloadLink.click();
                        document.body.removeChild(downloadLink);
                        
                        console.log(`Successfully copied "${selectedDrawingName}" to "${trimmedName}" and saved to local disk`);
                    } else {
                        throw new Error(importResult.error || 'Unknown error creating copy');
                    }
                } catch (error) {
                    console.error('Error copying drawing:', error);
                    alert(`Failed to copy drawing: ${error.message}`);
                }
            }
        }
    });
    
    editDrawingBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            try {
                // Notify server about the main drawing selection
                const response = await fetch('/api/set-main-drawing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ mainDrawing: selectedDrawingName })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log(`Main drawing set to: ${selectedDrawingName}`);
                
                // Navigate to edit page
                window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(selectedDrawingName)}`;
            } catch (error) {
                console.error('Error setting main drawing:', error);
                alert(`Error setting main drawing: ${error.message}`);
            }
        }
    });
 
    
    saveDrawingBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            try {
                // Notify server about the main drawing selection
                const response = await fetch('/api/set-main-drawing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ mainDrawing: selectedDrawingName })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log(`Main drawing set to: ${selectedDrawingName}`);
                
                // Perform save operation
                saveDrawingAsJson(selectedDrawingName);
            } catch (error) {
                console.error('Error setting main drawing:', error);
                alert(`Error setting main drawing: ${error.message}`);
            }
        }
    });
    
    arduinoExportBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            try {
                // Notify server about the main drawing selection
                const response = await fetch('/api/set-main-drawing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ mainDrawing: selectedDrawingName })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log(`Main drawing set to: ${selectedDrawingName}`);
                
                // Perform Arduino export operation
                exportDrawingToArduino(selectedDrawingName);
            } catch (error) {
                console.error('Error setting main drawing:', error);
                alert(`Error setting main drawing: ${error.message}`);
            }
        }
    });
    
    deleteDrawingBtn.addEventListener('click', async function() {
        if (selectedDrawingName) {
            try {
                // Notify server about the main drawing selection
                const response = await fetch('/api/set-main-drawing', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ mainDrawing: selectedDrawingName })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                console.log(`Main drawing set to: ${selectedDrawingName}`);
                
                // Step 1: First save a backup 
                saveDrawingAsDeletedJson(selectedDrawingName);
            } catch (error) {
                console.error('Error setting main drawing:', error);
                alert(`Error setting main drawing: ${error.message}`);
            }
        }
    });
    
    // Removed the direct handler for the Add Item button
    // as it's no longer needed since we removed the items tab
    
    // Version editing removed as per requirements
    
    // Function to save a drawing as deleted JSON (Step 1 of deletion)
    function saveDrawingAsDeletedJson(drawingName) {
        if (!drawingName) return;
        
        try {
            // First, save the drawing as drawing_deleted.json
            console.log(`Step 1: Saving backup of drawing "${drawingName}" before unloading`);
            
            // Create backup filename
            const backupFilename = `${drawingName}_unloaded.json`;
            
            // Fetch the export data first, then trigger download and deletion
            fetch(`/api/drawings/${drawingName}/export?filename=${backupFilename}`)
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Export failed: ${response.status}`);
                    }
                    return response.text();
                })
                .then(exportData => {
                    // Create and trigger download with the fetched data
                    const blob = new Blob([exportData], { type: 'application/json' });
                    const downloadUrl = URL.createObjectURL(blob);
                    const backupLink = document.createElement('a');
                    backupLink.href = downloadUrl;
                    backupLink.download = backupFilename;
                    document.body.appendChild(backupLink);
                    backupLink.click();
                    document.body.removeChild(backupLink);
                    URL.revokeObjectURL(downloadUrl);
                    
                    // Only delete after successful backup
                    console.log(`Step 1 completed: Backup saved as ${backupFilename}`);
                    deleteDrawingFromServer(drawingName);
                })
                .catch(error => {
                    console.error('Error creating backup before deletion:', error);
                    alert(`Failed to create backup before unload: ${error.message}`);
                });
/**            
            // Show a success message with button to complete deletion
            const confirmDeleteBtn = document.createElement('button');
            confirmDeleteBtn.innerHTML = `Complete deletion of "${drawingName}"`;
            confirmDeleteBtn.className = 'clear-data-btn';
            confirmDeleteBtn.style.margin = '10px';
            confirmDeleteBtn.onclick = function() {
                deleteDrawingFromServer(drawingName);
                document.body.removeChild(confirmDeleteMsg);
            };
            
            const cancelBtn = document.createElement('button');
            cancelBtn.innerHTML = 'Cancel';
            cancelBtn.style.margin = '10px';
            cancelBtn.onclick = function() {
                document.body.removeChild(confirmDeleteMsg);
            };
            
            const confirmDeleteMsg = document.createElement('div');
            confirmDeleteMsg.style.position = 'fixed';
            confirmDeleteMsg.style.top = '10px';
            confirmDeleteMsg.style.left = '50%';
            confirmDeleteMsg.style.transform = 'translateX(-50%)';
            confirmDeleteMsg.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
            confirmDeleteMsg.style.padding = '20px';
            confirmDeleteMsg.style.borderRadius = '5px';
            confirmDeleteMsg.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.3)';
            confirmDeleteMsg.style.zIndex = '1000';
            confirmDeleteMsg.innerHTML = `<p>Step 1 complete: Backup saved as ${backupFilename}</p>`;
            confirmDeleteMsg.appendChild(confirmDeleteBtn);
            confirmDeleteMsg.appendChild(cancelBtn);
            
            document.body.appendChild(confirmDeleteMsg);
**/            
        } catch (error) {
            console.error('Error in save backup process:', error);
            alert(`Failed to create backup for drawing "${drawingName}". See console for details.`);
        }
    }
    
    // Function to delete a drawing from the server (Step 2 of deletion)
    function deleteDrawingFromServer(drawingName) {
        if (!drawingName) return;
        
        console.log(`Step 2: Deleting drawing "${drawingName}" from server`);
        
        // Delete the drawing from the server
        fetch(`/api/drawings/${drawingName}/delete`, {
            method: 'DELETE'
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    // Remove the version and data from localStorage
                    localStorage.removeItem(`${drawingName}_version`);
                    localStorage.removeItem(`${drawingName}_data`);
                    
                    console.log(`Deleted drawing: ${drawingName}`);
                    
                    // Refresh the drawings list
                    fetchDrawings();
                    
                    // Log successful deletion but don't show alert
                    console.log(`Successfully deleted drawing "${drawingName}"`);
                } else {
                    throw new Error(result.error || 'Unknown error');
                }
            })
            .catch(error => {
                console.error('Error deleting drawing:', error);
                alert(`Failed to delete drawing "${drawingName}". See console for details.`);
            });
    }
    
    // Legacy function kept for compatibility
    function clearDrawingData(drawingName) {
        if (!drawingName) return;
        saveDrawingAsDeletedJson(drawingName);
    }
    
    // Function to save drawing as JSON file
    function saveDrawingAsJson(drawingName) {
        if (!drawingName) return;
        
        try {
            console.log(`Exporting drawing "${drawingName}" as JSON`);
            
            // Store the current selection to restore it after saving
            const currentSelection = selectedDrawingName;
            console.log(`Saving current selection "${currentSelection}" to restore after save`);
            
            // Create download link and download the file
            const downloadLink = document.createElement('a');
            downloadLink.href = `/api/drawings/${drawingName}/export`;
            downloadLink.download = `${drawingName}.json`;
            
            // Append to body, click to download, then remove
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            console.log(`Drawing "${drawingName}" export triggered`);
            
            // No need to refresh the drawings list since nothing changed server-side
            // This keeps the current selection intact
            
            // If we need to update selection, do it here
            if (currentSelection) {
                // Ensure the selection is maintained in localStorage
                localStorage.setItem('selectedDrawingName', currentSelection);
                selectedDrawingName = currentSelection;
                console.log(`Restored selection to "${selectedDrawingName}" after save`);
                
                // Ensure the visual selection is maintained by ensuring the correct row has the 'selected' class
                document.querySelectorAll('#drawings-table tbody tr').forEach(tr => {
                    // Remove 'selected' class from all rows first
                    tr.classList.remove('selected');
                    
                    // Add 'selected' class to the row with the matching drawing name
                    if (tr.dataset.drawing === currentSelection) {
                        tr.classList.add('selected');
                        console.log(`Added 'selected' class to row for drawing "${currentSelection}"`);
                    }
                });
                
                // Re-enable all action buttons since we know which drawing is selected
                if (viewDrawingBtn) viewDrawingBtn.disabled = false;
                if (editDrawingBtn) editDrawingBtn.disabled = false;
                if (copyDrawingBtn) copyDrawingBtn.disabled = false;
                if (saveDrawingBtn) saveDrawingBtn.disabled = false;
                if (arduinoExportBtn) arduinoExportBtn.disabled = false;
                if (deleteDrawingBtn) deleteDrawingBtn.disabled = false;
                
                // Update data attributes on action buttons
                if (viewDrawingBtn) viewDrawingBtn.dataset.drawing = currentSelection;
                if (editDrawingBtn) editDrawingBtn.dataset.drawing = currentSelection;
                if (copyDrawingBtn) copyDrawingBtn.dataset.drawing = currentSelection;
                if (saveDrawingBtn) saveDrawingBtn.dataset.drawing = currentSelection;
                if (arduinoExportBtn) arduinoExportBtn.dataset.drawing = currentSelection;
                if (deleteDrawingBtn) deleteDrawingBtn.dataset.drawing = currentSelection;
            }
            
            // Check if this drawing has any insertDwg items and suggest downloading those too
            checkForInsertedDrawings(drawingName);
        } catch (error) {
            console.error(`Error exporting drawing "${drawingName}":`, error);
            alert(`Failed to export drawing "${drawingName}". See console for details.`);
        }
    }
    
    // Helper function to check for inserted drawings and suggest downloading them
    function checkForInsertedDrawings(drawingName) {
        fetch(`/api/drawings/${drawingName}`)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to get drawing data: ${response.status}`);
                }
                return response.json();
            })
            .then(drawingInfo => {
                // Get all items for this drawing
                return fetch(`/api/drawings/${drawingName}/data`)
                    .then(response => response.json())
                    .then(drawingData => {
                        if (!drawingData.items || !Array.isArray(drawingData.items)) {
                            return;
                        }
                        
                        // Find all insertDwg items
                        const insertedDrawings = drawingData.items
                            .filter(item => item.type && item.type.toLowerCase() === 'insertdwg' && item.drawingName)
                            .map(item => item.drawingName);
                            
                        if (insertedDrawings.length > 0) {
                            // Remove duplicates
                            const uniqueInsertedDrawings = [...new Set(insertedDrawings)];
                            
                            console.log(`Drawing "${drawingName}" includes ${uniqueInsertedDrawings.length} inserted drawings:`, uniqueInsertedDrawings);
                            
                            // Ask user if they want to download inserted drawings too
                            if (confirm(`The drawing "${drawingName}" includes ${uniqueInsertedDrawings.length} inserted drawing(s): ${uniqueInsertedDrawings.join(', ')}.\n\nDo you want to download these inserted drawings as well?`)) {
                                // Store the current selection before downloading inserted drawings
                                const currentSelectionBeforeDownload = selectedDrawingName;
                                console.log(`Storing current selection "${currentSelectionBeforeDownload}" before downloading inserted drawings`);
                                
                                // Download each inserted drawing
                                uniqueInsertedDrawings.forEach(insertedDrawingName => {
                                    saveDrawingAsJson(insertedDrawingName);
                                });
                                
                                // Restore the original selection after downloading all inserted drawings
                                if (currentSelectionBeforeDownload) {
                                    // Update localStorage and variable
                                    localStorage.setItem('selectedDrawingName', currentSelectionBeforeDownload);
                                    selectedDrawingName = currentSelectionBeforeDownload;
                                    
                                    // Update visual selection
                                    document.querySelectorAll('#drawings-table tbody tr').forEach(tr => {
                                        tr.classList.remove('selected');
                                        if (tr.dataset.drawing === currentSelectionBeforeDownload) {
                                            tr.classList.add('selected');
                                        }
                                    });
                                    
                                    console.log(`Final selection restored to "${currentSelectionBeforeDownload}" after downloading all inserted drawings`);
                                }
                            }
                        }
                    });
            })
            .catch(error => {
                console.error(`Error checking for inserted drawings in "${drawingName}":`, error);
            });
    }
    
    
    
    // Function to load drawing from JSON file
    function loadDrawingFromJson(file) {
        if (!file) return;
        
        try {
            console.log(`Reading JSON file: ${file.name}`);
            
            const reader = new FileReader();
            
            reader.onload = function(event) {
                try {
                    // Parse JSON data
                    let drawingData = JSON.parse(event.target.result);
                    
                    // Infer drawing name from filename (remove .json extension and parenthetical numbers)
                    const drawingName = file.name.replace(/\.json$/i, '').replace(/\s*\(\d+\)$/, '').replace(/_unloaded$/i, '');;
                    if (!drawingName) {
                        alert('Invalid filename: Cannot determine drawing name');
                        return;
                    }
                    
                    // Set the drawing name from the filename
                    drawingData.name = drawingName;
                    
                    if (drawingData.x === undefined || drawingData.y === undefined || drawingData.color === undefined) {
                        const missing = [];
                        if (drawingData.x === undefined) missing.push('x (width)');
                        if (drawingData.y === undefined) missing.push('y (height)');
                        if (drawingData.color === undefined) missing.push('color (background)');
                        alert(`Invalid JSON file: Missing required properties: ${missing.join(', ')}`);
                        return;
                    }
                    
                    console.log(`Parsed drawing data for "${drawingData.name}"`);
                    
                    // Check if this is a raw_item format and convert if needed
                    if (drawingData.raw_items && Array.isArray(drawingData.raw_items)) {
                        console.log('Detected raw_item format, translating to standard format...');
                        try {
                            // Use translator.js to convert raw_items to items
                            drawingData = translateRawItemsToItemArray(drawingData);
                            console.log('Successfully translated raw_items to standard format');
                        } catch (translationError) {
                            console.error('Error translating raw_items:', translationError);
                            alert('Failed to translate raw_items format. See console for details.');
                            return;
                        }
                    } else if (drawingData.items && Array.isArray(drawingData.items)) {
                        console.log('Detected standard line.json format');
                    } else {
                        alert('Invalid JSON file: Must contain either "items" or "raw_items" array');
                        return;
                    }
                    
                    // Check for insertDwg items that might need additional files
                    checkForMissingInsertedDrawings(drawingData, function() {
                        // After checking, proceed with the import
                        importDrawingToServer(drawingData);
                    });
                } catch (parseError) {
                    console.error('Error parsing JSON file:', parseError);
                    alert('Invalid JSON file. See console for details.');
                }
            };
            
            reader.onerror = function() {
                console.error('Error reading file');
                alert('Failed to read file. See console for details.');
            };
            
            reader.readAsText(file);
            
        } catch (error) {
            console.error('Error loading drawing from JSON:', error);
            alert('Failed to load drawing from JSON. See console for details.');
        }
    }
    
    // Helper function to send drawing data to the server
    function importDrawingToServer(drawingData) {
        fetch('/api/drawings/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(drawingData)
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                // Success - show the drawings tab and refresh the list
                
                // Make sure drawings tab is active
                tabContents.forEach(content => {
                    content.classList.remove('active');
                });
                document.getElementById('drawings-tab').classList.add('active');
                
                // Store the new drawing name to select it after refresh
                const drawingToSelect = drawingData.name;
                
                // Set as selected drawing
                selectedDrawingName = drawingToSelect;
                localStorage.setItem('selectedDrawingName', drawingToSelect);
                console.log(`Setting newly imported drawing "${drawingToSelect}" as selected`);
                
                // Refresh the drawings list - selection will be restored in fetchDrawings
                fetchDrawings();
                
                // Show a success message
                console.log(`Drawing "${drawingData.name}" imported successfully`);
            } else {
                alert(`Error: ${result.error || 'Failed to import drawing'}`);
            }
        })
        .catch(error => {
            console.error('Error importing drawing:', error);
            alert(`Failed to import drawing. See console for details.`);
        });
    }
    
    // Helper function to check for missing inserted drawings in JSON data
    function checkForMissingInsertedDrawings(drawingData, callback) {
        // First, check if the drawing has insertDwg items
        if (!drawingData.items || !Array.isArray(drawingData.items)) {
            // No items or not an array, nothing to check
            callback();
            return;
        }
        
        // Find all insertDwg items
        const insertedDrawings = drawingData.items
            .filter(item => item.type && item.type.toLowerCase() === 'insertdwg' && item.drawingName)
            .map(item => item.drawingName);
            
        if (insertedDrawings.length === 0) {
            // No insertDwg items found
            callback();
            return;
        }
            
        // Remove duplicates
        const uniqueInsertedDrawings = [...new Set(insertedDrawings)];
        console.log(`Drawing "${drawingData.name}" includes ${uniqueInsertedDrawings.length} inserted drawings:`, uniqueInsertedDrawings);
        
        // Fetch the list of existing drawings from the server
        fetch('/api/drawings', {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => response.json())
            .then(existingDrawings => {
                const existingDrawingNames = existingDrawings.map(d => d.name);
                
                // Find which inserted drawings don't exist on the server
                const missingDrawings = uniqueInsertedDrawings.filter(name => !existingDrawingNames.includes(name));
                
                if (missingDrawings.length === 0) {
                    // All referenced drawings exist, proceed with the import
                    console.log('All referenced insertDwg drawings already exist on the server.');
                    callback();
                    return;
                }
                
                // Alert the user about missing drawings
                const warningMessage = `The drawing "${drawingData.name}" includes references to ${missingDrawings.length} drawing(s) that don't exist on the server: ${missingDrawings.join(', ')}.\n\nYou should import these drawings as well for the insertDwg items to work properly.`;
                alert(warningMessage);
                
                // Proceed with the import anyway
                callback();
            })
            .catch(error => {
                console.error('Error checking for missing drawings:', error);
                // Proceed with the import anyway in case of error
                callback();
            });
    }
    
    // Item property input handlers are no longer needed in the control panel
    // as they have been moved to add-item.js
    
    // Fetch all drawings
    function fetchDrawings() {
        // Get the currently selected drawing from localStorage (or from variable)
        // We'll restore the selection if the drawing still exists after refresh
        const previouslySelectedDrawing = localStorage.getItem('selectedDrawingName') || selectedDrawingName;
        
        console.log("Fetching drawings. Previous selection:", previouslySelectedDrawing);
        
        // Don't reset selectedDrawingName yet - we'll only reset it if we can't find the previously selected drawing
        
        // Disable all action buttons (with null checks for safety)
        if (viewDrawingBtn) viewDrawingBtn.disabled = true;
        if (editDrawingBtn) editDrawingBtn.disabled = true;
        if (copyDrawingBtn) copyDrawingBtn.disabled = true;
        if (saveDrawingBtn) saveDrawingBtn.disabled = true;
        if (deleteDrawingBtn) deleteDrawingBtn.disabled = true;
        
        fetch('/api/drawings', {
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        })
            .then(response => response.json())
            .then(drawings => {
                // Update drawings table
                drawingsTable.innerHTML = '';
                
                // Keep track if we find the previously selected drawing
                let foundPreviouslySelected = false;
                
                drawings.forEach(drawing => {
                    const row = document.createElement('tr');
                    
                    // Format refresh rate display
                    const refreshDisplay = drawing.refresh === 0 ? 
                        'No auto-refresh' : 
                        `${drawing.refresh}ms`;
                    
                    row.innerHTML = `
                        <td>${drawing.name}</td>
                        <td>${drawing.canvasWidth} x ${drawing.canvasHeight}</td>
                        <td><span style="display:inline-block; width:14px; height:14px; background-color:${drawing.color}"></span> ${drawing.color}</td>
                        <td>${refreshDisplay}</td>
                        <td>${drawing.itemCount}</td>
                        <td>
                            <span class="version-display">${drawing.version || ''}</span>
                        </td>
                    `;
                    
                    // Set data attribute for the drawing name
                    row.dataset.drawing = drawing.name;
                    
                    // Check if this was the previously selected drawing
                    if (previouslySelectedDrawing === drawing.name) {
                        console.log("Found previously selected drawing:", drawing.name);
                        // If so, mark this row as selected immediately
                        row.classList.add('selected');
                        selectedDrawingName = drawing.name;
                        foundPreviouslySelected = true;
                        
                        // Enable action buttons for this drawing
                        if (viewDrawingBtn) viewDrawingBtn.disabled = false;
                        if (editDrawingBtn) editDrawingBtn.disabled = false;
                        if (copyDrawingBtn) copyDrawingBtn.disabled = false;
                        if (saveDrawingBtn) saveDrawingBtn.disabled = false;
                        if (arduinoExportBtn) arduinoExportBtn.disabled = false;
                        if (deleteDrawingBtn) deleteDrawingBtn.disabled = false;
                        
                        // Update data attributes on action buttons
                        if (viewDrawingBtn) viewDrawingBtn.dataset.drawing = drawing.name;
                        if (editDrawingBtn) editDrawingBtn.dataset.drawing = drawing.name;
                        if (copyDrawingBtn) copyDrawingBtn.dataset.drawing = drawing.name;
                        if (saveDrawingBtn) saveDrawingBtn.dataset.drawing = drawing.name;
                        if (deleteDrawingBtn) deleteDrawingBtn.dataset.drawing = drawing.name;
                    }
                    
                    // Add click handler for row selection
                    row.addEventListener('click', function() {
                        // Remove selected class from all rows
                        document.querySelectorAll('#drawings-table tbody tr').forEach(tr => {
                            tr.classList.remove('selected');
                        });
                        
                        // Add selected class to this row
                        this.classList.add('selected');
                        
                        // Update selected drawing name and save to localStorage
                        selectedDrawingName = drawing.name;
                        localStorage.setItem('selectedDrawingName', drawing.name);
                        
                        // Enable action buttons
                        viewDrawingBtn.disabled = false;
                        editDrawingBtn.disabled = false;
                        copyDrawingBtn.disabled = false;
                        saveDrawingBtn.disabled = false;
                        if (arduinoExportBtn) arduinoExportBtn.disabled = false;
                        deleteDrawingBtn.disabled = false;
                        
                        // Update data attributes on action buttons
                        viewDrawingBtn.dataset.drawing = drawing.name;
                        editDrawingBtn.dataset.drawing = drawing.name;
                        copyDrawingBtn.dataset.drawing = drawing.name;
                        saveDrawingBtn.dataset.drawing = drawing.name;
                        deleteDrawingBtn.dataset.drawing = drawing.name;
                    });
                    
                    drawingsTable.appendChild(row);
                });
                
                // No longer need to update drawing dropdown since we removed the items tab
                
                // If the previously selected drawing no longer exists, clear the selection from localStorage
                if (previouslySelectedDrawing && !foundPreviouslySelected) {
                    console.log("Previously selected drawing no longer exists, clearing selection");
                    localStorage.removeItem('selectedDrawingName');
                    selectedDrawingName = null;
                } else if (foundPreviouslySelected) {
                    console.log("Successfully restored selection for drawing:", selectedDrawingName);
                    // Don't need to do anything, as the selection was already restored above
                } else {
                    console.log("No previous selection to restore");
                    selectedDrawingName = null;
                }
            })
            .catch(error => {
                console.error('Error fetching drawings:', error);
                // Don't show an alert for network errors, just log to console
                // This prevents the alert popup when server is temporarily unavailable
                // or when network connection is intermittent
                if (error instanceof TypeError && error.message.includes("NetworkError")) {
                    console.error('Network error while fetching drawings. This could be due to server unavailability or network issues.');
                } else {
                    alert('Failed to fetch drawings. See console for details.');
                }
            });
    }
    
    // Removed updateDrawingDropdown and populateDrawingDropdown functions
    // as they're no longer needed since we removed the items tab
    
    // Create a new drawing
    function createDrawing(event) {
        event.preventDefault();
        console.log("Create drawing form submitted");
        
        const name = drawingNameInput.value.trim();
        const x = parseInt(canvasWidthInput.value);
        const y = parseInt(canvasHeightInput.value);
        const color = isNaN(parseInt(canvasColorInput.value))? 0 : parseInt(canvasColorInput.value);
        // Convert seconds to milliseconds, with special handling for 0
        const refreshSeconds = canvasRefreshInput.value.trim() === '' ? 0 : parseInt(canvasRefreshInput.value);
        const refresh = refreshSeconds === 0 ? 0 : refreshSeconds * 1000;
        // Version is now auto-generated only
        const version = null;
        
        console.log("Form values:", { name, x, y, color, refreshSeconds, refresh, version });
        
        if (!name) {
            alert('Drawing name is required');
            return;
        }
        
        // Validate refresh seconds
        if (refreshSeconds < 0 || refreshSeconds > 3600) {
            alert('Refresh interval must be 0 (no refresh) or between 1 and 3600 seconds');
            return;
        }
        
        if (refreshSeconds > 0 && refreshSeconds < 1) {
            alert('Refresh interval must be 0 (no refresh) or at least 1 second');
            return;
        }
        
        const drawingData = {
            name,
            x,
            y,
            color,
            refresh,
            version: version || null // Only include version if it's not empty
        };
        
        console.log("Sending drawing data to server:", drawingData);
        
        fetch('/api/drawings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(drawingData)
        })
            .then(response => {
                console.log("Server response status:", response.status);
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Server returned ${response.status}: ${text}`);
                    });
                }
                return response.json();
            })
            .then(result => {
                console.log("Server response:", result);
                if (result.success) {
                    // Success - clear the form and refresh the drawings list
                    const drawingToSelect = name;
                    drawingNameInput.value = '';
                    
                    // Deactivate the create tab
                    tabs.forEach(t => t.classList.remove('active'));
                    
                    // Show the drawings content
                    tabContents.forEach(content => {
                        content.classList.remove('active');
                    });
                    document.getElementById('drawings-tab').classList.add('active');
                    
                    // Set the newly created drawing as selected
                    selectedDrawingName = drawingToSelect;
                    localStorage.setItem('selectedDrawingName', drawingToSelect);
                    console.log(`Setting newly created drawing "${drawingToSelect}" as selected`);
                    
                    // Fetch the updated drawings list - selection will be restored in fetchDrawings
                    fetchDrawings();
                    
                    // Automatically save the newly created drawing
                    console.log(`Automatically saving newly created drawing "${drawingToSelect}"`);
                    saveDrawingAsJson(drawingToSelect);
                } else {
                    alert(`Error: ${result.error || 'Unknown error'}`);
                }
            })
            .catch(error => {
                console.error('Error creating drawing:', error);
                alert('Failed to create drawing. See console for details.');
            });
    }
    
    // Update drawing version
    function updateDrawingVersion(drawingName, newVersion) {
        if (!drawingName || !newVersion) {
            alert('Drawing name and version are required');
            return;
        }
        
        fetch(`/api/drawings/${drawingName}/version`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ version: newVersion })
        })
            .then(response => response.json())
            .then(result => {
                if (result.success) {
                    console.log(`Drawing "${drawingName}" version updated to ${newVersion}`);
                    
                    // Check if the user has a stored version for this drawing
                    const storedVersion = localStorage.getItem(`${drawingName}_version`);
                    if (storedVersion) {
                        // Just inform the user about the version change
                        alert(`Server version changed to ${newVersion}. 
                        
The next time clients with version ${storedVersion} request an update, they will receive a full drawing with the new version.`);
                    }
                    
                    // Refresh the drawings list
                    fetchDrawings();
                } else {
                    alert(`Error: ${result.error || 'Unknown error'}`);
                }
            })
            .catch(error => {
                console.error('Error updating drawing version:', error);
                alert('Failed to update drawing version. See console for details.');
            });
    }
    
    // Removed addItemToDrawing and updatePreview functions
    // as they're no longer needed since we removed the items tab
    
    // Preview rendering function is removed as we no longer have the canvas in the main control panel
    // Previews are now shown in the dedicated item editor page
    
    // Draw preview functionality has been moved to the add-item.js file
    // This keeps the control.js file focused on just the control panel functionality
});