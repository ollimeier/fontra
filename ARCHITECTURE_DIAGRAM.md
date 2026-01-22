# Fontra Architecture with Rust Backend

## Current Hybrid Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                        Browser Client                                 │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │           JavaScript Frontend (src-js/)                      │   │
│  │                                                               │   │
│  │  • fontra-core          - Core client logic                  │   │
│  │  • fontra-webcomponents - UI components                      │   │
│  │  • views-editor         - Glyph editor                       │   │
│  │  • views-fontinfo       - Font info editor                   │   │
│  │  • views-fontoverview   - Font overview                      │   │
│  │                                                               │   │
│  │  RemoteObject Protocol (WebSocket RPC)                       │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │                                        │
└─────────────────────────────┼────────────────────────────────────────┘
                              │
                    WebSocket │ HTTP
                              │
┌─────────────────────────────▼────────────────────────────────────────┐
│                    Python Server (aiohttp)                            │
│                                                                       │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  src/fontra/core/server.py                                     │  │
│  │  • WebSocket handler                                           │  │
│  │  • HTTP routes                                                 │  │
│  │  • Project manager coordination                                │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                             │                                         │
│  ┌──────────────────────────▼──────────────────────────────────┐    │
│  │  src/fontra/core/fonthandler.py                              │    │
│  │  • Manages font instances                                    │    │
│  │  • Coordinates backend operations                            │    │
│  │  • Handles client connections                                │    │
│  └──────────────────────────┬──────────────────────────────────┘    │
│                             │                                         │
└─────────────────────────────┼─────────────────────────────────────────┘
                              │
           ┌──────────────────┼──────────────────┐
           │                  │                  │
           │ Python           │                  │ Python
           │ (original)       │                  │ (original)
           │                  │                  │
┌──────────▼────────┐  ┌──────▼──────┐  ┌───────▼─────────┐
│  Project Manager   │  │   Backends   │  │  Other Backends │
│                    │  │              │  │                 │
│  Python:           │  │  Python:     │  │  • designspace  │
│  projectmanager.py │  │  fontra.py   │  │  • opentype     │
│                    │  │              │  │  • ufo          │
│  ✅ Rust:          │  │  ✅ Rust:    │  │  • workflow     │
│  project_manager.rs│  │  fontra_     │  │                 │
│                    │  │  backend.rs  │  │                 │
│                    │  │              │  │                 │
│  Features:         │  │  Features:   │  │                 │
│  • File scanning   │  │  • CSV/JSON  │  │                 │
│  • Authorization   │  │  • Glyphs    │  │                 │
│  • Project list    │  │  • Kerning   │  │                 │
└────────────────────┘  └──────────────┘  └─────────────────┘
           │                  │
           │ PyO3             │ PyO3
           │ Bindings         │ Bindings
           │                  │
┌──────────▼──────────────────▼─────────────────────────────┐
│              Rust Backend (rust-backend/)                  │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  lib.rs - PyO3 Module                               │  │
│  │  • Exports Rust types to Python                     │  │
│  │  • fontra_backend_rust Python module                │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌─────────────────────┐  ┌──────────────────────────┐   │
│  │ project_manager.rs  │  │  fontra_backend.rs       │   │
│  │                     │  │                          │   │
│  │ • File discovery    │  │  • .fontra format        │   │
│  │ • Path resolution   │  │  • glyph-info.csv        │   │
│  │ • Authorization     │  │  • font-data.json        │   │
│  │ • Metadata          │  │  • glyphs/*.json         │   │
│  └─────────────────────┘  └──────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐  │
│  │  error.rs - Error Handling                          │  │
│  │  • FontraError enum                                 │  │
│  │  • Python exception conversion                      │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────┬───────────────────────────────┘
                             │
                             │ Uses
                             │
┌────────────────────────────▼───────────────────────────────┐
│         External Rust Crates                               │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  fontations ecosystem (read-fonts, skrifa, write-    │ │
│  │  fonts)                                              │ │
│  │  • Font file parsing                                 │ │
│  │  • Glyph shaping                                     │ │
│  │  • Font generation                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │  Core dependencies                                   │ │
│  │  • serde/serde_json - Serialization                 │ │
│  │  • csv - CSV parsing                                │ │
│  │  • tokio - Async runtime                            │ │
│  │  • notify - File watching                           │ │
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘


## Data Flow Example: Loading a Glyph

1. User clicks on glyph "A" in browser
2. JavaScript sends WebSocket message:
   {method: "getGlyph", args: ["A"]}
3. Python server.py receives message
4. Calls FontHandler.getGlyph("A")
5. FontHandler delegates to backend:
   
   OPTION A (Python):
   → Python fontra.py backend
   → Reads glyphs/A.json
   → Returns glyph data
   
   OPTION B (Rust - Future):
   → Python wrapper
   → PyO3 call to Rust
   → Rust fontra_backend.rs
   → Fast file read
   → Returns glyph data
   
6. Response sent back via WebSocket
7. Browser updates editor view


## Integration Points

### 1. Entry Points (pyproject.toml)

```toml
[project.entry-points."fontra.projectmanagers"]
filesystem = "fontra.filesystem.projectmanager:FileSystemProjectManagerFactory"
filesystem-rust = "fontra.rust_backend:FileSystemProjectManagerFactory"  # Future

[project.entry-points."fontra.filesystem.backends"]
fontra = "fontra.backends.fontra:FontraBackend"
fontra-rust = "fontra.rust_backend:FontraBackend"  # Future
```

### 2. Python Wrapper Layer (Future)

```python
# src/fontra/rust_backend/wrapper.py
import asyncio
from fontra_backend_rust import FileSystemProjectManager as RustPM

class FileSystemProjectManager:
    def __init__(self, *args, **kwargs):
        self._rust = RustPM(*args, **kwargs)
    
    async def authorize(self, request):
        # Bridge sync Rust -> async Python
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None, 
            self._rust.authorize, 
            request
        )
```

### 3. Build System (Future)

```toml
# pyproject.toml
[build-system]
requires = ["maturin>=1.0,<2.0"]
build-backend = "maturin"

[tool.maturin]
python-source = "src"
module-name = "fontra_backend_rust"
```


## Migration Strategy

### Phase 1: Foundation (✅ COMPLETE)
- Rust project structure
- Core implementations
- Documentation

### Phase 2: Integration (NEXT)
- Maturin setup
- Python wrappers
- Entry point registration
- Basic testing

### Phase 3: Feature Parity
- Kerning support
- Features support
- Background images
- File watching

### Phase 4: Performance
- Benchmarking
- Optimization
- Full fontations integration

### Phase 5: Expansion
- Replace other backends
- Consider full Rust server
- Advanced features


## Performance Characteristics

### Python Backend (Current)
- Interpreted language
- GIL limits parallelism
- Dynamic typing
- Slower I/O

### Rust Backend (New)
- Compiled to native code
- True parallelism
- Static typing
- Fast I/O
- Zero-cost abstractions

Expected speedup: 5-20x for typical operations


## File Organization

```
fontra/
├── src/fontra/
│   ├── core/              # Python server & coordination
│   ├── backends/          # Python backends (original)
│   ├── filesystem/        # Python project manager (original)
│   └── rust_backend/      # Python wrappers for Rust (new)
│
├── rust-backend/          # Rust implementation (new)
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs
│   │   ├── error.rs
│   │   ├── project_manager.rs
│   │   └── fontra_backend.rs
│   ├── README.md
│   └── ARCHITECTURE.md
│
├── src-js/                # JavaScript frontend
└── test-py/               # Python tests
```
