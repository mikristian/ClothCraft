use serde_json::{json, Map, Value};
use std::io::{self, BufRead};

fn has_only(map: &Map<String, Value>, keys: &[&str]) -> bool {
    map.keys().all(|key| keys.contains(&key.as_str()))
}

fn error(code: &str, message: Option<&str>) -> Value {
    match message {
        Some(message) => json!({"status":400,"body":{"ok":false,"code":code,"error":message}}),
        None => json!({"status":400,"body":{"ok":false,"code":code}}),
    }
}

fn validate(command: &Value) -> Value {
    let Some(map) = command.as_object() else { return error("INVALID_ACTION", Some("Unknown fields or malformed action")); };
    let Some(action) = map.get("action").and_then(Value::as_str) else { return error("INVALID_ACTION", Some("Unknown fields or malformed action")); };
    if !has_only(map, &["action", "expectedRevision", "steps", "panel", "edge", "targetCm"]) {
        return error("INVALID_ACTION", Some("Unknown fields or malformed action"));
    }
    if !["workspace.snapshot", "workspace.summary", "workspace.save", "workspace.undo", "workspace.redo", "simulation.pause", "simulation.step", "line.inspect", "line.setTargetSpecification"].contains(&action) {
        return error("UNSUPPORTED_ACTION", Some("Action is not in capability manifest"));
    }
    if ["workspace.snapshot", "workspace.summary"].contains(&action) && !has_only(map, &["action"]) {
        return error("INVALID_ARGUMENTS", None);
    }
    let line_action = ["line.inspect", "line.setTargetSpecification"].contains(&action);
    if line_action {
        let keys = if action == "line.inspect" { vec!["action", "panel", "edge"] } else { vec!["action", "panel", "edge", "expectedRevision", "targetCm"] };
        if !has_only(map, &keys) || !["panel", "edge"].iter().all(|key| map.get(*key).and_then(Value::as_str).is_some_and(|value| !value.trim().is_empty())) {
            return error("INVALID_ARGUMENTS", None);
        }
        if action == "line.setTargetSpecification" && !map.get("targetCm").and_then(Value::as_f64).is_some_and(|value| (0.01..=1000.0).contains(&value)) {
            return error("INVALID_ARGUMENTS", Some("targetCm must be 0.01–1000 cm"));
        }
    }
    if !["workspace.snapshot", "workspace.summary", "line.inspect"].contains(&action) {
        let revision = map.get("expectedRevision").and_then(Value::as_i64);
        if !revision.is_some_and(|number| (0..=9007199254740991).contains(&number)) {
            return error("REVISION_REQUIRED", Some("expectedRevision must be a nonnegative safe integer"));
        }
    }
    if ["workspace.save", "workspace.undo", "workspace.redo", "simulation.pause"].contains(&action) && !has_only(map, &["action", "expectedRevision"]) {
        return error("INVALID_ARGUMENTS", None);
    }
    if action == "simulation.step" && (!has_only(map, &["action", "expectedRevision", "steps"]) || !map.get("steps").and_then(Value::as_i64).is_some_and(|n| (1..=4).contains(&n))) {
        return error("INVALID_ARGUMENTS", Some("steps must be integer 1..4"));
    }
    json!({"valid":true})
}

fn main() {
    for line in io::stdin().lock().lines() {
        let Ok(line) = line else { break };
        let response = match serde_json::from_str::<Value>(&line) {
            Ok(request) => validate(&request),
            Err(_) => error("INVALID_ACTION", Some("Unknown fields or malformed action")),
        };
        println!("{response}");
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn step_validation_boundaries_and_error_order() {
        for steps in [json!(null), json!("1"), json!(true), json!(0), json!(5), json!(1.5)] {
            assert_eq!(validate(&json!({"action":"simulation.step","expectedRevision":0,"steps":steps})),
                error("INVALID_ARGUMENTS", Some("steps must be integer 1..4")));
        }
        for steps in 1..=4 {
            assert_eq!(validate(&json!({"action":"simulation.step","expectedRevision":9007199254740991_i64,"steps":steps})), json!({"valid":true}));
        }
        assert_eq!(validate(&json!({"action":"simulation.step","steps":0})), error("REVISION_REQUIRED", Some("expectedRevision must be a nonnegative safe integer")));
        assert_eq!(validate(&json!({"action":"simulation.step","expectedRevision":0})), error("INVALID_ARGUMENTS", Some("steps must be integer 1..4")));
        assert_eq!(validate(&json!({"action":"simulation.step","expectedRevision":0,"steps":1,"panel":"x"})), error("INVALID_ARGUMENTS", Some("steps must be integer 1..4")));
    }
    #[test]
    fn preserves_action_errors() {
        assert_eq!(validate(&json!({"action":"workspace.nope"}))["body"]["code"], "UNSUPPORTED_ACTION");
        assert_eq!(validate(&json!({"action":"simulation.step","expectedRevision":0,"steps":5}))["body"]["code"], "INVALID_ARGUMENTS");
        assert_eq!(validate(&json!({"action":"workspace.save","expectedRevision":0}))["valid"], true);
        assert_eq!(validate(&json!({"action":"line.inspect","panel":"body","edge":""}))["body"]["code"], "INVALID_ARGUMENTS");
    }
}
