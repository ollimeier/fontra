use pyo3::prelude::*;
use pyo3::types::PyDict;
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::RwLock;

use crate::error::{FontraError, Result};

/// File extensions supported by Fontra backends
const SUPPORTED_EXTENSIONS: &[&str] = &[
    ".designspace",
    ".ufo",
    ".ttf",
    ".otf",
    ".fontra",
    ".yaml",
    ".ttx",
    ".woff",
    ".woff2",
];

/// Rust implementation of FileSystemProjectManager
/// This replaces the Python projectmanager.py
#[pyclass]
pub struct FileSystemProjectManager {
    root_path: Option<PathBuf>,
    single_file_path: Option<PathBuf>,
    max_folder_depth: usize,
    read_only: bool,
    font_handlers: Arc<RwLock<HashMap<String, PyObject>>>,
}

#[pymethods]
impl FileSystemProjectManager {
    #[new]
    #[pyo3(signature = (root_path=None, max_folder_depth=3, read_only=false))]
    pub fn new(
        root_path: Option<String>,
        max_folder_depth: usize,
        read_only: bool,
    ) -> PyResult<Self> {
        let (root_path, single_file_path) = if let Some(path_str) = root_path {
            let path = PathBuf::from(&path_str);
            let path = path.canonicalize().map_err(|e| {
                FontraError::InvalidPath(format!("Cannot resolve path {}: {}", path_str, e))
            })?;

            // Check if it's a single file
            if path.is_file() {
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| format!(".{}", e.to_lowercase()))
                    .unwrap_or_default();

                if SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
                    let parent = path.parent().map(|p| p.to_path_buf());
                    (parent, Some(path))
                } else {
                    return Err(FontraError::InvalidPath(format!(
                        "Unsupported file extension: {}",
                        ext
                    ))
                    .into());
                }
            } else {
                (Some(path), None)
            }
        } else {
            (None, None)
        };

        Ok(Self {
            root_path,
            single_file_path,
            max_folder_depth,
            read_only,
            font_handlers: Arc::new(RwLock::new(HashMap::new())),
        })
    }

    /// Authorize a request (simple implementation)
    pub fn authorize<'py>(&self, _py: Python<'py>, _request: PyObject) -> PyResult<String> {
        Ok("yes".to_string())
    }

    /// Check if a project is available
    pub fn project_available(&self, project_identifier: String, _token: String) -> PyResult<bool> {
        Ok(self.get_project_path(&project_identifier).is_some())
    }

    /// Get the list of available projects
    pub fn get_project_list(&self, _token: String) -> PyResult<Vec<String>> {
        if self.root_path.is_none() {
            return Ok(Vec::new());
        }

        let root_path = self.root_path.as_ref().unwrap();
        let mut project_paths = Vec::new();

        if let Some(single_file) = &self.single_file_path {
            // Single file mode
            if let Some(relative) = make_relative_path(root_path, single_file) {
                project_paths.push(relative);
            }
        } else {
            // Directory scanning mode
            let mut paths = Vec::new();
            iter_folder(root_path, &mut paths, self.max_folder_depth);
            paths.sort();

            for path in paths {
                if let Some(relative) = make_relative_path(root_path, &path) {
                    project_paths.push(relative);
                }
            }
        }

        Ok(project_paths)
    }

    /// Get metadata info for a project
    pub fn get_meta_info(
        &self,
        py: Python<'_>,
        project_identifier: String,
        _authorization_token: String,
    ) -> PyResult<PyObject> {
        let dict = PyDict::new_bound(py);
        
        // Extract project name from identifier (last component)
        let project_name = project_identifier
            .split('/')
            .last()
            .unwrap_or(&project_identifier);
        
        dict.set_item("projectName", project_name)?;
        dict.set_item("projectIdentifier", project_identifier)?;
        
        Ok(dict.into_any().unbind())
    }

    /// Put metadata info for a project (no-op for filesystem backend)
    pub fn put_meta_info(
        &self,
        _project_identifier: String,
        _meta_info: PyObject,
        _authorization_token: String,
    ) -> PyResult<()> {
        Ok(())
    }
}

impl FileSystemProjectManager {
    /// Get the actual file system path for a project identifier
    fn get_project_path(&self, path_str: &str) -> Option<PathBuf> {
        let project_path = if let Some(root) = &self.root_path {
            // Relative path mode
            let components: Vec<&str> = path_str.split('/').collect();
            let mut path = root.clone();
            for component in components {
                path.push(component);
            }
            path
        } else {
            // Absolute path mode
            let mut path = PathBuf::from(path_str);
            if !path.is_absolute() {
                path = PathBuf::from("/").join(path);
            }
            path
        };

        // Check if the path exists and has a supported extension
        if project_path.exists() {
            let ext = project_path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e.to_lowercase()))
                .unwrap_or_default();

            if SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
                return Some(project_path);
            }
        }

        None
    }
}

/// Recursively iterate through folders to find font files
fn iter_folder(folder_path: &Path, results: &mut Vec<PathBuf>, max_depth: usize) {
    if max_depth == 0 {
        return;
    }

    let Ok(entries) = folder_path.read_dir() else {
        return;
    };

    for entry in entries.flatten() {
        let path = entry.path();

        if path.is_file() {
            let ext = path
                .extension()
                .and_then(|e| e.to_str())
                .map(|e| format!(".{}", e.to_lowercase()))
                .unwrap_or_default();

            if SUPPORTED_EXTENSIONS.contains(&ext.as_str()) {
                results.push(path);
            }
        } else if path.is_dir() {
            iter_folder(&path, results, max_depth - 1);
        }
    }
}

/// Make a path relative to a root path, using forward slashes
fn make_relative_path(root: &Path, path: &Path) -> Option<String> {
    path.strip_prefix(root).ok().map(|p| {
        p.components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect::<Vec<_>>()
            .join("/")
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_supported_extensions() {
        assert!(SUPPORTED_EXTENSIONS.contains(&".fontra"));
        assert!(SUPPORTED_EXTENSIONS.contains(&".ttf"));
        assert!(!SUPPORTED_EXTENSIONS.contains(&".txt"));
    }

    #[test]
    fn test_make_relative_path() {
        let root = PathBuf::from("/home/user/fonts");
        let path = PathBuf::from("/home/user/fonts/test/font.ttf");
        let relative = make_relative_path(&root, &path);
        assert_eq!(relative, Some("test/font.ttf".to_string()));
    }
}
