# launcher-tab
Open source Android launcher like new tab replacement for default new tab

### Features:
- Customizable widgets and grid layout
- Minimal size and fast loading time
- API for writing widgets

![Screenshot](https://i.ibb.co/QdyPc0c/Captura-de-pantalla-2021-01-28-123803.png "Screenshot")

### Installation
#### Pre-built releases
1. Download pre-built zip from https://github.com/martin640/launcher-tab/releases/
2. Extract downloaded zip anywhere on your PC
3. Open Chrome extensions (chrome://extensions)
4. Enable "Developer mode" in top right corner
5. Click "Load Unpacked"
6. Select `launcher-tab/src/` folder from extracted zip

#### Build minified version from source
1. Clone repository with `git clone https://github.com/martin640/launcher-tab.git`
2. cd to repository with `cd project-compile/`
3. Run `npm run build`
4. Check folder `build/` for generated resources and follow steps in [Installation](#installation) to load extension

Note: **launcher-tab.min.crx** gets generated as well if valid `key.pem` file is found in `project-compile/`

#### Load source code directly
1. While selecting unpacked extension, select `src/` folder from cloned repository

Feel free to contribute
