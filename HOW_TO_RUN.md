# How to Run Fontra and Open Font Files

This guide explains how to run the Fontra application and open various font files.

## Prerequisites

Before running Fontra, make sure you have:

1. **Python >= 3.10** installed (from [python.org](https://www.python.org/downloads/))
2. **Node.js >= 20** installed (from [nodejs.org](https://nodejs.org/en/download/))

## Setup (First Time Only)

1. **Create a Python virtual environment:**
   ```bash
   python3.10 -m venv venv --prompt=fontra
   ```

2. **Activate the virtual environment:**
   ```bash
   source venv/bin/activate  # On macOS/Linux
   # or
   venv\Scripts\activate     # On Windows
   ```

3. **Install dependencies:**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   pip install -e .
   ```

4. **Build JavaScript assets (if not already built):**
   ```bash
   npm install
   npm run bundle
   ```

## Running Fontra

### Basic Usage

To start Fontra with a folder containing fonts:

```bash
fontra --launch filesystem /path/to/your/fonts
```

This will:
- Start the Fontra server on port 8000
- Automatically open your default browser to `http://localhost:8000/`
- Display a landing page listing all available font files in the folder

### Opening Specific File Types

Fontra supports multiple font file formats:

- **`.fontra`** directories (Fontra's native format)
- **`.designspace`** files (DesignSpace format)
- **`.ufo`** directories (Unified Font Object format)
- **`.ttf`** files (TrueType fonts)
- **`.otf`** files (OpenType fonts)

You can point Fontra to:
- A **folder** containing multiple font files
- A **single font file** directly

**Examples:**

```bash
# Open a folder with multiple fonts
fontra --launch filesystem ~/Documents/MyFonts

# Open a specific .fontra directory
fontra --launch filesystem ~/Documents/MyFont.fontra

# Open a specific .designspace file
fontra --launch filesystem ~/Documents/MyFont.designspace

# Open a specific .ttf file
fontra --launch filesystem ~/Documents/MyFont.ttf
```

### Testing with Sample Files

The repository includes test font files you can use:

```bash
# Open a test .fontra directory
fontra --launch filesystem test-py/data/workflow/output-adjust-axes-set-axis-values.fontra

# Open a test .designspace file
fontra --launch filesystem test-py/data/avar2/DemoAvar2.designspace

# Open a folder with multiple test files
fontra --launch filesystem test-py/data/avar2
```

## Development Mode

For development with auto-reloading of JavaScript changes:

```bash
fontra --dev --launch filesystem /path/to/your/fonts
```

This spawns a separate process that watches JavaScript files and automatically rebuilds them on save.

## Using the Fontra Interface

Once Fontra opens in your browser:

1. **Landing Page**: You'll see a list of available font files
2. **Select a Font**: Click on a font file to open it
3. **Editor Views**:
   - **Editor View** - Edit individual glyphs
   - **Font Overview** - See all glyphs in a grid
   - **Font Info** - Edit font metadata, axes, sources
   - **Settings** - Configure application settings

## Keyboard Shortcuts

- **Double-click** a glyph in text view to enter edit mode
- **Hand tool** for scrolling
- **Zoom** with gestures or shortcuts
- See the UI for more shortcuts and tools

## Troubleshooting

### "Command not found: fontra"

Make sure you:
1. Activated the virtual environment: `source venv/bin/activate`
2. Installed Fontra: `pip install -e .`

### Port Already in Use

If port 8000 is already in use, specify a different port:

```bash
fontra --http-port 8001 --launch filesystem /path/to/fonts
```

### Browser Doesn't Open Automatically

Manually navigate to: `http://localhost:8000/`

### JavaScript Bundle Not Found

Build the JavaScript assets:

```bash
npm install
npm run bundle
```

## Advanced Options

### Custom Port

```bash
fontra --http-port 9000 --launch filesystem /path/to/fonts
```

### Read-Only Mode

```bash
fontra --launch filesystem --read-only /path/to/fonts
```

### Maximum Folder Depth

Control how deep Fontra searches for fonts in subfolders:

```bash
fontra --launch filesystem --max-folder-depth 5 /path/to/fonts
```

### Bypass Landing Page

Use `-` as the path to bypass the landing page and provide the full path in the URL:

```bash
fontra --launch filesystem -
```

Then navigate to: `http://localhost:8000/editor/path/to/your/font.fontra`

## Using with RCJK Data

For .rcjk data or remote rcjk servers:

1. Install the plugin:
   ```bash
   pip install fontra-rcjk
   ```

2. Run with rcjk backend:
   ```bash
   fontra --launch rcjk some-robocjk-server.some-domain.com
   ```

## Next Steps

- Explore the comprehensive documentation in the repository
- Check out the [Roadmap](README.md#roadmap) for supported features
- Try editing glyphs, adjusting variation axes, and managing kerning
- For questions, see the main [README.md](README.md)

## Quick Reference

| Command | Description |
|---------|-------------|
| `fontra --launch filesystem <path>` | Open Fontra with a folder or file |
| `fontra --dev --launch filesystem <path>` | Run in development mode |
| `fontra --http-port <port> --launch filesystem <path>` | Use custom port |
| `fontra --launch filesystem --read-only <path>` | Open in read-only mode |

---

**Ready to start?** Run this command with a test file:

```bash
source venv/bin/activate
fontra --launch filesystem test-py/data/avar2/DemoAvar2.designspace
```

Your browser should open automatically to `http://localhost:8000/` where you can start editing!
