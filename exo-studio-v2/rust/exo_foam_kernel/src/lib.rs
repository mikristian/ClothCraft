//! Bounded foam *preview* integration. Units are centimetres, seconds and kPa.
//! This does not replace EXO's physical VBD/OGC cloth-contact solver.

use std::sync::Mutex;

pub const ABI_VERSION: u32 = 1;

#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct State {
    pub compression: f64,
    pub velocity: f64,
    pub memory: f64,
    pub displacement_cm: f64,
    pub target_compression: f64,
}

#[derive(Clone, Copy, Debug)]
pub struct Properties {
    pub density_kg_m3: f64,
    pub compression_kpa: f64,
    pub recovery_seconds: f64,
    pub damping_ratio: f64,
    pub max_compression: f64,
    pub memory_fraction: f64,
}

#[inline]
pub fn press_falloff(distance_cm: f64, radius_cm: f64, edge_softness: f64) -> f64 {
    if distance_cm < 0.0 || radius_cm <= 0.0 || distance_cm >= radius_cm {return 0.0}
    let softness = edge_softness.clamp(0.05, 1.0);
    let plateau = radius_cm * (1.0 - softness);
    if distance_cm <= plateau {return 1.0}
    let t = ((radius_cm - distance_cm) / (radius_cm - plateau).max(1e-9)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// Caller enforces the same finite/default/bounds contract as the previous JS
/// public API. One call computes one state frame with internal 240Hz substeps.
pub fn advance(
    mut state: State, strength: f64, pressure_kpa: f64, falloff: f64,
    seconds: f64, depth_cm: f64, p: Properties,
) -> State {
    let load = strength * falloff;
    let target = p.max_compression * load * pressure_kpa / (pressure_kpa + p.compression_kpa);
    if seconds > 0.0 {
        let omega = ((4.6 / p.recovery_seconds) *
            ((p.compression_kpa / 35.0) * (45.0 / p.density_kg_m3)).sqrt()).clamp(0.8, 90.0);
        let steps = (seconds / (1.0 / 240.0)).ceil() as usize;
        let h = seconds / steps as f64;
        for _ in 0..steps {
            let memory_target = target * p.memory_fraction;
            state.memory += (memory_target - state.memory) *
                (1.0 - (-h / (p.recovery_seconds * 2.5)).exp());
            let equilibrium = (target + if load == 0.0 {state.memory} else {0.0})
                .clamp(0.0, p.max_compression);
            let acceleration = omega * omega * (equilibrium - state.compression)
                - 2.0 * p.damping_ratio * omega * state.velocity;
            state.velocity = (state.velocity + acceleration * h).clamp(-30.0, 30.0);
            let next = state.compression + state.velocity * h;
            state.compression = next.clamp(0.0, p.max_compression);
            if state.compression != next {state.velocity = 0.0}
        }
    }
    state.displacement_cm = depth_cm * state.compression;
    state.target_compression = target;
    state
}

// WASM's synchronous single-thread JavaScript adapter makes a whole step call
// then reads 5 scalar values. Native clients can call advance() directly.
// The mutex prevents data races if the exported functions are used by a host
// outside the browser single-thread model.
static RESULT: Mutex<State> = Mutex::new(State {
    compression: 0.0, velocity: 0.0, memory: 0.0,
    displacement_cm: 0.0, target_compression: 0.0,
});

#[no_mangle]
pub extern "C" fn exo_foam_abi_version() -> u32 { ABI_VERSION }

#[no_mangle]
pub extern "C" fn exo_foam_falloff(distance_cm:f64, radius_cm:f64, edge_softness:f64) -> f64 {
    press_falloff(distance_cm,radius_cm,edge_softness)
}

#[no_mangle]
pub extern "C" fn exo_foam_advance(
    compression:f64, velocity:f64, memory:f64,
    strength:f64, pressure_kpa:f64, falloff:f64, seconds:f64, depth_cm:f64,
    density_kg_m3:f64, compression_kpa:f64, recovery_seconds:f64,
    damping_ratio:f64, max_compression:f64, memory_fraction:f64,
) {
    let state=State { compression,velocity,memory,..State::default() };
    let properties=Properties {density_kg_m3,compression_kpa,recovery_seconds,
        damping_ratio,max_compression,memory_fraction};
    let result=advance(state,strength,pressure_kpa,falloff,seconds,depth_cm,properties);
    *RESULT.lock().expect("foam step state poisoned")=result;
}

#[no_mangle]
pub extern "C" fn exo_foam_compression() -> f64 { RESULT.lock().unwrap().compression }
#[no_mangle]
pub extern "C" fn exo_foam_velocity() -> f64 { RESULT.lock().unwrap().velocity }
#[no_mangle]
pub extern "C" fn exo_foam_memory() -> f64 { RESULT.lock().unwrap().memory }
#[no_mangle]
pub extern "C" fn exo_foam_displacement_cm() -> f64 { RESULT.lock().unwrap().displacement_cm }
#[no_mangle]
pub extern "C" fn exo_foam_target_compression() -> f64 { RESULT.lock().unwrap().target_compression }

#[cfg(test)]
mod tests {
    use super::*;
    fn properties()->Properties {Properties { density_kg_m3:45.0,compression_kpa:35.0,
        recovery_seconds:0.45,damping_ratio:1.0,max_compression:0.7,memory_fraction:0.0}}
    #[test]
    fn radial_contact_mask(){
        assert_eq!(press_falloff(0.0,4.0,1.0),1.0);
        assert_eq!(press_falloff(4.0,4.0,1.0),0.0);
        assert_eq!(press_falloff(-1.0,4.0,1.0),0.0);
        assert_eq!(press_falloff(2.0,4.0,1.0),0.5);
        assert_eq!(press_falloff(2.0,4.0,0.05),1.0);
    }
    #[test]
    fn press_then_recover(){
        let mut s=State::default();
        for _ in 0..120{s=advance(s,1.0,45.0,1.0,1.0/60.0,2.0,properties())}
        assert!(s.compression>0.0 && s.compression<0.7);
        assert!(s.displacement_cm>0.0);
        for _ in 0..360{s=advance(s,0.0,45.0,1.0,1.0/60.0,2.0,properties())}
        assert!(s.compression<1e-5);
    }
    #[test]
    fn zero_dt_preserves_sample(){
        let s=State{compression:0.4,velocity:-0.1,memory:0.2,..State::default()};
        let result=advance(s,1.0,45.0,1.0,0.0,2.0,properties());
        assert_eq!(result.compression,0.4);
        assert_eq!(result.velocity,-0.1);
        assert_eq!(result.displacement_cm,0.8);
    }
}
