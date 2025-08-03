/*   
   colorUtils.js
 * (c)2025 Forward Computing and Control Pty. Ltd.
 * NSW Australia, www.forward.com.au
 * This code is not warranted to be fit for any purpose. You may only use it at your own risk.
 * This generated code may be freely used for both private and commercial use
 * provided this copyright is maintained.
 */

// 256-color mapping based on xterm color chart
// Reference: http://www.calmar.ws/vim/256-xterm-24bit-rgb-color-chart.html

const XTERM_COLORS = [
    // 0-15: Standard colors
    '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
    '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
    
    // 16-231: 216 colors (6x6x6 cube)
    '#000000', '#00005f', '#000087', '#0000af', '#0000d7', '#0000ff',
    '#005f00', '#005f5f', '#005f87', '#005faf', '#005fd7', '#005fff',
    '#008700', '#00875f', '#008787', '#0087af', '#0087d7', '#0087ff',
    '#00af00', '#00af5f', '#00af87', '#00afaf', '#00afd7', '#00afff',
    '#00d700', '#00d75f', '#00d787', '#00d7af', '#00d7d7', '#00d7ff',
    '#00ff00', '#00ff5f', '#00ff87', '#00ffaf', '#00ffd7', '#00ffff',
    '#5f0000', '#5f005f', '#5f0087', '#5f00af', '#5f00d7', '#5f00ff',
    '#5f5f00', '#5f5f5f', '#5f5f87', '#5f5faf', '#5f5fd7', '#5f5fff',
    '#5f8700', '#5f875f', '#5f8787', '#5f87af', '#5f87d7', '#5f87ff',
    '#5faf00', '#5faf5f', '#5faf87', '#5fafaf', '#5fafd7', '#5fafff',
    '#5fd700', '#5fd75f', '#5fd787', '#5fd7af', '#5fd7d7', '#5fd7ff',
    '#5fff00', '#5fff5f', '#5fff87', '#5fffaf', '#5fffd7', '#5fffff',
    '#870000', '#87005f', '#870087', '#8700af', '#8700d7', '#8700ff',
    '#875f00', '#875f5f', '#875f87', '#875faf', '#875fd7', '#875fff',
    '#878700', '#87875f', '#878787', '#8787af', '#8787d7', '#8787ff',
    '#87af00', '#87af5f', '#87af87', '#87afaf', '#87afd7', '#87afff',
    '#87d700', '#87d75f', '#87d787', '#87d7af', '#87d7d7', '#87d7ff',
    '#87ff00', '#87ff5f', '#87ff87', '#87ffaf', '#87ffd7', '#87ffff',
    '#af0000', '#af005f', '#af0087', '#af00af', '#af00d7', '#af00ff',
    '#af5f00', '#af5f5f', '#af5f87', '#af5faf', '#af5fd7', '#af5fff',
    '#af8700', '#af875f', '#af8787', '#af87af', '#af87d7', '#af87ff',
    '#afaf00', '#afaf5f', '#afaf87', '#afafaf', '#afafd7', '#afafff',
    '#afd700', '#afd75f', '#afd787', '#afd7af', '#afd7d7', '#afd7ff',
    '#afff00', '#afff5f', '#afff87', '#afffaf', '#afffd7', '#afffff',
    '#d70000', '#d7005f', '#d70087', '#d700af', '#d700d7', '#d700ff',
    '#d75f00', '#d75f5f', '#d75f87', '#d75faf', '#d75fd7', '#d75fff',
    '#d78700', '#d7875f', '#d78787', '#d787af', '#d787d7', '#d787ff',
    '#d7af00', '#d7af5f', '#d7af87', '#d7afaf', '#d7afd7', '#d7afff',
    '#d7d700', '#d7d75f', '#d7d787', '#d7d7af', '#d7d7d7', '#d7d7ff',
    '#d7ff00', '#d7ff5f', '#d7ff87', '#d7ffaf', '#d7ffd7', '#d7ffff',
    '#ff0000', '#ff005f', '#ff0087', '#ff00af', '#ff00d7', '#ff00ff',
    '#ff5f00', '#ff5f5f', '#ff5f87', '#ff5faf', '#ff5fd7', '#ff5fff',
    '#ff8700', '#ff875f', '#ff8787', '#ff87af', '#ff87d7', '#ff87ff',
    '#ffaf00', '#ffaf5f', '#ffaf87', '#ffafaf', '#ffafd7', '#ffafff',
    '#ffd700', '#ffd75f', '#ffd787', '#ffd7af', '#ffd7d7', '#ffd7ff',
    '#ffff00', '#ffff5f', '#ffff87', '#ffffaf', '#ffffd7', '#ffffff',
    
    // 232-255: Grayscale
    '#080808', '#121212', '#1c1c1c', '#262626', '#303030', '#3a3a3a',
    '#444444', '#4e4e4e', '#585858', '#626262', '#6c6c6c', '#767676',
    '#808080', '#8a8a8a', '#949494', '#9e9e9e', '#a8a8a8', '#b2b2b2',
    '#bcbcbc', '#c6c6c6', '#d0d0d0', '#dadada', '#e4e4e4', '#eeeeee'
];


function getBlackWhite(color) {
    // Convert color to RGB values
    function getRGB(color) {
        // Handle hex colors
        if (typeof color === 'string' && color.startsWith('#')) {
            const hex = color.slice(1);
            const r = parseInt(hex.substr(0, 2), 16);
            const g = parseInt(hex.substr(2, 2), 16);
            const b = parseInt(hex.substr(4, 2), 16);
            return [r, g, b];
        }
        
        // Handle color numbers - convert to hex first, then to RGB
        const hexColor = getColorHex(color);
        const hex = hexColor.slice(1);
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return [r, g, b];
    }
    
    // Calculate relative luminance
    function getLuminance(r, g, b) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            c = c / 255;
            return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    
    // Calculate contrast ratio between two colors
    function getContrastRatio(lum1, lum2) {
        const lighter = Math.max(lum1, lum2);
        const darker = Math.min(lum1, lum2);
        return (lighter + 0.05) / (darker + 0.05);
    }
    
    const [r, g, b] = getRGB(color);
    const colorLuminance = getLuminance(r, g, b);
    
    // Luminance values for pure black and white
    const blackLuminance = 0;
    const whiteLuminance = 1;
    
    // Calculate contrast ratios
    const contrastWithBlack = getContrastRatio(colorLuminance, blackLuminance);
    const contrastWithWhite = getContrastRatio(colorLuminance, whiteLuminance);
    
    // Return the color number with higher contrast
    return contrastWithBlack > contrastWithWhite ? 0 : 15; // BLACK (0) : WHITE (15)
}


function getColorHex(colorNumber) {
    if (colorNumber < 0 || colorNumber > 255) {
        return '#000000'; // Default to black for invalid numbers
    }
    return XTERM_COLORS[colorNumber];
}

function createColorPicker(containerId, inputId, initialValue = 15) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Create color picker HTML
    const pickerHTML = `
        <div class="color-picker-container">
            <div class="color-picker-header">
                <span class="color-preview" id="${inputId}-preview" style="background-color: ${getColorHex(initialValue)}"></span>
                <span class="color-number" id="${inputId}-number">Color ${initialValue}</span>
                <button type="button" class="color-picker-toggle" id="${inputId}-toggle">Choose Color</button>
            </div>
            <div class="color-picker-grid" id="${inputId}-grid" style="display: none;">
                ${generateColorGrid(inputId)}
            </div>
        </div>
    `;
    
    container.innerHTML = pickerHTML;
    
    // Add event listeners
    setupColorPickerEvents(inputId, initialValue);
}

function generateColorGrid(inputId) {
    let gridHTML = '<div class="color-grid">';
    
    // Standard colors (0-15)
    gridHTML += '<div class="color-section"><div class="color-section-title">Standard Colors (0-15)</div><div class="color-row">';
    for (let i = 0; i <= 15; i++) {
        gridHTML += `<div class="color-cell" data-color="${i}" data-input="${inputId}" style="background-color: ${getColorHex(i)}" title="Color ${i}"></div>`;
    }
    gridHTML += '</div></div>';
    
    // 216 colors (16-231) - 6x6x6 cube
    gridHTML += '<div class="color-section"><div class="color-section-title">216 Colors (16-231)</div>';
    for (let r = 0; r < 6; r++) {
        for (let g = 0; g < 6; g++) {
            gridHTML += '<div class="color-row">';
            for (let b = 0; b < 6; b++) {
                const colorNum = 16 + (r * 36) + (g * 6) + b;
                gridHTML += `<div class="color-cell" data-color="${colorNum}" data-input="${inputId}" style="background-color: ${getColorHex(colorNum)}" title="Color ${colorNum}"></div>`;
            }
            gridHTML += '</div>';
        }
    }
    gridHTML += '</div>';
    
    // Grayscale (232-255)
    gridHTML += '<div class="color-section"><div class="color-section-title">Grayscale (232-255)</div><div class="color-row">';
    for (let i = 232; i <= 255; i++) {
        gridHTML += `<div class="color-cell" data-color="${i}" data-input="${inputId}" style="background-color: ${getColorHex(i)}" title="Color ${i}"></div>`;
    }
    gridHTML += '</div></div>';
    
    gridHTML += '</div>';
    return gridHTML;
}

function setupColorPickerEvents(inputId, initialValue) {
    const toggle = document.getElementById(`${inputId}-toggle`);
    const grid = document.getElementById(`${inputId}-grid`);
    const preview = document.getElementById(`${inputId}-preview`);
    const numberSpan = document.getElementById(`${inputId}-number`);
    const originalInput = document.getElementById(inputId);
    
    let currentValue = initialValue;
    
    // Set initial value in hidden input
    if (originalInput) {
        originalInput.value = currentValue;
    }
    
    // Toggle grid visibility
    toggle.addEventListener('click', (e) => {
        e.preventDefault();
        grid.style.display = grid.style.display === 'none' ? 'block' : 'none';
    });
    
    // Handle color selection
    grid.addEventListener('click', (e) => {
        if (e.target.classList.contains('color-cell')) {
            const colorNum = parseInt(e.target.dataset.color);
            selectColor(colorNum);
        }
    });
    
    function selectColor(colorNum) {
        currentValue = colorNum;
        const color = getColorHex(colorNum);
        
        preview.style.backgroundColor = color;
        numberSpan.textContent = `Color ${colorNum}`;
        
        if (originalInput) {
            originalInput.value = colorNum;
            // Trigger change event for any listeners
            originalInput.dispatchEvent(new Event('change'));
        }
        
        // Hide grid after selection
        grid.style.display = 'none';
    }
    
    // Close grid when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.color-picker-container')) {
            grid.style.display = 'none';
        }
    });
}

// CSS styles for color picker
const colorPickerStyles = `
<style>
.color-picker-container {
    margin-bottom: 10px;
}

.color-picker-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 5px;
    max-width: 300px;
    flex-wrap: wrap;
}

.color-preview {
    width: 40px;
    height: 30px;
    border: 1px solid #ccc;
    border-radius: 3px;
    display: inline-block;
    min-width: 40px;
    min-height: 30px;
}

.color-number {
    font-weight: bold;
    min-width: 80px;
}

.color-picker-toggle {
    padding: 4px 8px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 3px;
    cursor: pointer;
    font-size: 10px;
}

.color-picker-toggle:hover {
    background-color: #0056b3;
}

.color-picker-grid {
    border: 1px solid #ccc;
    background-color: white;
    padding: 10px;
    border-radius: 3px;
    box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    max-height: 300px;
    overflow-y: auto;
    z-index: 1000;
    position: relative;
}

.color-section {
    margin-bottom: 15px;
}

.color-section-title {
    font-weight: bold;
    margin-bottom: 5px;
    font-size: 11px;
    color: #333;
}

.color-row {
    display: flex;
    gap: 2px;
    margin-bottom: 2px;
}

.color-cell {
    width: 20px;
    height: 15px;
    border: 1px solid #999;
    cursor: pointer;
    position: relative;
}

.color-cell:hover {
    border: 2px solid #000;
    transform: scale(1.1);
    z-index: 10;
}

.color-grid {
    max-width: 500px;
}
</style>
`;

// Add styles to document head
if (typeof document !== 'undefined') {
    document.head.insertAdjacentHTML('beforeend', colorPickerStyles);
}
