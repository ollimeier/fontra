pub mod project_manager;
pub mod fontra_backend;
pub mod error;

#[cfg(feature = "python-bindings")]
use pyo3::prelude::*;

#[cfg(feature = "python-bindings")]
use project_manager::FileSystemProjectManager;

#[cfg(feature = "python-bindings")]
use fontra_backend::FontraBackend;

/// Python module for Fontra Rust backend (optional, with python-bindings feature)
#[cfg(feature = "python-bindings")]
#[pymodule]
fn fontra_backend_rust(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<FileSystemProjectManager>()?;
    m.add_class::<FontraBackend>()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_basic() {
        assert_eq!(2 + 2, 4);
    }
}
