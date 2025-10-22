/*   
   shared-iframe.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// Shared helper function to safely call initializeApp on iframe
function safelyCallInitializeApp(iframeElement, fallbackCallback = null) {
    try {
        const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow.document;
        
        // Check if iframe is ready and has all necessary functions
        if (iframeDoc.readyState === 'complete' && 
            iframeElement.contentWindow && 
            iframeElement.contentWindow.initializeApp && 
            typeof iframeElement.contentWindow.initializeApp === 'function') {
            console.log('Safely calling initializeApp on iframe');
            iframeElement.contentWindow.initializeApp();
            return true;
        } else {
            console.log('initializeApp not ready, iframe may still be loading');
            if (fallbackCallback) fallbackCallback();
            return false;
        }
    } catch (error) {
        console.log('Could not call initializeApp:', error);
        if (fallbackCallback) fallbackCallback();
        return false;
    }
}

// Shared iframe setup function used across multiple pages
function setupPreviewIframeWithDrawing(iframeElement, drawingName, usePreviewParam = false) {
    const paramName = usePreviewParam ? 'preview' : 'drawing';
    const timestamp = Date.now();
    const url = `/pfodWebDebug?designer&${paramName}=${encodeURIComponent(drawingName)}&t=${timestamp}`;

    console.log(`Setting up preview iframe for ${paramName}: ${drawingName}`);
    
    iframeElement.src = url;
    
    // Wait for pfodWeb to be ready before allowing calls to initializeApp
    const checkIfReady = () => {
        try {
            if (iframeElement.contentWindow && 
                iframeElement.contentWindow.initializeApp && 
                typeof iframeElement.contentWindow.initializeApp === 'function') {
                console.log('pfodWeb is ready in iframe');
                return;
            }
        } catch (error) {
            // Cross-origin or loading issues, keep waiting
        }
        
        // Continue checking
        requestAnimationFrame(checkIfReady);
    };
    
    iframeElement.onload = () => {
        console.log('Iframe loaded, waiting for all scripts to load...');
        
        // Wait for the iframe's document to be completely ready with all scripts loaded
        const checkIfReady = () => {
            try {
                const iframeDoc = iframeElement.contentDocument || iframeElement.contentWindow.document;
                
                // Check if document is fully loaded (all scripts, stylesheets, etc.)
                if (iframeDoc.readyState === 'complete' && 
                    iframeElement.contentWindow.initializeApp && 
                    typeof iframeElement.contentWindow.initializeApp === 'function') {
                    console.log('pfodWeb is ready in iframe');
                    return;
                }
            } catch (error) {
                // Cross-origin or loading issues, keep waiting
            }
            
            // Continue checking
            requestAnimationFrame(checkIfReady);
        };
        
        checkIfReady();
    };
}