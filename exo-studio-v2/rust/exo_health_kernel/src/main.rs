use std::io::{self, Read};
use serde_json::Value;

fn health(input: &str) -> Result<String, &'static str> {
    let snapshot: Value = serde_json::from_str(input).map_err(|_| "invalid JSON")?;
    let object = snapshot.as_object().ok_or("expected object")?;
    let expected = ["ok", "backend", "nativeReady", "rustCheckoutReady", "ogcBackend", "nativeSession", "contactBusy", "fitCertified"];
    if object.len() != expected.len() || expected.iter().any(|name| !object.contains_key(*name)) { return Err("invalid keys"); }
    for name in ["ok", "nativeReady", "rustCheckoutReady", "ogcBackend", "contactBusy", "fitCertified"] {
        if !object[name].is_boolean() { return Err("invalid boolean"); }
    }
    if object["ok"] != true || object["fitCertified"] != false || object["backend"] != "clothcraft-exo-local" || !object["nativeSession"].is_object() { return Err("invalid health snapshot"); }
    // serde_json's map is ordered by key; explicitly reconstruct the Node response order.
    let mut output = String::from("{");
    for (index, name) in expected.iter().enumerate() {
        if index > 0 { output.push(','); }
        output.push_str(&serde_json::to_string(name).map_err(|_| "key")?);
        output.push(':');
        if *name == "nativeSession" {
            // Nested status is owned by Node and may be serialized in insertion order.
            // Caller compares output and uses the original snapshot when order differs.
            output.push_str(&serde_json::to_string(&object[*name]).map_err(|_| "status")?);
        } else {
            output.push_str(&serde_json::to_string(&object[*name]).map_err(|_| "value")?);
        }
    }
    output.push('}');
    Ok(output)
}
fn main() {
    let mut input = String::new();
    if io::stdin().take(65537).read_to_string(&mut input).is_err() || input.len() > 65536 { std::process::exit(2); }
    match health(&input) {
        Ok(serialized) => print!("{serialized}"),
        Err(_) => std::process::exit(2),
    }
}
#[cfg(test)] mod tests {
    use super::*;
    #[test] fn accepts_snapshot_and_preserves_order() {
        let input = r#"{"ok":true,"backend":"clothcraft-exo-local","nativeReady":false,"rustCheckoutReady":true,"ogcBackend":false,"nativeSession":{},"contactBusy":false,"fitCertified":false}"#;
        assert_eq!(health(input).unwrap(), input);
    }
    #[test] fn rejects_wrong_shape() {
        assert!(health("{}").is_err());
        assert!(health(r#"{"ok":"yes"}"#).is_err());
    }
}
