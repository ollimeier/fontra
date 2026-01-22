# Fontra Rust Backend

This directory contains the Rust implementation of Fontra's backend, designed to replace the Python backend with improved performance and type safety.

## Overview

The Rust backend uses the [fontations](https://github.com/googlefonts/fontations) crate ecosystem for font operations and PyO3 for Python interoperability.

## Components

### 1. Project Manager (`project_manager.rs`)
Replaces `src/fontra/filesystem/projectmanager.py`:
- Discovers font files in the file system
- Manages project access and authorization
- Provides project metadata

### 2. Fontra Backend (`fontra_backend.rs`)
Replaces `src/fontra/backends/fontra.py`:
- Reads/writes `.fontra` directory format
- Manages glyphs, kerning, features, and font data
- Handles CSV and JSON serialization

### 3. Error Handling (`error.rs`)
Centralized error types with automatic Python exception conversion.

## Building

### Prerequisites
- Rust toolchain (1.70+)
- Python 3.10+
- maturin (for building Python extensions)

### Development Build

```bash
# Build the Rust library
cargo build

# Run Rust tests
cargo test

# Build as Python extension (requires maturin)
maturin develop
```

### Release Build

```bash
cargo build --release
```

## Testing

```bash
# Run Rust unit tests
cargo test

# Run with verbose output
cargo test -- --nocapture

# Test specific module
cargo test project_manager
```

## Dependencies

Key dependencies (see `Cargo.toml` for full list):

- **pyo3** (0.22): Python interoperability
- **read-fonts** (0.22): Reading OpenType/TrueType fonts (fontations)
- **skrifa** (0.22): Font shaping and metrics (fontations)
- **write-fonts** (0.22): Font generation (fontations)
- **serde** + **serde_json**: JSON serialization
- **csv**: CSV parsing for glyph-info and kerning
- **notify**: File system watching
- **tokio**: Async runtime

## Architecture

```
┌─────────────────────────────────────┐
│  Python Layer (compatibility)       │
│  src/fontra/rust_backend/           │
└───────────────┬─────────────────────┘
                │ PyO3 FFI
┌───────────────▼─────────────────────┐
│  Rust Backend                       │
│  rust-backend/src/                  │
│                                     │
│  ├── lib.rs (module entry)         │
│  ├── error.rs                       │
│  ├── project_manager.rs            │
│  └── fontra_backend.rs              │
└───────────────┬─────────────────────┘
                │
┌───────────────▼─────────────────────┐
│  fontations crates                  │
│  (read-fonts, skrifa, write-fonts)  │
└─────────────────────────────────────┘
```

## Integration Status

### ✅ Completed
- [x] Rust project structure
- [x] Error handling module
- [x] Project manager implementation
- [x] Basic Fontra backend
- [x] CSV parsing (glyph-info)
- [x] JSON serialization (font-data)
- [x] Glyph operations (get, put, delete)
- [x] Compiles successfully

### 🚧 In Progress
- [ ] Python wrapper with async compatibility
- [ ] Maturin build configuration
- [ ] Integration tests

### 📋 TODO
- [ ] Kerning CSV support
- [ ] OpenType features support
- [ ] Background image handling
- [ ] File watching implementation
- [ ] FontHandler integration
- [ ] Additional backends (DesignSpace, OpenType)
- [ ] Performance benchmarks
- [ ] Full fontations integration

## Performance Goals

Expected improvements over Python:
- **I/O operations**: 10-50x faster
- **Parsing**: 5-20x faster
- **Memory usage**: 30-50% reduction
- **Startup time**: 2-5x faster

## API Compatibility

The Rust backend maintains compatibility with the Python API:

```python
# Python usage (unchanged)
from fontra.rust_backend import FontraBackend

backend = FontraBackend.fromPath("/path/to/font.fontra")
glyph_map = await backend.getGlyphMap()
glyph = await backend.getGlyph("A")
```

The Rust methods are synchronous but wrapped with async compatibility in the Python layer.

## Development Workflow

1. **Write Rust code** in `src/`
2. **Add tests** in the module's `#[cfg(test)]` section
3. **Build**: `cargo build`
4. **Test**: `cargo test`
5. **Format**: `cargo fmt`
6. **Lint**: `cargo clippy`
7. **Document**: Update this README and `ARCHITECTURE.md`

## Contributing

When adding new features:

1. Implement in Rust with proper error handling
2. Add unit tests
3. Expose via PyO3 if needed by Python
4. Update Python wrapper for async compatibility
5. Add integration tests in `test-py/`
6. Document in ARCHITECTURE.md

## Resources

- [PyO3 Documentation](https://pyo3.rs/)
- [fontations Repository](https://github.com/googlefonts/fontations)
- [Rust Book](https://doc.rust-lang.org/book/)
- [Fontra Documentation](https://github.com/fontra/fontra)
