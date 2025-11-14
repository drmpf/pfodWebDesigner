# pfodWebDesigner
This is a web base design tool to create interactive and responsive GUIs that can be served from your micro to either pfodApp and pfodWeb.<br>
_**Using Serial any Arduino board can have an interactive GUI.**_<br>
It generates complete Arduino sketches that can connect to pfodWeb.html via **Serial, BLE or HTTP**.  
  

pfodWeb.html is included in the Arduino pfodParser library (V3.66+)

This code package includes all the necessary npm modules. Just install nodejs and then run one of the pfodWebDesigner batch files.  

**Do Not Use the pfodWebDesigner_install... batch files** unless you want to do a clean install of the latest, possibly comprimised modules.   

<img src="./gif/Slider.gif"/>  
<img src="./gif/LedNoOffGUI.gif"/>

This animated gif shows a button controlling the Arduino board led from a web page. 
When the button is pressed, it immediately changes color to indicate it has been triggered.
It also sends a command to the board to switch the LED. When the board responds, the message to pfodWeb updates the button's color and text.  

The entire code that defines this GUI is contained in the Arduino sketch.

# How-To
See [pfodWeb Installation and Tutorials](https://www.forward.com.au/pfod/pfodWeb/index.html)  

# Security and Privacy
pfodWebDesigner requires nodejs and other npm packages to be installed. The zip file of this release contains all the additional package so no additional downloads are required.  

Of the compromised npm packages, only the debug package is used here and the version supplied here is V4.4.1 which is prior to the version compromised.  
See [How Safe is pfodWeb, pfodWebServer and pfodWebDesigner](https://www.forward.com.au/pfod/pfodWeb/index.html#safe)  

If you want to do a clean download of the npm packages, **not recommended**, then delete the package-lock.json file and the node_modules sub-directory and run one of the pfodWebServer_install... batch files.  

# Software License
(c)2014-2025 Forward Computing and Control Pty. Ltd.  
NSW Australia, www.forward.com.au  
This code is not warranted to be fit for any purpose. You may only use it at your own risk.  
This code may be freely used for both private and commercial use  
Provide this copyright is maintained.  

# Revisions
Version 3.0.2 disable refresh in chart mode fixed value scaling  
Version 3.0.1 auto chart option on startup  
Version 3.0.0 added initial charting support  
Version 2.0.4 fixed scaling for nested dwgs   
Version 2.0.3 fixed transform for nested dwgs   
Version 2.0.2 fixed transform pushZero for nested dwgs   
Version 2.0.1 edit to .ino files   
Version 2.0.0 added support for Serial, BLE and HTTP code generation
Version 1.1.5 added init() of drawings  
Version 1.1.4 added pfodMainDrawing.h to generated output files  
Version 1.1.3 drawing updates as response received and included dependent node packages and removed package install script from batch files  
Version 1.1.2 fixed hiding of touchActionInput labels  
Version 1.1.1 fixed loss of idx on edit  
Version 1.1.0 fix hide/unhide and other general improvements  
Version 1.0.2 fix for drag touchActions  
Version 1.0.1 fix for debug display and mainmenu updates  
Version 1.0.0 initial release  

