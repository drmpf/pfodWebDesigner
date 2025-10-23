/*   
   arduinoExport.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */
/* 
   for each dwg export 
 * sendIndexedItems()
 * sendFullDrawing()
 * sendUpdate()
 */
 
 // Import version from version.js
  const arduinoExportVers = `pfodWeb Designer Arduino Export ${window.JS_VERSION}`
     let filesToZip = [];
     let insertedDwgs = [];
     let mainDwgName;
     let haveErrors = false;
     let currentConnectionType = 'serial'; // default connection type
     let missingDrawings = []; // Track missing drawings during export

// Helper function to get directory prefix based on connection type
    function getDirPrefix() {
      if (currentConnectionType === 'serial') {
        return `${mainDwgName}_serial/`;
      } else if (currentConnectionType === 'ble') {
        return `${mainDwgName}_ble/`;
      } else if (currentConnectionType === 'http') {
        return `${mainDwgName}_http/`;
      } else if (currentConnectionType === 'dwg-only') {
        return '';
      }
      return `${mainDwgName}_serial/`; // default
    }

// Function to show the connection type selection modal
    function showArduinoExportModal(drawingName) {
      if (!drawingName) return;

      mainDwgName = drawingName;

      // Update the modal with zip filenames
      document.getElementById('serial-zip-name').textContent = `${mainDwgName}_serial.zip`;
      document.getElementById('ble-zip-name').textContent = `${mainDwgName}_ble.zip`;
      document.getElementById('http-zip-name').textContent = `${mainDwgName}_http.zip`;
      document.getElementById('dwg-zip-name').textContent = `Dwg_${mainDwgName}.zip`;

      // Show the modal
      const modal = document.getElementById('arduino-export-modal');
      modal.classList.add('show');

      // Handle option selection
      const options = document.querySelectorAll('.export-option');
      options.forEach(option => {
        option.onclick = function() {
          const connectionType = this.dataset.connectionType;
          modal.classList.remove('show');
          exportDrawingToArduino(drawingName, connectionType);
        };
      });

      // Handle cancel button
      const cancelBtn = document.getElementById('modal-cancel-btn');
      cancelBtn.onclick = function() {
        modal.classList.remove('show');
      };

      // Close modal when clicking outside of it
      modal.onclick = function(event) {
        if (event.target === modal) {
          modal.classList.remove('show');
        }
      };
    }

// Function to export drawing to Arduino code format
    function exportDrawingToArduino(drawingName, connectionType = 'serial') {
      if (!drawingName) return;
      mainDwgName = drawingName;
      currentConnectionType = connectionType;
      filesToZip = [];
      insertedDwgs = [];
      haveErrors = false;
      missingDrawings = []; // Reset missing drawings list
     // First pass: Collect ALL nested insertDwgs recursively before generating any code
     collectAllInsertedDwgs(drawingName, new Set(), (allDwgs) => {
       // All drawings collected, now export them
       insertedDwgs = Array.from(allDwgs);
       console.log(`[ARDUINO_EXPORT] Collected ALL nested drawings: ${JSON.stringify(insertedDwgs)}`);
       exportAllDwgsToArduino(drawingName, filesToZip, insertedDwgs, true); // this is the main one
     });
   }

   // Recursively collect all inserted drawings (nested and deeply nested)
   // Note: Missing drawings are tracked but not considered errors - export continues
   function collectAllInsertedDwgs(drawingName, collected, callback) {
     fetch(`/api/drawings/${drawingName}/data`)
     .then(response => {
       if (!response.ok) {
         throw new Error(`Drawing not found: ${response.status}`);
       }
       return response.json();
     })
     .then(drawingData => {
       // Add this drawing to collected (skip the main one initially, add from references)
       if (drawingName !== mainDwgName || collected.size > 0) {
         collected.add(drawingName);
       }

       // Find all insertDwgs in this drawing
       let foundDwgs = [];
       if (Array.isArray(drawingData.items)) {
         drawingData.items.forEach(item => {
           if (item && item.type === 'insertDwg' && !collected.has(item.drawingName)) {
             foundDwgs.push(item.drawingName);
             collected.add(item.drawingName);
           }
         });
       }

       // Recursively collect from each found drawing
       if (foundDwgs.length === 0) {
         // No more drawings to process
         callback(collected);
       } else {
         // Process each found drawing
         let processed = 0;
         foundDwgs.forEach(dwg => {
           collectAllInsertedDwgs(dwg, collected, (result) => {
             processed++;
             if (processed === foundDwgs.length) {
               callback(collected);
             }
           });
         });
       }
     })
     .catch(error => {
       console.error(`Warning: Could not fetch drawing "${drawingName}":`, error);
       // Track the missing drawing but continue
       if (!missingDrawings.includes(drawingName)) {
         missingDrawings.push(drawingName);
       }
       callback(collected);
     });
   }

   // Export all collected drawings (main + all nested insertDwgs)
   function exportAllDwgsToArduino(drawingName, filesToZip, allInsertedDwgs, isMain = false) {
     const dirPrefix = getDirPrefix();

     // Generate pfodMainDrawing files ONCE with complete list of ALL nested drawings
     if (isMain && currentConnectionType !== 'dwg-only') {
       console.log(`[ARDUINO_EXPORT] Generating pfodMainDrawing with ${allInsertedDwgs.length} nested drawings`);
       filesToZip.push({filename: `${dirPrefix}pfodMainDrawing.h`, content: pfodMainDrawing_H(mainDwgName)});
       filesToZip.push({filename: `${dirPrefix}pfodMainDrawing.cpp`, content: pfodMainDrawing_CPP(mainDwgName, allInsertedDwgs)});
     }

     // Now export each drawing (main + all nested)
     const allDrawingsToExport = [drawingName, ...allInsertedDwgs];
     console.log(`[ARDUINO_EXPORT] Exporting ${allDrawingsToExport.length} drawings: ${JSON.stringify(allDrawingsToExport)}`);

     let processed = 0;
     allDrawingsToExport.forEach(dwg => {
       exportDwg_ToArduino_OneOnly(dwg, filesToZip, () => {
         processed++;
         if (processed === allDrawingsToExport.length) {
           // All drawings exported
           fetchAndAddStaticFiles();
         }
       });
     });
   }

   function fetchAndAddStaticFiles() {
     // Determine which files to fetch based on connection type
     let filesToFetch = [];
     let zipFilename = `${mainDwgName}_serial.zip`;
     let dirPrefix = getDirPrefix();  // Use getDirPrefix() to get correct directory prefix
     let inoFilename = `${mainDwgName}_serial.ino`;

     if (currentConnectionType === 'serial') {
       filesToFetch = [
         { url: '/pfodMainMenu.h', filename: `${dirPrefix}pfodMainMenu.h` },
         { url: '/pfodMainMenu.cpp', filename: `${dirPrefix}pfodMainMenu.cpp` },
         { url: '/_pfodWeb__serial.ino', filename: `${dirPrefix}${inoFilename}` }
       ];
       zipFilename = `${mainDwgName}_serial.zip`;
     } else if (currentConnectionType === 'ble') {
       filesToFetch = [
         { url: '/pfodMainMenu.h', filename: `${dirPrefix}pfodMainMenu.h` },
         { url: '/pfodMainMenu.cpp', filename: `${dirPrefix}pfodMainMenu.cpp` },
         { url: '/_ESP32__ble.ino', filename: `${dirPrefix}${mainDwgName}_ble.ino` }
       ];
       zipFilename = `${mainDwgName}_ble.zip`;
     } else if (currentConnectionType === 'http') {
       filesToFetch = [
         { url: '/pfodMainMenu.h', filename: `${dirPrefix}pfodMainMenu.h` },
         { url: '/pfodMainMenu.cpp', filename: `${dirPrefix}pfodMainMenu.cpp` },
         { url: '/_ESP_Pico__http.ino', filename: `${dirPrefix}${mainDwgName}_http.ino` }
       ];
       zipFilename = `${mainDwgName}_http.zip`;
     } else if (currentConnectionType === 'dwg-only') {
       // For drawing files only, don't fetch any .ino or pfodMainMenu files
       filesToFetch = [];
       zipFilename = `Dwg_${mainDwgName}.zip`;
       // Proceed directly to creating zip with drawing files only
       createAndDownloadZip(filesToZip, zipFilename);
       if (missingDrawings.length > 0) {
         alert(`Arduino export completed.\n\nWarning: The following drawings are not loaded and so could not be exported:\n${missingDrawings.join(', ')}\n\nThe exported files will not include these drawings.`);
       }
       return;
     }

     // Use Promise.allSettled to handle all requests, then create zip once
     Promise.allSettled(filesToFetch.map(fileInfo =>
       fetch(fileInfo.url)
         .then(response => {
           if (!response.ok) {
             console.warn(`Warning: Could not fetch ${fileInfo.url}. File may not be available.`);
             return { filename: fileInfo.filename, content: null };
           }
           return response.text().then(content => ({ filename: fileInfo.filename, content }));
         })
         .catch(error => {
           console.warn(`Error fetching ${fileInfo.url}:`, error);
           return { filename: fileInfo.filename, content: null };
         })
     )).then(results => {
       // Add successfully loaded files to zip
       results.forEach(result => {
         if (result.status === 'fulfilled' && result.value.content !== null) {
           filesToZip.push({filename: result.value.filename, content: result.value.content});
           console.log(`Added ${result.value.filename} to zip`);
         }
       });

       // Create zip once after all files are processed
       createAndDownloadZip(filesToZip, zipFilename);
       if (missingDrawings.length > 0) {
         alert(`Arduino export completed.\n\nWarning: The following drawings are not loaded and so could not be exported:\n${missingDrawings.join(', ')}\n\nThe exported files will not include these drawings.`);
       }
     });
   }
   
   // Export a single drawing without collecting nested drawings
   // Used by exportAllDwgsToArduino after all drawings have been collected
   function exportDwg_ToArduino_OneOnly(drawingName, filesToZip, callback) {
     if (!drawingName) {
       callback();
       return;
     }

     try {
       console.log(`[ARDUINO_EXPORT] Exporting single drawing "${drawingName}" to Arduino format`);

       // Fetch the drawing data
       fetch(`/api/drawings/${drawingName}/data`)
       .then(response => {
         if (!response.ok) {
           throw new Error(`Drawing not found: ${response.status}`);
         }
         return response.json();
       })
       .then(drawingData => {
         // save the JSON data
         let dwgName = drawingName.replace(/[^a-zA-Z0-9_]/g, '');
         const dirPrefix = getDirPrefix();

         filesToZip.push({filename: `${dirPrefix}json/${drawingName}.json`, content: JSON.stringify(drawingData,null,2)});
         filesToZip.push({filename: `${dirPrefix}Dwg_${drawingName}.h`, content: convertJsonToArduino_H(drawingData)});
         filesToZip.push({filename: `${dirPrefix}Dwg_${drawingName}.cpp`, content: convertJsonToArduino_CPP(drawingData, false)});
         console.log(`[ARDUINO_EXPORT] Arduino code for drawing "${drawingName}" converted successfully`);
         callback();
       })
       .catch(error => {
         console.error(`Warning: Could not export drawing "${drawingName}":`, error);
         // Track missing drawing but continue with export
         if (!missingDrawings.includes(drawingName)) {
           missingDrawings.push(drawingName);
         }
         callback();
       });
     } catch (error) {
       console.error(`Error exporting drawing "${drawingName}" to Arduino:`, error);
       // Track missing drawing but continue
       if (!missingDrawings.includes(drawingName)) {
         missingDrawings.push(drawingName);
       }
       callback();
     }
   }

   // DEPRECATED: Keep this for backward compatibility with any remaining references
   function exportDwg_ToArduino(drawingName, filesToZip, insertedDwgs, isMain = false) {
     console.warn(`[ARDUINO_EXPORT] WARNING: exportDwg_ToArduino is deprecated, use exportDwg_ToArduino_OneOnly instead`);
     exportDwg_ToArduino_OneOnly(drawingName, filesToZip, () => {});
   }
   
    
//=================================== pfodMainDrawing.h ==============================
//======================================================================================
//=====================================================================================
    // Function to convert JSON drawing data to Arduino code
    function pfodMainDrawing_H(mainDrawingName) {
        let dwgName = (mainDrawingName).replace(/[^a-zA-Z0-9_]/g, '');
        let arduinoCode = '';
     //   let refresh = drawingData.refresh || 0;
        
        // Add .h header comment
arduinoCode +=`#ifndef PFOD_MAIN_DRAWING_H
#define PFOD_MAIN_DRAWING_H

// pfodMainDrawing.h file  =================
// generated by ${arduinoExportVers}
// This file sets the mainDwg 
// Generated from pfod drawing ${mainDrawingName}.json
/*   
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */
#include <pfodDrawing.h>
`;
   arduinoCode +=`
void initDrawings();
extern pfodDrawing& mainDwg; // defined in pfodMainDrawing.cpp, the variable that pfodMainMenu.cpp expects to define the main drawing

#endif  
`;
        return arduinoCode;
    }
    
//=================================== pfodMainDrawing.cpp ==============================
//======================================================================================
//=====================================================================================
    // Function to convert JSON drawing data to Arduino code
    function pfodMainDrawing_CPP(mainDrawingName,insertedDwgs) {
        let dwgName = (mainDrawingName).replace(/[^a-zA-Z0-9_]/g, '');
        let arduinoCode = '';
// cpp file
arduinoCode +=`// pfodMainDrawing.cpp  file ==============
// generated by ${arduinoExportVers}
// This file sets the mainDwg  and supplies initDrawings()

// Generated from pfod drawing ${mainDrawingName}.json

/*   
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

#include <pfodDrawing.h>
#include <pfodDebugPtr.h>

#include "Dwg_${mainDrawingName}.h"
`;
//=== add includes for all inserted dwgs so init can be called on them
     for (const dwg of insertedDwgs) {
        // Add .h header comment
       let insertDwgName = (dwg).replace(/[^a-zA-Z0-9_]/g, '');
arduinoCode +=`#include "Dwg_${insertDwgName}.h"
`;
     }

        
arduinoCode +=`
// #define DEBUG
static Print* debugPtr = NULL;   // local to this file

static bool initialized = false;

pfodDrawing& mainDwg = dwg_${dwgName}; // the variable that pfodMainMenu.cpp expects to define the main drawing

`;
   arduinoCode +=`
// initialize all drawings here.  adds them to parser linked list of drawings
void initDrawings() {
  if (initialized) {
    return;
  }
  initialized = true;  
  (void)debugPtr; // suppress not used warning
#ifdef DEBUG
  debugPtr = getDebugPtr();
#endif
`;

arduinoCode +=`  dwg_${dwgName}.init();
`;

     for (const dwg of insertedDwgs) {
        // Add init
       let insertDwgName = (dwg).replace(/[^a-zA-Z0-9_]/g, '');
arduinoCode +=`  dwg_${insertDwgName}.init();
`;
     }
arduinoCode +=`}
`;
        return arduinoCode;
    }
    
    
//=================================== convertJsonToArduino_H ==============================
//======================================================================================
//=====================================================================================
    
    // Function to convert JSON drawing data to Arduino code
    function convertJsonToArduino_H(drawingData) {
        if (!drawingData || !drawingData.items) {
          haveErrors = true;
            return '// No drawing data available\n';
        }
        let dwgName = (drawingData.name).replace(/[^a-zA-Z0-9_]/g, '');
        let arduinoCode = '';
     //   let refresh = drawingData.refresh || 0;
        
        // Add .h header comment
arduinoCode +=`// Dwg_${dwgName}.h  file  =================
// generated by ${arduinoExportVers}
#ifndef DWG_${dwgName}_H
#define DWG_${dwgName}_H
// Arduino code for drawing: ${dwgName}
// Generated from pfod drawing ${drawingData.name}.json
/*   
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */
#include <pfodDrawing.h>
`;

arduinoCode +=` 
class Dwg_${dwgName} : public pfodDrawing {
  public:
    Dwg_${dwgName}();
    void init();
    bool sendDwg(); // returns true if dwg sent else false i.e. not this dwg's loadCmd
    bool processDwgCmds(); // return true if handled else false

  protected:
    void sendFullDrawing();
    void sendUpdate();
    void sendIndexedItems();
  private:
    bool initialized;      
`;
let idxList = [];
let cmdList = [];
// ======= processing Code block =======================
// add idx names here
        // Process each item
        if (Array.isArray(drawingData.items)) {
            drawingData.items.forEach(item => {
                if (!item || !item.type || !(item.indexed === 'true' || item.indexed === true)) {
                  return;
                }
                if (!idxList.includes(item.idxName)) {
                  idxList.push(item.idxName);
                  arduinoCode += `    pfodAutoIdx ${item.idxName};\n`;
                }
            });
        }
        if (Array.isArray(drawingData.items)) {
            drawingData.items.forEach(item => {
                if (!item || !item.cmdName || !item.type || item.type !== 'touchZone' ) {
                  return;
                }
                if (!cmdList.includes(item.cmdName)) {
                  idxList.push(item.cmdName);
                  arduinoCode += `    pfodAutoCmd ${item.cmdName};\n`; 
                }
            });
        }
arduinoCode += `\n`;
// ======= END processing Code block =======================

arduinoCode +=`};

extern Dwg_${dwgName} dwg_${dwgName};
#endif
// ================= end of Dwg_${dwgName}.h  file
`;
        return arduinoCode;
}


    // Function to convert JSON drawing data to Arduino code
    function convertJsonToArduino_CPP(drawingData, isMain = false) {
        if (!drawingData || !drawingData.items) {
            return '// No drawing data available\n';
        }
        let dwgName = (drawingData.name).replace(/[^a-zA-Z0-9_]/g, '');
        let arduinoCode = '';
        let refresh = drawingData.refresh || 0;
// cpp file
arduinoCode +=`// Dwg_${dwgName}.cpp  file ==============
// generated by ${arduinoExportVers}
/*   
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

#include "Dwg_${dwgName}.h"
#include <pfodDebugPtr.h>

//#define DEBUG
static Print* debugPtr = NULL;  // local to this file

`;
//  if(isMain) {  //for all dwgs
arduinoCode +=`Dwg_${dwgName} dwg_${dwgName};

`;
 // }

// ======= processing Code block =======================
// include other dwg includes here
// look throught looking for insertDwg cmds
if (Array.isArray(drawingData.items)) {
   drawingData.items.forEach(item => {
   if (!item || !item.type || !(item.type === 'insertDwg')) {
      return;
   }
   arduinoCode += `#include "Dwg_${item.drawingName}.h"\n`;
  // arduinoCode += `Dwg_${item.drawingName} dwg_${item.drawingName};\n`;   
  });
}
arduinoCode += `\n`;
// ======= END processing Code block =======================

arduinoCode +=`static unsigned long dwgRefresh = ${refresh};
`;

arduinoCode +=`
Dwg_${dwgName}::Dwg_${dwgName}() {
  initialized = false;
}

void Dwg_${dwgName}::init() {
  if (initialized) {
    return;
  }
  initialized = true;
  (void)debugPtr;  // suppress unused warning
#ifdef DEBUG
  debugPtr = getDebugPtr();
#endif
  pfodDrawing::init();
}

// return true if handled else false
// either handle cmd here or in main sketch
bool Dwg_${dwgName}::processDwgCmds() {
// byte dwgCmd = parserPtr->parseDwgCmd(); // pfodParse calls this automagically before calling this method
  if (!(*(parserPtr->getDwgCmd()))) {  // ==> getDwgCmd returned pointer to empty string
    return false; // not dwg cmd, not handled
  }
`;

// ======= processing Code block =======================
        if (Array.isArray(drawingData.items)) {
            drawingData.items.forEach(item => {
                if (!item || !item.cmdName || !item.type || item.type !== 'touchZone' ) {
                  return;
                }
                arduinoCode += `  if (parserPtr->dwgCmdEquals(${item.cmdName})) { // handle touchZone ${item.cmdName}`;    
arduinoCode += `
    // parserPtr->printDwgCmdReceived(debugPtr); // does nothing if passed NULL
    // add your cmd handling code here
    sendUpdate();
    return true;
  }
`;
            });
        }
// ======= End processing Code block =======================

        arduinoCode += `
  // if (debugPtr) { debugPtr->print("dwgCmd did not match:"); debugPtr->println(cmd_c1); }
  return false; // not handled
}

bool Dwg_${dwgName}::sendDwg() {
  if (!parserPtr->cmdEquals(*this)) {
    return false; // not this dwg's loadCmd
  }  // else
  if (parserPtr->isRefresh()) { // refresh just send update
    sendUpdate();
  } else {
    sendFullDrawing();
  }
  return true;
}
`;

arduinoCode +=`
// all the indexed items are included here, edit as needed for updates
void Dwg_${dwgName}::sendIndexedItems() {
`;  

// ======= processing Code block =======================
        // Process each item
        if (Array.isArray(drawingData.items)) {
            drawingData.items.forEach(item => {
                if (item.type === 'hide' || item.type === 'unhide' || item.type === 'erase') {
                  return; // skip index here as was sent in sendFullDrawing
                }                
                if (!item || !item.type || (!(item.indexed === 'true' || item.indexed === true)) || item.type === 'index' ) {
                  return; // skip index here as was sent in sendFullDrawing
                }                
                const arduinoLine = convertItemToArduino(item);
                if (arduinoLine) {
                    arduinoCode += `    ${arduinoLine}\n`;
                }
            });
        }
arduinoCode +=`}
`;
// ======= End processing Code block =======================

const bgColor = convertColor(drawingData.color || '#ffffff');
arduinoCode += `        
void Dwg_${dwgName}::sendFullDrawing() {
    // Start the drawing
    dwgsPtr->start(${drawingData.x || 50}, ${drawingData.y || 50}, ${bgColor});
    parserPtr->sendRefreshAndVersion(dwgRefresh); // sets version and refresh time for dwg pfodWeb processes this
`;
let indexList = [];
// ======= processing Code block =======================
        // Process each item
        if (Array.isArray(drawingData.items)) {
            drawingData.items.forEach(item => {
                if (item.type === 'hide' || item.type === 'unhide' || item.type === 'erase') {
                  const arduinoLine = convertItemToArduino(item);
                  if (arduinoLine) {
                    arduinoCode += `    ${arduinoLine}\n`;
                  }                  
                } else { // not hide unhide erase
                  if ((item.indexed === 'true') || (item.indexed === true) ) {
                    if (!indexList.includes(item.idxName)) {
                      indexList.push(item.idxName);
                      arduinoCode += `    dwgsPtr->index().idx(${item.idxName}).send(); // place holder for indexed item\n`;
                    }
                  } else {
                    const arduinoLine = convertItemToArduino(item);
                    if (arduinoLine) {
                      arduinoCode += `    ${arduinoLine}\n`;
                    }
                  }
                }
            });
        }
        
        // End the drawing
        arduinoCode += `    sendIndexedItems(); // update indexed items with their real values\n`;        
        arduinoCode += `    dwgsPtr->end();\n`;
        arduinoCode += '}\n';
// ======= End processing Code block =======================

arduinoCode += `        
// only indexed items can be sent as an update
// all the indexed items are included here, edit as needed
void Dwg_${dwgName}::sendUpdate() {
    dwgsPtr->startUpdate();
    sendIndexedItems(); // send updated indexed items        
`;

arduinoCode += `    dwgsPtr->end();
}
// ============== end of Dwg_${dwgName}.cpp  file 
`        
        return arduinoCode;
    }
    
    // Function to convert individual drawing item to Arduino code
    function convertItemToArduino(item) {
        // Helper function to convert offset values
        function convertOffset(offset) {
            if (offset === 'COL' || offset === 'col') return 'dwgsPtr->TOUCHED_COL';
            if (offset === 'ROW' || offset === 'row') return 'dwgsPtr->TOUCHED_ROW';
            return offset || 0;
        }
        
        const type = item.type.toLowerCase();
        //const idx = item.idx !== undefined && item.idx !== null ? item.idx : 0;
        const color = convertColor(item.color || '#000000');
        const xOffset = convertOffset(item.xOffset || 0);
        const yOffset = convertOffset(item.yOffset || 0);
        
        // Helper function to add idx only if not 0
        const addIdx = (code, idxName) => {
            if (idxName) {
                return code + `.idx(${idxName})`;
            }
            return code;
        };
        
        switch (type) {
            case 'line':
                let lineCode = addIdx('dwgsPtr->line()', item.idxName);
                lineCode += `.color(${color}).size(${item.xSize || 0},${item.ySize || 0}).offset(${xOffset},${yOffset}).send();`;
                return lineCode;
            
            case 'rectangle':
                let rectCode = `dwgsPtr->rectangle()`;
                if (item.filled === 'true' || item.filled === true) rectCode += '.filled()';
                if (item.centered === 'true' || item.centered === true) rectCode += '.centered()';
                if (item.rounded === 'true' || item.rounded === true) rectCode += '.rounded()';
                rectCode = addIdx(rectCode, item.idxName);
                rectCode += `.color(${color}).size(${item.xSize},${item.ySize}).offset(${xOffset},${yOffset}).send();`;
                return rectCode;
            
            case 'circle':
                let circleCode = `dwgsPtr->circle()`;
                if (item.filled === 'true' || item.filled === true) circleCode += '.filled()';
                circleCode = addIdx(circleCode, item.idxName);
                circleCode += `.color(${color}).radius(${item.radius}).offset(${xOffset},${yOffset}).send();`;
                return circleCode;
            
            case 'arc':
                let arcCode = addIdx('dwgsPtr->arc()', item.idxName);
                if (item.filled === 'true' || item.filled === true) arcCode += '.filled()';
                arcCode += `.color(${color}).radius(${item.radius}).start(${item.start}).angle(${item.angle}).offset(${xOffset},${yOffset}).send();`;
                return arcCode;
            
            case 'label':
                let labelCode = addIdx('dwgsPtr->label()', item.idxName);
                const escapedText = (item.text || '').replace(/\n/g, '\\n');
                labelCode += `.color(${color}).text("${escapedText}")`;
                if (item.fontSize) labelCode += `.fontSize(${item.fontSize})`;
                if (item.bold === 'true' || item.bold === true) labelCode += '.bold()';
                if (item.italic === 'true' || item.italic === true) labelCode += '.italic()';
                if (item.underline === 'true' || item.underline === true) labelCode += '.underline()';
                labelCode += `.offset(${xOffset},${yOffset})`;
                
                // Handle alignment
                if (item.align === 'left') labelCode += '.left()';
                else if (item.align === 'right') labelCode += '.right()';
                else labelCode += '.center()';
                
                // Handle new properties: value, units, decimals
                if (item.units !== undefined && item.units !== '') labelCode += `.units("${item.units}")`;
                if (item.decimals !== undefined && item.decimals !== '') labelCode += `.decimals(${item.decimals})`;
                if (item.value !== undefined && item.value !== '') labelCode += `.value(${item.value})`;
                
                labelCode += '.send();';
                return labelCode;
            
            case 'value':
                let valueCode = addIdx('dwgsPtr->label()', item.idxName);
                const escapedValueText = (item.text || '').replace(/\n/g, '\\n');
                valueCode += `.color(${color}).text("${escapedValueText}")`;
                if (item.fontSize) valueCode += `.fontSize(${item.fontSize})`;
                if (item.bold === 'true' || item.bold === true) valueCode += '.bold()';
                if (item.italic === 'true' || item.italic === true) valueCode += '.italic()';
                if (item.underline === 'true' || item.underline === true) valueCode += '.underline()';
                valueCode += `.offset(${xOffset},${yOffset})`;
                
                // Handle alignment
                if (item.align === 'left') valueCode += '.left()';
                else if (item.align === 'right') valueCode += '.right()';
                else valueCode += '.center()';
                
                if (item.intValue !== undefined) {
                    const intValue = convertOffset(item.intValue);
                    valueCode += `.intValue(${intValue})`;
                    if (item.units) valueCode += `.units("${item.units}")`;
                    if (item.max !== undefined) valueCode += `.maxValue(${item.max})`;
                    if (item.min !== undefined) valueCode += `.minValue(${item.min})`;
                    if (item.displayMax !== undefined) valueCode += `.displayMax(${item.displayMax})`;
                    if (item.displayMin !== undefined) valueCode += `.displayMin(${item.displayMin})`;
                    if (item.decimals !== undefined) valueCode += `.decimals(${item.decimals})`;
                } else {
                    // Floating point value
                    if (item.decimals !== undefined) valueCode += `.decimals(${item.decimals})`;
                    if (item.units) valueCode += `.units("${item.units}")`;
                    valueCode += `.floatReading(0.0)`;
                }
                
                valueCode += '.send();';
                return valueCode;
                              
            case 'hide':
                if (item.drawingName) return `dwgsPtr->hide().loadCmd(dwg_${item.drawingName}).send();`;
                else if (item.cmdName) return `dwgsPtr->hide().cmd(${item.cmdName}).send();`;
                else if (item.idxName) return `dwgsPtr->hide().idx(${item.idxName}).send();`;
                else return `// hide: no cmd or idx specified`;
            
            case 'unhide':
                if (item.drawingName) return `dwgsPtr->unhide().loadCmd(dwg_${item.drawingName}).send();`;
                else if (item.cmdName) return `dwgsPtr->unhide().cmd(${item.cmdName}).send();`;
                else if (item.idxName) return `dwgsPtr->unhide().idx(${item.idxName}).send();`;
                else return `// unhide: no cmd or idx specified`;
            
            case 'touchzone':
                let touchCode = `dwgsPtr->touchZone().cmd(${item.cmdName})`;
                if (item.idx && item.idx !== 0) touchCode += `.idx(${item.idx})`; // this is the priority rather than an idx
                if (item.centered === 'true' || item.centered === true) touchCode += '.centered()';
                touchCode += `.size(${item.xSize || 1},${item.ySize || 1}).offset(${xOffset},${yOffset})`;
                
                // Handle filter
                if (item.filter) {
                    const filterNames = window.TouchZoneFilters.decode(item.filter);
                    if (filterNames.length > 0) {
                        const arduinoFilters = filterNames.map(name => `dwgsPtr->${name}`);
                        touchCode += `.filter(${arduinoFilters.join(' | ')})`;
                    }
                }
                
                touchCode += '.send();';
                return touchCode;
            
            case 'touchaction':
                if (item.action && Array.isArray(item.action) && item.action.length > 0) {
                    // Generate one dwgPtr->touchAction statement for each action item
                    const touchActionStatements = [];
                    item.action.forEach(actionItem => {
                        const actionCode = convertItemToArduino(actionItem);
                        if (actionCode) {
                            // Remove .send() from the action code
                            const actionWithoutSend = actionCode.replace('.send();', '');
                            touchActionStatements.push(`dwgsPtr->touchAction().cmd(${item.cmdName}).action(${actionWithoutSend}).send();`);
                        }
                    });
                    return touchActionStatements.join('\n    ');
                }
                return `dwgsPtr->touchAction().cmd(${item.cmdName}).action(dwgsPtr->rectangle().size(1,1)).send();`;
            
            case 'touchactioninput':
                let touchActionInputCode = `dwgsPtr->touchActionInput().cmd(${item.cmdName}).prompt("${item.prompt || ''}")`;
                if (item.idxName) touchActionInputCode += `.textIdx(${item.idxName})`;
                if (item.fontSize !== undefined && item.fontSize !== null) touchActionInputCode += `.fontSize(${item.fontSize})`;
                if (item.color !== undefined && item.color !== null) touchActionInputCode += `.color(${convertColor(item.color)})`;
                if (item.backgroundColor !== undefined && item.backgroundColor !== null) touchActionInputCode += `.backgroundColor(${convertColor(item.backgroundColor)})`;
                touchActionInputCode += '.send();';
                return touchActionInputCode;
            
            case 'index':
                if (item.cmdName) return `dwgsPtr->index().cmd(${item.cmdName}).send();`;
                else if (item.idxName) return `dwgsPtr->index().idx(${item.idxName}).send();`;
                else return `// index: no idx specified`;
            
                  
            case 'erase':
                if (item.drawingName) return `dwgsPtr->erase().loadCmd(dwg_${item.drawingName}).send();`;
                else if (item.cmdName) return `dwgsPtr->erase().cmd(${item.cmdName}).send();`;
                else if (item.idxName) return `dwgsPtr->erase().idx(${item.idxName}).send();`;
                else return `// hide: no cmd or idx specified`;
            
            case 'insertdwg':
                return `dwgsPtr->insertDwg().loadCmd(dwg_${item.drawingName}).offset(${xOffset},${yOffset}).send();`;
            
            case 'pushzero':
                const cols = item.x || 0.0;
                const rows = item.y || 0.0;
                const scaling = item.scale || 1.0;
                return `dwgsPtr->pushZero(${cols}, ${rows}, ${scaling});`;
            
 
            case 'popzero':
                return `dwgsPtr->popZero();`;
            
            default:
                return `// Unsupported item type: ${type}`;
        }
    }
    
    // Function to convert color from integer to Arduino format
    function convertColor(colorInt) {
        if (typeof colorInt === 'number' && colorInt === -1) {
            return 'dwgsPtr->BLACK_WHITE';
        }
        // Handle non-numeric input - default to BLACK
        if (typeof colorInt !== 'number' || colorInt < 0 || colorInt > 255) {
            return 'dwgsPtr->BLACK';
        }
        
        // Floor to ensure integer
        colorInt = Math.floor(colorInt);
        
        // Standard colors (0-15) - use Arduino color constants
        if (colorInt <= 15) {
            const standardColorNames = [
                'dwgsPtr->BLACK',     // 0
                'dwgsPtr->MAROON',    // 1
                'dwgsPtr->GREEN',     // 2
                'dwgsPtr->OLIVE',     // 3
                'dwgsPtr->NAVY',      // 4
                'dwgsPtr->PURPLE',    // 5
                'dwgsPtr->TEAL',      // 6
                'dwgsPtr->SILVER',    // 7
                'dwgsPtr->GREY',      // 8
                'dwgsPtr->RED',       // 9
                'dwgsPtr->LIME',      // 10
                'dwgsPtr->YELLOW',    // 11
                'dwgsPtr->BLUE',      // 12
                'dwgsPtr->FUCHSIA',   // 13
                'dwgsPtr->AQUA',      // 14
                'dwgsPtr->WHITE'      // 15
            ];
            return standardColorNames[colorInt];
        }
        
        // Extended colors (16-255) - use the actual number
        return colorInt.toString();
    }
    
    
function createAndDownloadZip(files, zipFilename = 'archive.zip') {
    // Helper function to convert string to Uint8Array
    function stringToUint8Array(str) {
        const encoder = new TextEncoder();
        return encoder.encode(str);
    }
    
    // Helper function to create date/time for ZIP format
    function getZipDateTime() {
        const now = new Date();
        const date = ((now.getFullYear() - 1980) << 9) | 
                    ((now.getMonth() + 1) << 5) | 
                    now.getDate();
        const time = (now.getHours() << 11) | 
                    (now.getMinutes() << 5) | 
                    (now.getSeconds() >> 1);
        return { date, time };
    }
    
    // Helper function to calculate CRC32
    function crc32(data) {
        const crcTable = new Uint32Array(256);
        
        // Generate CRC table
        for (let i = 0; i < 256; i++) {
            let crc = i;
            for (let j = 0; j < 8; j++) {
                if (crc & 1) {
                    crc = (crc >>> 1) ^ 0xEDB88320;
                } else {
                    crc = crc >>> 1;
                }
            }
            crcTable[i] = crc;
        }
        
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc = crcTable[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8);
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }
    
    // Helper function to write little-endian numbers
    function writeUint32LE(value) {
        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF,
            (value >>> 16) & 0xFF,
            (value >>> 24) & 0xFF
        ]);
    }
    
    function writeUint16LE(value) {
        return new Uint8Array([
            value & 0xFF,
            (value >>> 8) & 0xFF
        ]);
    }
    
    const zipData = [];
    const centralDirectory = [];
    let offset = 0;
    
    const dateTime = getZipDateTime();
    
    // Helper function to normalize file paths
    function normalizePath(path) {
        // Remove leading slashes to avoid absolute path issues
        return path.replace(/^\/+/, '');
    }
    
    // Helper function to process directories
    function processDirectories(files) {
        const directories = new Set();
        
        files.forEach(file => {
            const normalizedPath = normalizePath(file.filename);
            const pathParts = normalizedPath.split('/');
            for (let i = 0; i < pathParts.length - 1; i++) {
                const dirPath = pathParts.slice(0, i + 1).join('/') + '/';
                directories.add(dirPath);
            }
        });
        
        return Array.from(directories).map(dir => ({
            filename: dir,
            content: '',
            isDirectory: true
        }));
    }
    
    // Add directory entries to files list
    const allEntries = [...processDirectories(files), ...files.map(file => ({
        ...file,
        filename: normalizePath(file.filename)
    }))];
    
    // Process each file and directory
    allEntries.forEach(file => {
        if (!file.filename || (file.content === undefined && !file.isDirectory)) {
            throw new Error('Each file must have a filename and content property');
        }
        
        const filename = stringToUint8Array(file.filename);
        const content = file.isDirectory ? new Uint8Array(0) : stringToUint8Array(file.content);
        const crc = crc32(content);
        
        // Local file header
        const localHeader = new Uint8Array(30 + filename.length);
        let pos = 0;
        
        // Local file header signature
        localHeader.set([0x50, 0x4B, 0x03, 0x04], pos); pos += 4;
        // Version needed to extract
        localHeader.set(writeUint16LE(20), pos); pos += 2;
        // General purpose bit flag
        localHeader.set(writeUint16LE(0), pos); pos += 2;
        // Compression method (0 = no compression)
        localHeader.set(writeUint16LE(0), pos); pos += 2;
        // Last mod file time
        localHeader.set(writeUint16LE(dateTime.time), pos); pos += 2;
        // Last mod file date
        localHeader.set(writeUint16LE(dateTime.date), pos); pos += 2;
        // CRC-32
        localHeader.set(writeUint32LE(crc), pos); pos += 4;
        // Compressed size
        localHeader.set(writeUint32LE(content.length), pos); pos += 4;
        // Uncompressed size
        localHeader.set(writeUint32LE(content.length), pos); pos += 4;
        // File name length
        localHeader.set(writeUint16LE(filename.length), pos); pos += 2;
        // Extra field length
        localHeader.set(writeUint16LE(0), pos); pos += 2;
        // File name
        localHeader.set(filename, pos);
        
        // Add to zip data
        zipData.push(localHeader);
        zipData.push(content);
        
        // Central directory file header
        const centralHeader = new Uint8Array(46 + filename.length);
        pos = 0;
        
        // Central file header signature
        centralHeader.set([0x50, 0x4B, 0x01, 0x02], pos); pos += 4;
        // Version made by
        centralHeader.set(writeUint16LE(20), pos); pos += 2;
        // Version needed to extract
        centralHeader.set(writeUint16LE(20), pos); pos += 2;
        // General purpose bit flag
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // Compression method
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // Last mod file time
        centralHeader.set(writeUint16LE(dateTime.time), pos); pos += 2;
        // Last mod file date
        centralHeader.set(writeUint16LE(dateTime.date), pos); pos += 2;
        // CRC-32
        centralHeader.set(writeUint32LE(crc), pos); pos += 4;
        // Compressed size
        centralHeader.set(writeUint32LE(content.length), pos); pos += 4;
        // Uncompressed size
        centralHeader.set(writeUint32LE(content.length), pos); pos += 4;
        // File name length
        centralHeader.set(writeUint16LE(filename.length), pos); pos += 2;
        // Extra field length
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // File comment length
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // Disk number start
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // Internal file attributes
        centralHeader.set(writeUint16LE(0), pos); pos += 2;
        // External file attributes (set directory bit if it's a directory)
        const externalAttrs = file.isDirectory ? 0x10 : 0; // 0x10 = directory attribute
        centralHeader.set(writeUint32LE(externalAttrs), pos); pos += 4;
        // Relative offset of local header
        centralHeader.set(writeUint32LE(offset), pos); pos += 4;
        // File name
        centralHeader.set(filename, pos);
        
        centralDirectory.push(centralHeader);
        
        // Update offset
        offset += localHeader.length + content.length;
    });
    
    // Calculate central directory size
    const centralDirSize = centralDirectory.reduce((sum, header) => sum + header.length, 0);
    
    // End of central directory record
    const endOfCentralDir = new Uint8Array(22);
    pos = 0;
    
    // End of central dir signature
    endOfCentralDir.set([0x50, 0x4B, 0x05, 0x06], pos); pos += 4;
    // Number of this disk
    endOfCentralDir.set(writeUint16LE(0), pos); pos += 2;
    // Number of the disk with the start of the central directory
    endOfCentralDir.set(writeUint16LE(0), pos); pos += 2;
    // Total number of entries in the central directory on this disk
    endOfCentralDir.set(writeUint16LE(allEntries.length), pos); pos += 2;
    // Total number of entries in the central directory
    endOfCentralDir.set(writeUint16LE(allEntries.length), pos); pos += 2;
    // Size of the central directory
    endOfCentralDir.set(writeUint32LE(centralDirSize), pos); pos += 4;
    // Offset of start of central directory
    endOfCentralDir.set(writeUint32LE(offset), pos); pos += 4;
    // ZIP file comment length
    endOfCentralDir.set(writeUint16LE(0), pos);
    
    // Combine all parts
    const totalSize = zipData.reduce((sum, data) => sum + data.length, 0) + 
                     centralDirSize + endOfCentralDir.length;
    
    const zipBuffer = new Uint8Array(totalSize);
    let bufferPos = 0;
    
    // Add file data
    zipData.forEach(data => {
        zipBuffer.set(data, bufferPos);
        bufferPos += data.length;
    });
    
    // Add central directory
    centralDirectory.forEach(header => {
        zipBuffer.set(header, bufferPos);
        bufferPos += header.length;
    });
    
    // Add end of central directory
    zipBuffer.set(endOfCentralDir, bufferPos);
    
    // Create blob and download
    const blob = new Blob([zipBuffer], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = zipFilename;
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
    
    console.log(`ZIP file "${zipFilename}" created and downloaded successfully`);
}

    // Browser environment - functions are available globally
    window.exportDrawingToArduino = exportDrawingToArduino;
    window.showArduinoExportModal = showArduinoExportModal;
