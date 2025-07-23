/*   
   edit-canvas.js
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
    const drawingName = params.get('drawing'); // This will be the temp drawing name (e.g., "myDrawing_canvas_edit")
    const originalDrawingName = params.get('original'); // This will be the original drawing name
    
    if (!drawingName || !originalDrawingName) {
        alert('Missing drawing parameters');
        window.location.href = '/control.html';
        return;
    }
    
    console.log(`Canvas editing mode: temp=${drawingName}, original=${originalDrawingName}`);
    
    // DOM Elements
    const drawingNameDisplay = document.getElementById('drawing-name');
    const canvasSizeDisplay = document.getElementById('canvas-size');
    const canvasColorDisplay = document.getElementById('canvas-color');
    const refreshRateDisplay = document.getElementById('refresh-rate');
    const totalItemsDisplay = document.getElementById('total-items');
    const previewIframe = document.getElementById('preview-iframe');
    
    // Variables
    let currentDrawingData = null;
    let originalRefreshRate = null; // Store original refresh rate during editing
    let editingRefreshRate = null; // Track user's refresh changes during editing
    let isCanvasEditMode = true; // This page is specifically for canvas editing
    
    // Initialize
    loadDrawingData();
    
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
        cancelCanvasEdit();
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
            
            // Update drawing info - show original name but editing temp
            drawingNameDisplay.textContent = `${originalDrawingName} (Canvas Edit Mode)`;
            canvasSizeDisplay.textContent = `${drawingData.x || metadata.canvasWidth} x ${drawingData.y || metadata.canvasHeight}`;
            const canvasColorNum = parseInt(drawingData.color) || 0;
            const canvasColorHex = typeof getColorHex !== 'undefined' ? getColorHex(canvasColorNum) : '#000000';
            canvasColorDisplay.innerHTML = `<span style="display:inline-block; width:14px; height:14px; background-color:${canvasColorHex}; border: 1px solid #ccc; margin-right: 5px;"></span>Color ${canvasColorNum}`;
            refreshRateDisplay.textContent = drawingData.refresh === 0 ? 'No auto-refresh' : `${drawingData.refresh}ms`;
            totalItemsDisplay.textContent = drawingData.items ? drawingData.items.length : 0;
            
            // Set up preview iframe initially - use temp drawing for live preview
            setupPreviewIframe();
            
            // Update preview iframe
            updatePreview();
            
            // Automatically show canvas edit form since that's what this page is for
            showCanvasEditForm();
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

        // Store original refresh rate
        originalRefreshRate = currentDrawingData.refresh || 0;
        editingRefreshRate = originalRefreshRate;
        console.log(`Stored original refresh rate: ${originalRefreshRate}ms`);

        // Immediately set temp copy refresh to 0 to inhibit refresh during editing
        console.log(`Setting refresh to 0 for temporary drawing: ${drawingName}`);
        fetch(`/api/drawings/${drawingName}/set-refresh-zero`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(response => response.json())
        .then(data => {
            if (!data.success) {
                throw new Error(data.error || 'Failed to disable refresh on temporary copy');
            }
            console.log('Disabled refresh on temporary drawing for editing');
            
            // Populate form with current values
            canvasWidthInput.value = currentDrawingData.x || 50;
            canvasHeightInput.value = currentDrawingData.y || 50;
            canvasBgColorInput.value = currentDrawingData.color;// || 15;
            // Convert milliseconds to seconds for display
            const refreshMs = originalRefreshRate;
            canvasRefreshInput.value = refreshMs === 0 ? 0 : Math.round(refreshMs / 1000);

            // Initialize color picker for canvas background
            if (typeof createColorPicker !== 'undefined') {
                createColorPicker('canvas-bg-color-picker', 'canvas-bg-color', currentDrawingData.color); //; || 15
            }

            // Add event listeners for real-time preview updates
            canvasWidthInput.addEventListener('input', updateCanvasPreview);
            canvasHeightInput.addEventListener('input', updateCanvasPreview);
            canvasBgColorInput.addEventListener('change', updateCanvasPreview);
            canvasRefreshInput.addEventListener('input', updateCanvasPreview);

            // Show edit form and hide info display
            document.querySelector('.drawing-info').style.display = 'none';
            canvasEditForm.style.display = 'block';
            
        }).catch(error => {
            console.error(`Error setting up canvas editing: ${error}`);
            alert('Failed to set up canvas editing. Please try again.');
        });
    }


    function updateCanvasPreview() {
        if (!drawingName) return;
        
        // Get current form values
        const width = parseInt(canvasWidthInput.value) || 50;
        const height = parseInt(canvasHeightInput.value) || 50;
        const color = isNaN(parseInt(canvasBgColorInput.value))? 0 : parseInt(canvasBgColorInput.value);
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
        fetch(`/api/drawings/${drawingName}/update-canvas`, {
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

    function cancelCanvasEdit() {
        // Remove event listeners
        canvasWidthInput.removeEventListener('input', updateCanvasPreview);
        canvasHeightInput.removeEventListener('input', updateCanvasPreview);
        canvasBgColorInput.removeEventListener('change', updateCanvasPreview);
        canvasRefreshInput.removeEventListener('input', updateCanvasPreview);
        
        // Delete temporary drawing
        fetch(`/api/drawings/${drawingName}/cancel`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        })
        .then(() => {
            console.log('Cancelled canvas editing, deleted temporary drawing');
            // Redirect back to edit-drawing page with the original drawing
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalDrawingName)}`;
        })
        .catch(error => {
            console.error('Error cancelling canvas edit:', error);
            // Still redirect back even if deletion failed
            window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalDrawingName)}`;
        });
    }

    function saveCanvasProperties() {
        if (!drawingName || !originalDrawingName) {
            alert('No temporary drawing available');
            return;
        }

        // Validate inputs
        const width = parseInt(canvasWidthInput.value);
        const height = parseInt(canvasHeightInput.value);
        const color = isNaN(parseInt(canvasBgColorInput.value))? 0 : parseInt(canvasBgColorInput.value);

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
        fetch(`/api/drawings/${encodeURIComponent(originalDrawingName)}/update-refresh`, {
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
            return fetch(`/api/drawings/${drawingName}/accept`, {
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
                
                // Remove event listeners
                canvasWidthInput.removeEventListener('input', updateCanvasPreview);
                canvasHeightInput.removeEventListener('input', updateCanvasPreview);
                canvasBgColorInput.removeEventListener('change', updateCanvasPreview);
                canvasRefreshInput.removeEventListener('input', updateCanvasPreview);
                
                // Redirect back to edit-drawing page with the original drawing
                window.location.href = `/edit-drawing.html?drawing=${encodeURIComponent(originalDrawingName)}`;
            } else {
                throw new Error(result.error || 'Failed to save canvas properties');
            }
        })
        .catch(error => {
            console.error('Error saving canvas properties:', error);
            alert(`Failed to save canvas properties: ${error.message}`);
        });
    }


});