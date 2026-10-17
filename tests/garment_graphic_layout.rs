use marvelous_cloth::garment::{
    GarmentTemplate, graphic_uv_kernel,
    graphics::{self, GraphicsDocument},
};
use serde_json::{Value, json};

const PNG: &str = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB";

fn example_record() -> Value {
    json!({
        "id":"swoosh-example",
        "name":"Demo swoosh",
        "panel":"left",
        "dataUrl":PNG,
        "format":"image/png",
        "width":120,
        "height":60,
        "center":[0.5,0.58],
        "scale":0.44,
        "rotation":90,
        "side":"front",
        "visible":true
    })
}

fn document(records: Vec<Value>) -> GraphicsDocument {
    serde_json::from_value(json!({"version":1,"graphics":records})).unwrap()
}

#[test]
fn matches_exo_graphic_uv_coordinates_scale_and_rotation() {
    let t = GarmentTemplate::two_panel_demo();
    let out = graphics::placements(&document(vec![example_record()]), &t).unwrap();
    assert_eq!(out.len(), 1);
    assert_eq!(out[0].panel, "left");
    assert_eq!(out[0].side, "front");
    assert!((out[0].u - 0.5).abs() < 1e-15);
    assert!((out[0].v - 0.42).abs() < 1e-15);
    assert!((out[0].width_uv - 0.44).abs() < 1e-15);
    assert!((out[0].rotation_radians + std::f64::consts::FRAC_PI_2).abs() < 1e-15);
    let value = serde_json::to_value(&out[0]).unwrap();
    assert_eq!(value["widthUV"], 0.44);
    assert!(value.get("rotationRadians").is_some());
    assert!(
        value.get("dataUrl").is_none(),
        "embedded image must not be echoed"
    );
}

#[test]
fn shared_rust_kernel_handles_physical_print_millimetres() {
    // 176 mm graphic on a 400 mm panel corresponds to the 44% EXO example.
    assert!((graphic_uv_kernel::exo_graphic_mm_ratio(176.0, 400.0) - 0.44).abs() < 1e-12);
    assert!((graphic_uv_kernel::exo_graphic_mm_to_uv_v(232.0, 400.0) - 0.42).abs() < 1e-12);
    // Overprints may deliberately extend beyond panel bounds. Do not clamp.
    assert_eq!(graphic_uv_kernel::exo_graphic_mm_ratio(600.0, 400.0), 1.5);
    assert_eq!(
        graphic_uv_kernel::exo_graphic_mm_to_uv_v(-20.0, 400.0),
        1.05
    );
}

#[test]
fn accepts_editor_defaults_multiple_sides_and_clamps_numeric_properties() {
    let mut first = example_record();
    first["center"] = json!([-5.0, 15.0]);
    first["scale"] = json!(20);
    first["rotation"] = json!(-900);
    first["side"] = json!("both");
    first["visible"] = json!(false);
    let mut second = example_record();
    second["id"] = json!("second");
    second["panel"] = json!("right");
    second.as_object_mut().unwrap().remove("scale");
    second.as_object_mut().unwrap().remove("rotation");
    second.as_object_mut().unwrap().remove("side");
    second.as_object_mut().unwrap().remove("center");
    let out = graphics::placements(
        &document(vec![first, second]),
        &GarmentTemplate::two_panel_demo(),
    )
    .unwrap();
    assert_eq!((out[0].u, out[0].v, out[0].width_uv), (0.0, 0.0, 1.5));
    assert!((out[0].rotation_radians - std::f64::consts::PI).abs() < 1e-15);
    assert_eq!(out[0].side, "both");
    assert!(!out[0].visible);
    assert_eq!((out[1].u, out[1].v, out[1].width_uv), (0.5, 0.5, 0.42));
    assert_eq!(out[1].rotation_radians, -0.0);
    assert_eq!(out[1].side, "front");
}

#[test]
fn rejects_unknown_panels_duplicate_ids_and_unsafe_image_references() {
    let t = GarmentTemplate::two_panel_demo();
    assert!(
        graphics::placements(&document(vec![example_record(), example_record()]), &t)
            .unwrap_err()
            .contains("graphic ID")
    );
    let mut bad = example_record();
    bad["panel"] = json!("missing-panel");
    assert!(
        graphics::placements(&document(vec![bad]), &t)
            .unwrap_err()
            .contains("unknown panel")
    );
    for url in [
        "javascript:alert(1)",
        "https://example.com/tracker.png",
        "data:image/svg+xml;base64,AA",
        "data:image/png;base64,AA#oops",
    ] {
        let mut bad = example_record();
        bad["dataUrl"] = json!(url);
        assert!(
            graphics::placements(&document(vec![bad]), &t)
                .unwrap_err()
                .contains("embedded PNG")
        );
    }
    let wrong_version: GraphicsDocument =
        serde_json::from_value(json!({"version":2,"graphics":[]})).unwrap();
    assert!(graphics::placements(&wrong_version, &t).is_err());
}

#[test]
fn rejects_invalid_record_count_and_non_finite_numbers() {
    let t = GarmentTemplate::two_panel_demo();
    let mut repeated = Vec::new();
    for n in 0..101 {
        let mut record = example_record();
        record["id"] = json!(format!("art-{n}"));
        repeated.push(record);
    }
    assert!(graphics::placements(&document(repeated), &t).is_err());
    let mut bad = document(vec![example_record()]);
    bad.graphics[0].rotation = f64::INFINITY;
    assert!(
        graphics::placements(&bad, &t)
            .unwrap_err()
            .contains("non-finite")
    );
}

#[test]
fn cpu_cli_resolves_graphic_layout_against_real_template() {
    let folder = tempfile::tempdir().unwrap();
    let template_path = folder.path().join("template.json");
    GarmentTemplate::two_panel_demo()
        .save(&template_path)
        .unwrap();
    let layout_path = folder.path().join("graphic-layout.json");
    std::fs::write(
        &layout_path,
        serde_json::to_vec(&json!({
            "version":1,"graphics":[example_record()]
        }))
        .unwrap(),
    )
    .unwrap();
    let output = std::process::Command::new(env!("CARGO_BIN_EXE_cloth-template"))
        .arg("graphics-layout")
        .arg(&template_path)
        .arg(&layout_path)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let result: Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["version"], 1);
    assert_eq!(result["placements"][0]["id"], "swoosh-example");
    assert_eq!(result["placements"][0]["widthUV"], 0.44);
    assert!(result["placements"][0].get("dataUrl").is_none());

    // Unknown panels fail rather than silently changing the printed side.
    let mut bad = example_record();
    bad["panel"] = json!("not-a-real-panel");
    std::fs::write(
        &layout_path,
        serde_json::to_vec(&json!({
            "version":1,"graphics":[bad]
        }))
        .unwrap(),
    )
    .unwrap();
    let failed = std::process::Command::new(env!("CARGO_BIN_EXE_cloth-template"))
        .arg("graphics-layout")
        .arg(&template_path)
        .arg(&layout_path)
        .output()
        .unwrap();
    assert!(!failed.status.success());
    assert!(String::from_utf8_lossy(&failed.stderr).contains("unknown panel"));
}
