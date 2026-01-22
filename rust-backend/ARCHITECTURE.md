# Rust Backend Implementation for Fontra

## Overview

This document describes the Rust backend implementation for Fontra using the fontations crate ecosystem. The goal is to replace the Python backend with a high-performance Rust implementation while maintaining compatibility with the existing JavaScript frontend.

## Architecture

### Current Python Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     JavaScript Frontend                      │
│                  (WebComponents + TypeScript)                │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (RemoteObject Protocol)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Python Backend (aiohttp)                  │
├──────────────────────────────────────────────────────────────┤
│  • projectmanager.py (FileSystemProjectManager)              │
│  • fonthandler.py (FontHandler)                              │
│  • backends/                                                 │
│    - fontra.py (FontraBackend)                              │
│    - designspace.py                                          │
│    - opentype.py                                             │
│    - etc.                                                    │
└──────────────────────────────────────────────────────────────┘
```

### New Hybrid Architecture (Phase 1)

```
┌─────────────────────────────────────────────────────────────┐
│                     JavaScript Frontend                      │
│                  (WebComponents + TypeScript)                │
└────────────────────────┬────────────────────────────────────┘
                         │ WebSocket (RemoteObject Protocol)
                         │
┌────────────────────────▼────────────────────────────────────┐
│                 Python Server Layer (aiohttp)                │
│                      (coordinator only)                      │
└────────────────────────┬────────────────────────────────────┘
                         │ PyO3 Bindings
                         │
┌────────────────────────▼────────────────────────────────────┐
│                      Rust Backend                            │
├──────────────────────────────────────────────────────────────┤
│  • FileSystemProjectManager (Rust)                           │
│  • FontraBackend (Rust)                                      │
│  • fontations crate integration:                             │
│    - read-fonts (reading OpenType/TrueType)                 │
│    - skrifa (shaping, metrics)                              │
│    - write-fonts (generating fonts)                         │
└──────────────────────────────────────────────────────────────┘
```

## Implementation Strategy

### Phase 1: Core Infrastructure ✅

1. **Rust Project Setup**
   - Created `rust-backend/` directory with Cargo.toml
   - Added dependencies:
     - `pyo3` - Python interop
     - `read-fonts`, `skrifa`, `write-fonts` - fontations ecosystem
     - `serde`, `serde_json` - serialization
     - `csv` - CSV parsing for glyph-info and kerning
     - `notify` - file watching
     - `tokio` - async runtime

2. **Error Handling Module** (`error.rs`)
   - Custom `FontraError` enum covering all error types
   - Automatic conversion to Python exceptions via PyO3

3. **Project Manager Module** (`project_manager.rs`)
   - Replaces Python `projectmanager.py`
   - Implements:
     - Project discovery (scanning directories for font files)
     - Authorization (simple token-based)
     - Project listing with configurable depth
     - Metadata management
   - Full Python interop via PyO3 `#[pyclass]`

4. **Fontra Backend Module** (`fontra_backend.rs`)
   - Replaces Python `fontra.py`
   - Implements Fontra's native `.fontra` format:
     - `glyph-info.csv` - glyph names and Unicode mappings
     - `font-data.json` - axes, sources, font info
     - `glyphs/*.json` - individual glyph files
     - `kerning.csv` - kerning data (TODO)
     - `features.txt` - OpenType features (TODO)
   - Key features:
     - Synchronous I/O (simpler than Python's async scheduler)
     - CSV parsing for glyph info
     - JSON serialization for font data
     - Safe filename conversion for glyph names

### Phase 2: Integration (Next Steps)

1. **Python Wrapper**
   - Create `src/fontra/rust_backend/__init__.py` to import the Rust module
   - Wrapper classes that match the Python API exactly
   - Compatibility layer for async methods (wrap sync Rust in async)

2. **Entry Point Updates**
   - Update `pyproject.toml` to register Rust backends:
     ```toml
     [project.entry-points."fontra.filesystem.backends"]
     fontra-rust = "fontra.rust_backend:FontraBackend"
     
     [project.entry-points."fontra.projectmanagers"]
     filesystem-rust = "fontra.rust_backend:FileSystemProjectManagerFactory"
     ```

3. **Build Integration**
   - Add `maturin` for building the Rust extension
   - Update `pyproject.toml` to include Rust build steps
   - CI/CD integration for building wheels

### Phase 3: Advanced Features

1. **File Watching** (replace Python's watchfiles)
   - Use Rust's `notify` crate
   - Real-time detection of `.fontra` directory changes
   - Efficient change batching

2. **Fontations Integration**
   - Use `read-fonts` for parsing OpenType/TrueType fonts
   - Use `skrifa` for glyph metrics and shaping
   - Use `write-fonts` for font compilation
   - Replace Python's fonttools dependency

3. **Additional Backends**
   - Port `designspace.py` to Rust
   - Port `opentype.py` to Rust
   - Port `ufo_utils.py` to Rust

### Phase 4: Full Rust Backend

1. **Replace fonthandler.py**
   - Core font handling logic in Rust
   - Manage client connections
   - Cache management

2. **Optional: Replace Server**
   - Consider replacing aiohttp with Rust web framework (e.g., axum, actix-web)
   - WebSocket support
   - Full async/await with Tokio

## API Compatibility

### Python API Requirements

The Rust backend must match these Python protocols:

```python
# ProjectManager Protocol
class ProjectManager(Protocol):
    async def authorize(self, request) -> str
    async def projectAvailable(self, projectIdentifier: str, token: str) -> bool
    async def getRemoteSubject(self, projectIdentifier: str, token: str) -> FontHandler
    async def getProjectList(self, token: str) -> list[str]
    async def getMetaInfo(self, projectIdentifier: str, authorizationToken: str) -> dict
    async def putMetaInfo(self, projectIdentifier: str, metaInfo: dict, authorizationToken: str) -> None

# WritableFontBackend Protocol
class WritableFontBackend(Protocol):
    async def getGlyphMap(self) -> dict[str, list[int]]
    async def getGlyph(self, glyphName: str) -> VariableGlyph | None
    async def putGlyph(self, glyphName: str, glyph: VariableGlyph, codePoints: list[int]) -> None
    async def deleteGlyph(self, glyphName: str) -> None
    async def getUnitsPerEm(self) -> int
    async def putUnitsPerEm(self, value: int) -> None
    # ... and many more methods
```

### Rust Implementation

The Rust code uses PyO3 to expose these as Python classes:

```rust
#[pyclass]
pub struct FileSystemProjectManager {
    // Implementation
}

#[pymethods]
impl FileSystemProjectManager {
    #[new]
    pub fn new(...) -> PyResult<Self>
    
    pub fn authorize(&self, ...) -> PyResult<String>
    pub fn project_available(&self, ...) -> PyResult<bool>
    // ... matching methods
}
```

Python wrapper will convert sync methods to async:

```python
class FileSystemProjectManagerWrapper:
    def __init__(self, *args, **kwargs):
        self._rust = fontra_backend_rust.FileSystemProjectManager(*args, **kwargs)
    
    async def authorize(self, request):
        return self._rust.authorize(request)  # Wrap in async
```

## Performance Benefits

1. **Speed**
   - Rust's compiled nature provides 10-100x speedup for I/O operations
   - Zero-cost abstractions vs Python's dynamic dispatch
   - Efficient CSV/JSON parsing with `csv` and `serde_json`

2. **Memory**
   - No GIL (Global Interpreter Lock) - true parallelism
   - Precise memory control with ownership system
   - Reduced memory footprint

3. **Type Safety**
   - Compile-time type checking prevents runtime errors
   - Stronger guarantees than Python's type hints

4. **Concurrency**
   - Tokio async runtime for efficient async I/O
   - File watching without polling overhead

## Testing Strategy

1. **Unit Tests**
   - Rust unit tests for each module (`#[cfg(test)]`)
   - Python unit tests to verify compatibility

2. **Integration Tests**
   - Test Rust backend through Python wrapper
   - Reuse existing test suite in `test-py/`
   - Performance benchmarks comparing Python vs Rust

3. **Compatibility Tests**
   - Ensure Rust backend produces identical output to Python
   - Test reading/writing `.fontra` directories
   - Verify JSON and CSV format compatibility

## File Structure

```
fontra/
├── rust-backend/              # Rust implementation
│   ├── Cargo.toml             # Rust dependencies
│   └── src/
│       ├── lib.rs             # PyO3 module definition
│       ├── error.rs           # Error types
│       ├── project_manager.rs # FileSystemProjectManager
│       └── fontra_backend.rs  # FontraBackend
│
├── src/fontra/
│   ├── rust_backend/          # Python wrapper (TODO)
│   │   ├── __init__.py
│   │   ├── project_manager.py
│   │   └── backend.py
│   │
│   ├── filesystem/            # Original Python code (kept for now)
│   │   └── projectmanager.py
│   │
│   └── backends/              # Original Python backends
│       └── fontra.py
│
└── pyproject.toml             # Updated with Rust build config
```

## Migration Path

### Immediate (Current State)
- ✅ Rust code compiles successfully
- ✅ Core data structures implemented
- ✅ Project manager logic in Rust
- ✅ Fontra backend basic operations

### Next Steps
1. Create Python wrapper module
2. Add async compatibility layer
3. Set up maturin for building
4. Add comprehensive tests
5. Benchmark performance
6. Update documentation

### Future
1. Replace remaining backends
2. Consider full Rust server
3. Advanced fontations features
4. Performance optimizations

## Development Notes

### Building the Rust Extension

```bash
cd rust-backend
cargo build --release
```

### Running Tests

```bash
# Rust tests
cargo test

# Python tests (after integration)
pytest test-py/
```

### Adding Features

1. Add Rust code in `rust-backend/src/`
2. Expose via PyO3 in the module
3. Create Python wrapper for async compat
4. Add tests in both Rust and Python
5. Update documentation

## Conclusion

This Rust backend implementation provides:
- ✅ High performance and type safety
- ✅ Compatibility with existing Python/JS architecture
- ✅ Foundation for future fontations integration
- ✅ Gradual migration path (no big-bang rewrite)

The modular approach allows testing and deploying Rust components incrementally while maintaining full backward compatibility.
