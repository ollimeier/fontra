use pyo3::prelude::*;

pub mod project_manager;
pub mod fontra_backend;
pub mod error;

use project_manager::FileSystemProjectManager;
use fontra_backend::FontraBackend;

/// Python module for Fontra Rust backend
#[pymodule]
fn fontra_backend_rust(m: &Bound<'_, PyModule>) -> PyResult<()> {
    m.add_class::<FileSystemProjectManager>()?;
    m.add_class::<FontraBackend>()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_basic() {
        assert_eq!(2 + 2, 4);
    }
}
