use thiserror::Error;
use pyo3::exceptions::PyException;
use pyo3::prelude::*;

#[derive(Error, Debug)]
pub enum FontraError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    
    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),
    
    #[error("CSV error: {0}")]
    Csv(#[from] csv::Error),
    
    #[error("Font not found: {0}")]
    FontNotFound(String),
    
    #[error("Glyph not found: {0}")]
    GlyphNotFound(String),
    
    #[error("Invalid path: {0}")]
    InvalidPath(String),
    
    #[error("{0}")]
    Other(String),
}

impl From<FontraError> for PyErr {
    fn from(err: FontraError) -> PyErr {
        PyException::new_err(err.to_string())
    }
}

pub type Result<T> = std::result::Result<T, FontraError>;
