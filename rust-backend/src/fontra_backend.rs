use pyo3::prelude::*;
use pyo3::types::PyDict;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::error::{FontraError, Result};

/// Glyph information stored in glyph-info.csv
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GlyphInfo {
    pub name: String,
    pub code_points: Vec<u32>,
}

/// Font data stored in font-data.json
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FontData {
    #[serde(rename = "unitsPerEm", default = "default_upm")]
    pub units_per_em: u32,
    
    #[serde(default)]
    pub axes: Vec<Axis>,
    
    #[serde(default)]
    pub sources: HashMap<String, FontSource>,
    
    #[serde(rename = "fontInfo", default)]
    pub font_info: FontInfo,
    
    #[serde(default)]
    pub customData: HashMap<String, serde_json::Value>,
}

fn default_upm() -> u32 {
    1000
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct Axis {
    pub name: String,
    pub tag: String,
    pub min: f32,
    pub default: f32,
    pub max: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FontSource {
    pub name: String,
    #[serde(default)]
    pub location: HashMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FontInfo {
    #[serde(rename = "familyName", default)]
    pub family_name: Option<String>,
    
    #[serde(rename = "styleName", default)]
    pub style_name: Option<String>,
    
    #[serde(default)]
    pub version: Option<String>,
}

/// Rust implementation of FontraBackend
/// This replaces the Python fontra.py backend
#[pyclass]
pub struct FontraBackend {
    path: PathBuf,
    glyph_map: HashMap<String, Vec<u32>>,
    font_data: FontData,
}

#[pymethods]
impl FontraBackend {
    /// Create a new FontraBackend from a path
    #[staticmethod]
    pub fn from_path(path: String) -> PyResult<Self> {
        let path = PathBuf::from(path);
        let backend = Self::new(path, false)?;
        Ok(backend)
    }

    /// Create a new .fontra directory and initialize it
    #[staticmethod]
    pub fn create_from_path(path: String) -> PyResult<Self> {
        let path = PathBuf::from(path);
        let backend = Self::new(path, true)?;
        Ok(backend)
    }

    /// Get units per em
    pub fn get_units_per_em(&self) -> PyResult<u32> {
        Ok(self.font_data.units_per_em)
    }

    /// Set units per em
    pub fn put_units_per_em(&mut self, units_per_em: u32) -> PyResult<()> {
        self.font_data.units_per_em = units_per_em;
        self.write_font_data()?;
        Ok(())
    }

    /// Get the glyph map (glyph name -> code points)
    pub fn get_glyph_map(&self, py: Python<'_>) -> PyResult<PyObject> {
        let dict = PyDict::new_bound(py);
        for (name, codepoints) in &self.glyph_map {
            dict.set_item(name, codepoints.clone())?;
        }
        Ok(dict.into_any().unbind())
    }

    /// Get glyph data as JSON string
    pub fn get_glyph(&self, glyph_name: String) -> PyResult<Option<String>> {
        if !self.glyph_map.contains_key(&glyph_name) {
            return Ok(None);
        }

        let glyph_path = self.get_glyph_file_path(&glyph_name);
        if !glyph_path.exists() {
            return Ok(None);
        }

        let json_data = fs::read_to_string(&glyph_path)
            .map_err(|e| FontraError::Io(e))?;

        Ok(Some(json_data))
    }

    /// Put glyph data (write to file)
    pub fn put_glyph(
        &mut self,
        glyph_name: String,
        glyph_json: String,
        code_points: Vec<u32>,
    ) -> PyResult<()> {
        let glyph_path = self.get_glyph_file_path(&glyph_name);
        fs::write(&glyph_path, glyph_json)
            .map_err(|e| FontraError::Io(e))?;

        // Update glyph map if code points changed
        if self.glyph_map.get(&glyph_name) != Some(&code_points) {
            self.glyph_map.insert(glyph_name.clone(), code_points);
            self.write_glyph_info()?;
        }

        Ok(())
    }

    /// Delete a glyph
    pub fn delete_glyph(&mut self, glyph_name: String) -> PyResult<()> {
        if !self.glyph_map.contains_key(&glyph_name) {
            return Ok(());
        }

        let glyph_path = self.get_glyph_file_path(&glyph_name);
        if glyph_path.exists() {
            fs::remove_file(&glyph_path)
                .map_err(|e| FontraError::Io(e))?;
        }

        self.glyph_map.remove(&glyph_name);
        self.write_glyph_info()?;

        Ok(())
    }

    /// Get font info as JSON
    pub fn get_font_info(&self, py: Python<'_>) -> PyResult<PyObject> {
        let json = serde_json::to_value(&self.font_data.font_info)
            .map_err(|e| FontraError::Json(e))?;
        let dict = pythonize::pythonize(py, &json)?;
        Ok(dict.into())
    }

    /// Close the backend and flush any pending writes
    pub fn aclose(&self) -> PyResult<()> {
        // In the Rust version, we don't need to do anything special
        // since writes are synchronous
        Ok(())
    }

    /// Flush any pending writes (no-op in sync version)
    pub fn flush(&self) -> PyResult<()> {
        Ok(())
    }
}

impl FontraBackend {
    /// Create a new FontraBackend instance
    fn new(path: PathBuf, create: bool) -> Result<Self> {
        if create {
            if path.exists() {
                if path.is_dir() {
                    fs::remove_dir_all(&path)?;
                } else {
                    fs::remove_file(&path)?;
                }
            }
            fs::create_dir(&path)?;
        }

        // Ensure glyphs directory exists
        let glyphs_dir = path.join("glyphs");
        fs::create_dir_all(&glyphs_dir)?;

        let mut backend = Self {
            path,
            glyph_map: HashMap::new(),
            font_data: FontData::default(),
        };

        if !create {
            backend.read_glyph_info()?;
            backend.read_font_data()?;
        } else {
            backend.write_glyph_info()?;
            backend.write_font_data()?;
        }

        Ok(backend)
    }

    /// Read glyph info from glyph-info.csv
    fn read_glyph_info(&mut self) -> Result<()> {
        let glyph_info_path = self.path.join("glyph-info.csv");
        if !glyph_info_path.exists() {
            return Ok(());
        }

        let mut reader = csv::ReaderBuilder::new()
            .delimiter(b';')
            .from_path(&glyph_info_path)?;

        self.glyph_map.clear();

        for result in reader.records() {
            let record = result?;
            if record.len() < 1 {
                continue;
            }

            let glyph_name = record.get(0).unwrap_or("").to_string();
            let code_points = if let Some(cp_str) = record.get(1) {
                parse_code_points(cp_str)
            } else {
                Vec::new()
            };

            self.glyph_map.insert(glyph_name, code_points);
        }

        Ok(())
    }

    /// Write glyph info to glyph-info.csv
    fn write_glyph_info(&self) -> Result<()> {
        let glyph_info_path = self.path.join("glyph-info.csv");
        let mut writer = csv::WriterBuilder::new()
            .delimiter(b';')
            .from_path(&glyph_info_path)?;

        writer.write_record(&["glyph name", "code points"])?;

        let mut entries: Vec<_> = self.glyph_map.iter().collect();
        entries.sort_by_key(|(name, _)| *name);

        for (glyph_name, code_points) in entries {
            let cp_string = code_points
                .iter()
                .map(|cp| format!("U+{:04X}", cp))
                .collect::<Vec<_>>()
                .join(",");

            writer.write_record(&[glyph_name, &cp_string])?;
        }

        writer.flush()?;
        Ok(())
    }

    /// Read font data from font-data.json
    fn read_font_data(&mut self) -> Result<()> {
        let font_data_path = self.path.join("font-data.json");
        if !font_data_path.exists() {
            return Ok(());
        }

        let json_str = fs::read_to_string(&font_data_path)?;
        self.font_data = serde_json::from_str(&json_str)?;

        Ok(())
    }

    /// Write font data to font-data.json
    fn write_font_data(&self) -> Result<()> {
        let font_data_path = self.path.join("font-data.json");
        let json_str = serde_json::to_string_pretty(&self.font_data)?;
        fs::write(&font_data_path, json_str + "\n")?;

        Ok(())
    }

    /// Get the file path for a glyph
    fn get_glyph_file_path(&self, glyph_name: &str) -> PathBuf {
        let safe_name = string_to_filename(glyph_name);
        self.path.join("glyphs").join(format!("{}.json", safe_name))
    }
}

/// Parse code points from a CSV cell (e.g., "U+0041,U+0042")
fn parse_code_points(cell: &str) -> Vec<u32> {
    let mut code_points = Vec::new();
    let cell = cell.trim();
    
    if cell.is_empty() {
        return code_points;
    }

    for s in cell.split(',') {
        let s = s.trim();
        let hex_str = if s.starts_with("U+") {
            &s[2..]
        } else {
            s
        };

        if let Ok(cp) = u32::from_str_radix(hex_str, 16) {
            code_points.push(cp);
        }
    }

    code_points
}

/// Convert a glyph name to a safe filename
/// This is a simplified version - the Python version has more complex logic
fn string_to_filename(glyph_name: &str) -> String {
    // For now, just replace problematic characters
    glyph_name
        .replace('/', "_slash_")
        .replace('\\', "_backslash_")
        .replace(':', "_colon_")
        .replace('*', "_star_")
        .replace('?', "_question_")
        .replace('"', "_quote_")
        .replace('<', "_lt_")
        .replace('>', "_gt_")
        .replace('|', "_pipe_")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_code_points() {
        assert_eq!(parse_code_points("U+0041"), vec![0x41]);
        assert_eq!(parse_code_points("U+0041,U+0042"), vec![0x41, 0x42]);
        assert_eq!(parse_code_points(""), vec![]);
    }

    #[test]
    fn test_string_to_filename() {
        assert_eq!(string_to_filename("A"), "A");
        assert_eq!(string_to_filename("a/b"), "a_slash_b");
    }
}
