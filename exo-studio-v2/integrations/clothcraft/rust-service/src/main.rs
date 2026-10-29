use serde_json::{json, Value};
use std::io::{self, BufRead};

fn printable(v: &str, max: usize) -> bool {
    v.chars().count() <= max && !v.chars().any(|c| (c as u32) <= 31 || c == '\u{7f}')
}

fn pantone_code(v: &str) -> bool {
    if v.is_empty() { return true; }
    let bytes = v.as_bytes();
    if bytes.len() == 11 && bytes[2] == b'-' && bytes[7] == b' '
        && bytes[..2].iter().chain(bytes[3..7].iter()).all(u8::is_ascii_digit)
        && (&v[8..] == "TCX" || &v[8..] == "TPG") { return true; }
    if !v.starts_with("PANTONE ") { return false; }
    let Some(body) = v.strip_prefix("PANTONE ") else { return false };
    let Some((name, suffix)) = body.rsplit_once(' ') else { return false };
    (suffix == "C" || suffix == "U") && (1..=36).contains(&name.len())
        && name.bytes().all(|b| b.is_ascii_uppercase() || b.is_ascii_digit() || b == b' ')
        && name.as_bytes().first().is_some_and(|b| b.is_ascii_uppercase() || b.is_ascii_digit())
}

fn validate(request: &Value) -> Value {
    let Some(field) = request.get("field").and_then(Value::as_str) else {
        return json!({"ok":false,"error":"Missing property field"});
    };
    let Some(target) = request.get("target").and_then(Value::as_str) else {
        return json!({"ok":false,"error":"Property target must be panel or fabric"});
    };
    if target != "panel" && target != "fabric" {
        return json!({"ok":false,"error":"Property target must be panel or fabric"});
    }
    let allowed = field == "itemNo" || target == "fabric" && ["construction", "supplier", "owner", "pantoneCode", "pantoneSystem", "pantoneSource", "pantoneApproval"].contains(&field);
    let (appearance, reset, key) = if target == "fabric" {
        let segments: Vec<&str> = field.split('.').collect();
        let reset = matches!(segments.as_slice(), ["appearance", "back" | "side", "reset"]);
        let key = match segments.as_slice() {
            ["appearance", key] if ["color", "opacity", "roughness", "metalness", "reflectionIntensity"].contains(key) => Some(*key),
            ["appearance", "back" | "side", key] if ["color", "opacity", "roughness", "metalness", "reflectionIntensity"].contains(key) => Some(*key),
            _ => None,
        };
        (key.is_some(), reset, key)
    } else { (false, false, None) };
    if !allowed && !appearance && !reset { return json!({"ok":false,"error":"Unsupported property field"}); }
    let value = request.get("value").unwrap_or(&Value::Null);
    let optional = field != "itemNo" && !appearance && !reset;
    let valid = if reset { value == &Value::Bool(true) }
    else if appearance {
        if key == Some("color") { value.as_str().is_some_and(|s| s.len() == 7 && s.starts_with('#') && s[1..].bytes().all(|b| b.is_ascii_hexdigit())) }
        else { value.as_f64().is_some_and(|n| n.is_finite() && n >= 0.0 && n <= if key == Some("reflectionIntensity") { 3.0 } else { 1.0 }) }
    } else if field == "pantoneSystem" { value.as_str().is_some_and(|s| ["", "TCX", "TPG", "PMS"].contains(&s)) }
    else if field == "pantoneCode" { value.as_str().is_some_and(pantone_code) }
    else { optional && value.is_null() || value.as_str().is_some_and(|s| printable(s, if optional {128} else {120})) };
    if valid { json!({"ok":true}) } else {
        let message = if reset { "Invalid fabric face reset value" }
        else if appearance { "Invalid fabric appearance value" }
        else if field == "pantoneSystem" { "Unsupported Pantone color system" }
        else if field == "pantoneCode" { "Use a valid Pantone reference such as 19-4052 TCX or PANTONE Warm Gray 1 C" }
        else if optional { "Fabric information must be optional text of at most 128 printable characters" }
        else { "Item number must contain at most 120 printable characters" };
        json!({"ok":false,"error":message})
    }
}

fn main() {
    for line in io::stdin().lock().lines() {
        let output = match line {
            Ok(line) => match serde_json::from_str::<Value>(&line) {
                Ok(value) => validate(&value),
                Err(_) => json!({"ok":false,"error":"Invalid project JSON"}),
            },
            Err(_) => break,
        };
        println!("{}", output);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn check(target: &str, field: &str, value: Value) -> bool {
        validate(&json!({"target":target,"field":field,"value":value}))["ok"] == true
    }
    #[test] fn pantone_formats() {
        assert!(check("fabric", "pantoneCode", json!("19-4052 TCX")));
        assert!(check("fabric", "pantoneCode", json!("PANTONE Warm Gray 1 C")) == false); // JS regular expression requires upper-case after PANTONE.
        assert!(check("fabric", "pantoneCode", json!("PANTONE WARM GRAY 1 C")));
        assert!(!check("fabric", "pantoneCode", json!("19-4052 RGB")));
    }
    #[test] fn appearance_faces_and_limits() {
        assert!(check("fabric", "appearance.back.color", json!("#ff00AA")));
        assert!(!check("fabric", "appearance.side.color", json!("red")));
        assert!(check("fabric", "appearance.reflectionIntensity", json!(2.8)));
        assert!(!check("fabric", "appearance.roughness", json!(1.2)));
        assert!(check("fabric", "appearance.side.reset", json!(true)));
        assert!(!check("fabric", "appearance.side.reset", json!(false)));
    }
    #[test] fn item_and_optional_fields() {
        assert!(check("panel", "itemNo", json!("EXO-01")));
        assert!(!check("panel", "itemNo", json!("line\nbreak")));
        assert!(!check("panel", "itemNo", json!("x".repeat(121))));
        assert!(check("fabric", "supplier", Value::Null));
        assert!(!check("panel", "supplier", json!("A")));
    }
}
