//! CPU-only layout and validation for EXO Studio v1 embedded garment graphics.
//!
//! Ported from the document, clamping and UV-placement rules in
//! `exo-sample-3d/src/core/nativeGarmentGraphics.js`. This module does not
//! decode PNGs, project textures, change simulation materials or render UI.
use super::{GarmentTemplate, graphic_uv_kernel};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;

pub const GRAPHICS_VERSION: u32 = 1;
pub const MAX_GRAPHICS: usize = 100;
pub const MAX_DATA_URL_LEN: usize = 24 * 1024 * 1024;

fn default_center() -> [f64; 2] {
    [0.5, 0.5]
}
fn default_scale() -> f64 {
    0.42
}
fn default_side() -> String {
    "front".into()
}
fn default_true() -> bool {
    true
}

/// The JSON representation produced by the EXO Graphic panel's Export layout.
/// Artwork stays embedded; only placement metadata is emitted by this module.
#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphicRecord {
    pub id: String,
    #[serde(default)]
    pub name: String,
    pub panel: String,
    pub data_url: String,
    #[serde(default)]
    pub format: Option<String>,
    #[serde(default)]
    pub width: f64,
    #[serde(default)]
    pub height: f64,
    #[serde(default = "default_center")]
    pub center: [f64; 2],
    #[serde(default = "default_scale")]
    pub scale: f64,
    #[serde(default)]
    pub rotation: f64,
    #[serde(default = "default_side")]
    pub side: String,
    #[serde(default = "default_true")]
    pub visible: bool,
}

#[derive(Clone, Debug, Deserialize)]
pub struct GraphicsDocument {
    pub version: u32,
    pub graphics: Vec<GraphicRecord>,
}

/// Normalized per-panel UV placement. EXO's editor Y increases downward;
/// the Three.js cloth UV V axis increases upward. Angles use inverse signs.
#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GraphicPlacement {
    pub id: String,
    pub panel: String,
    pub side: String,
    pub visible: bool,
    pub u: f64,
    pub v: f64,
    #[serde(rename = "widthUV")]
    pub width_uv: f64,
    pub rotation_radians: f64,
}

fn valid_png_data_url(url: &str) -> bool {
    let Some(body) = url.strip_prefix("data:image/png;base64,") else {
        return false;
    };
    if url.len() > MAX_DATA_URL_LEN || body.is_empty() || !url.is_ascii() {
        return false;
    }
    let raw = body.trim_end_matches('=');
    !raw.is_empty()
        && body.len() - raw.len() <= 2
        && raw
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b == b'+' || b == b'/')
}

/// Validate an existing, saved EXO document and project its artwork metadata
/// into garment UV space without copying the embedded PNG bytes into output.
/// Numeric clamping is compatible with EXO's normalization; image decoding and
/// SVG sanitization remain responsibilities of the import UI.
pub fn placements(
    document: &GraphicsDocument,
    template: &GarmentTemplate,
) -> Result<Vec<GraphicPlacement>, String> {
    if document.version != GRAPHICS_VERSION || document.graphics.len() > MAX_GRAPHICS {
        return Err("Unsupported graphics version or collection size".into());
    }
    let panels: HashSet<_> = template.panels.iter().map(|p| p.id.as_str()).collect();
    let mut seen = HashSet::new();
    let mut result = Vec::with_capacity(document.graphics.len());
    for graphic in &document.graphics {
        if graphic.id.is_empty()
            || graphic.id.chars().count() > 128
            || !seen.insert(graphic.id.as_str())
        {
            return Err("Missing, duplicate or oversized graphic ID".into());
        }
        if graphic.panel.trim().is_empty()
            || graphic.panel.chars().count() > 256
            || !panels.contains(graphic.panel.as_str())
        {
            return Err(format!(
                "Graphic {} references an unknown panel",
                graphic.id
            ));
        }
        if !valid_png_data_url(&graphic.data_url)
            || graphic.format.as_deref().is_some_and(|f| f != "image/png")
        {
            return Err(format!("Graphic {} needs an embedded PNG", graphic.id));
        }
        if graphic.name.chars().count() > 256 {
            return Err(format!("Graphic {} name is too long", graphic.id));
        }
        if [
            graphic.width,
            graphic.height,
            graphic.center[0],
            graphic.center[1],
            graphic.scale,
            graphic.rotation,
        ]
        .iter()
        .any(|value| !value.is_finite())
        {
            return Err(format!(
                "Graphic {} contains non-finite placement",
                graphic.id
            ));
        }
        let side = match graphic.side.as_str() {
            "front" | "back" | "both" => graphic.side.clone(),
            _ => "front".into(),
        };
        result.push(GraphicPlacement {
            id: graphic.id.clone(),
            panel: graphic.panel.clone(),
            side,
            visible: graphic.visible,
            u: graphic_uv_kernel::exo_graphic_uv_u(graphic.center[0]),
            v: graphic_uv_kernel::exo_graphic_uv_v(graphic.center[1]),
            width_uv: graphic_uv_kernel::exo_graphic_width_uv(graphic.scale),
            rotation_radians: graphic_uv_kernel::exo_graphic_rotation_radians(graphic.rotation),
        });
    }
    Ok(result)
}
