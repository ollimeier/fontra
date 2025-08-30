# Fontra Web App

A standalone, browser-based version of Fontra that runs entirely offline using IndexedDB for persistent storage.

## Features

- ✅ **Offline Font Editing**: Create and manage font projects without a server
- ✅ **Persistent Storage**: Projects saved in browser's IndexedDB
- ✅ **Project Management**: Create, delete, and organize font projects
- ✅ **Cross-Platform**: Works in any modern browser
- ⚠️ **Font Processing**: WebAssembly integration coming soon

## Quick Start

### 1. Build the Web App
```bash
npm install
npm run bundle
```

### 2. Serve the Files
```bash
cd src/fontra/client
python -m http.server 8080
```

### 3. Open in Browser
Navigate to: `http://localhost:8080/webapp.html`

## Browser Compatibility

- ✅ Chrome 58+
- ✅ Firefox 55+
- ✅ Safari 10+
- ✅ Edge 79+

Requires IndexedDB support for persistent storage.

## Architecture

### Storage Schema
- **Projects Store**: Metadata for each font project
- **Font Data Store**: Font info, axes, sources, and settings
- **Glyphs Store**: Individual glyph data and components

### Backend Switching
The app automatically detects the environment:
- **Server Mode**: Uses existing Python backend via HTTP/WebSocket
- **Standalone Mode**: Uses IndexedDB backend for offline operation

### File Structure
```
src-js/webapp/
├── webapp.html          # Main web app interface
├── webapp-full.js       # Complete IndexedDB implementation
├── webapp-simple.js     # Basic demo version
└── package.json         # Workspace configuration
```

## Usage

### Creating Projects
1. Enter a project name in the input field
2. Click "Create Project" 
3. Project appears in the list below

### Managing Projects
- **Open**: Navigate to editor (integration coming soon)
- **Delete**: Remove project and all associated data
- **Import**: Upload font files (parsing coming soon)

### Data Persistence
- All projects are stored locally in your browser
- Data persists across browser sessions
- No data leaves your device

## Development

### Adding WebAssembly Features
The `WebAssemblyFontProcessor` class provides placeholders for:
- Path operations (union, subtract, intersect, exclude)
- Clipboard parsing
- Font file processing

Replace placeholder implementations with actual WASM bindings.

### Extending the Backend
The `IndexedDBBackend` implements the same interface as `PythonBackend`:
- Font data management
- Glyph operations  
- Project lifecycle

## Deployment

### Static Hosting
The web app can be deployed to any static hosting service:
1. Build with `npm run bundle`
2. Upload `src/fontra/client/` directory
3. Serve `webapp.html` as entry point

### Service Worker (Optional)
Add a service worker for full offline capability and app-like experience.

## Limitations

- Font file parsing not yet implemented
- Path operations require WebAssembly bindings
- Editor integration pending
- No font export functionality yet

## Future Enhancements

- [ ] Complete WebAssembly font processing
- [ ] Font file import/export
- [ ] Integration with existing editor views
- [ ] OPFS support for file system access
- [ ] Progressive Web App features
- [ ] Font validation and optimization tools