//! Source-only reference implementation of the full JS self-collision pass.
//! Particle ordering must match simulation.pieces.values() / piece.particles.
//! No WASM ABI or integration is advertised until parity has been tested.
use std::collections::{HashMap, HashSet};

const EPSILON: f64 = 1e-6;

#[derive(Clone, Debug)]
pub struct Particle {
    pub sim_index: i64,
    pub piece_id: String,
    pub position: [f64; 3],
    pub inv_mass: f64,
    pub layer_index: f64,
    pub wrap_mode: String,
    pub collision_side_z: f64,
}

#[derive(Default, Debug, Clone, Copy, PartialEq, Eq)]
pub struct PassStats {
    pub examined_pairs: usize,
    pub active_contacts: usize,
}

type Cell = (i64, i64, i64);

fn cell(position: [f64; 3], size: f64) -> Option<Cell> {
    let coordinate = |v: f64| {
        let q = (v / size).floor();
        if q.is_finite() && q >= i64::MIN as f64 && q < i64::MAX as f64 {
            Some(q as i64)
        } else {
            None
        }
    };
    Some((coordinate(position[0])?, coordinate(position[1])?, coordinate(position[2])?))
}

fn dot(a: [f64; 3], b: [f64; 3]) -> f64 {
    a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

fn normalize(v: [f64; 3]) -> [f64; 3] {
    let length = dot(v, v).sqrt();
    if length > 0.0 && length.is_finite() {
        [v[0] / length, v[1] / length, v[2] / length]
    } else {
        [0.0; 3]
    }
}

fn outward(p: &Particle) -> [f64; 3] {
    let center_x = match p.wrap_mode.as_str() {
        "left-arm" => -0.285,
        "right-arm" => 0.285,
        x if x.starts_with("left-leg") => -0.105,
        x if x.starts_with("right-leg") => 0.105,
        _ => 0.0,
    };
    let direction = [p.position[0] - center_x, 0.0, p.position[2]];
    if dot(direction, direction) <= EPSILON {
        [0.0, 0.0, p.collision_side_z]
    } else {
        normalize(direction)
    }
}

/// Resolve one pass. Fused pairs are unordered piece-id tuples. Exclusions are
/// ordered sim-index pairs (left, right), as in the JS lookup string.
/// Invalid floating inputs are ignored; callers should validate simulation data.
pub fn resolve(
    particles: &mut [Particle],
    minimum_distance: f64,
    fused_pairs: &HashSet<(String, String)>,
    exclusions: &HashSet<(i64, i64)>,
) -> PassStats {
    let mut stats = PassStats::default();
    if !minimum_distance.is_finite() || minimum_distance <= EPSILON {
        return stats;
    }
    let mut grid: HashMap<Cell, Vec<usize>> = HashMap::new();
    for (index, particle) in particles.iter().enumerate() {
        if let Some(key) = cell(particle.position, minimum_distance) {
            grid.entry(key).or_default().push(index);
        }
    }
    let min_sq = minimum_distance * minimum_distance;
    let mut corrections: HashMap<i64, [f64; 3]> = HashMap::new();
    for (i, particle) in particles.iter().enumerate() {
        if particle.inv_mass <= 0.0 || !particle.inv_mass.is_finite() {
            continue;
        }
        let Some((cx, cy, cz)) = cell(particle.position, minimum_distance) else {
            continue;
        };
        for dx in -1i64..=1 {
            for dy in -1i64..=1 {
                for dz in -1i64..=1 {
                    let Some(key) = cx.checked_add(dx).zip(cy.checked_add(dy)).zip(cz.checked_add(dz))
                        .map(|((x, y), z)| (x, y, z)) else { continue };
                    let Some(candidates) = grid.get(&key) else { continue };
                    for &j in candidates {
                        let other = &particles[j];
                        if other.sim_index <= particle.sim_index { continue; }
                        if particle.piece_id != other.piece_id {
                            let pair = if particle.piece_id <= other.piece_id {
                                (&particle.piece_id, &other.piece_id)
                            } else {
                                (&other.piece_id, &particle.piece_id)
                            };
                            if fused_pairs.contains(&(pair.0.clone(), pair.1.clone())) { continue; }
                        }
                        if exclusions.contains(&(particle.sim_index, other.sim_index)) { continue; }
                        stats.examined_pairs += 1;
                        let mut delta = [
                            other.position[0] - particle.position[0],
                            other.position[1] - particle.position[1],
                            other.position[2] - particle.position[2],
                        ];
                        let distance_sq = dot(delta, delta);
                        if !distance_sq.is_finite() || distance_sq >= min_sq { continue; }
                        let distance = distance_sq.max(EPSILON).sqrt();
                        let penetration = minimum_distance - distance;
                        let mut wa = particle.inv_mass;
                        let mut wb = other.inv_mass;
                        if wa + wb <= EPSILON { continue; }
                        if particle.layer_index != other.layer_index && wa > 0.0 && wb > 0.0 {
                            if particle.layer_index > other.layer_index {
                                wa = 0.9; wb = 0.1;
                            } else {
                                wa = 0.1; wb = 0.9;
                            }
                        }
                        let total = wa + wb;
                        if !total.is_finite() || total <= 0.0 { continue; }
                        let scale_a = -penetration * (wa / total);
                        let scale_b = penetration * (wb / total);
                        if particle.layer_index != other.layer_index {
                            let higher = if particle.layer_index > other.layer_index { particle } else { other };
                            let mut preferred = outward(higher);
                            if other.layer_index < particle.layer_index {
                                preferred = preferred.map(|v| -v);
                            }
                            if distance_sq <= EPSILON {
                                delta = preferred;
                            } else {
                                delta = delta.map(|v| v / distance);
                                if dot(delta, preferred) < 0.65 {
                                    delta = normalize(std::array::from_fn(|k| delta[k] * 0.18 + preferred[k] * 0.82));
                                }
                            }
                        } else if distance_sq <= EPSILON {
                            delta = [1.0, 0.0, 0.0];
                        } else {
                            delta = delta.map(|v| v / distance);
                        }
                        if wa > 0.0 {
                            let entry = corrections.entry(particle.sim_index).or_insert([0.0; 3]);
                            for k in 0..3 { entry[k] += delta[k] * scale_a; }
                        }
                        if wb > 0.0 {
                            let entry = corrections.entry(other.sim_index).or_insert([0.0; 3]);
                            for k in 0..3 { entry[k] += delta[k] * scale_b; }
                        }
                        stats.active_contacts += 1;
                    }
                }
            }
        }
    }
    for particle in particles {
        if particle.inv_mass > 0.0 {
            if let Some(correction) = corrections.get(&particle.sim_index) {
                for k in 0..3 { particle.position[k] += correction[k]; }
            }
        }
    }
    stats
}

#[cfg(test)]
mod tests {
    use super::*;
    fn p(id: i64, x: f64) -> Particle {
        Particle {
            sim_index: id, piece_id: "a".into(), position: [x, 0.0, 0.0],
            inv_mass: 1.0, layer_index: 0.0, wrap_mode: String::new(),
            collision_side_z: 1.0,
        }
    }
    fn run(ps: &mut [Particle]) -> PassStats {
        resolve(ps, 1.0, &HashSet::new(), &HashSet::new())
    }
    #[test]
    fn symmetric_pair_and_deferred_updates() {
        let mut ps = vec![p(0, 0.0), p(1, 0.5)];
        assert_eq!(run(&mut ps).active_contacts, 1);
        assert!((ps[0].position[0] + 0.25).abs() < 1e-12);
        assert!((ps[1].position[0] - 0.75).abs() < 1e-12);
    }
    #[test]
    fn pins_and_directed_exclusion() {
        let mut ps = vec![p(0, 0.0), p(1, 0.5)];
        ps[1].inv_mass = 0.0;
        assert_eq!(run(&mut ps).active_contacts, 1);
        assert!((ps[0].position[0] + 0.5).abs() < 1e-12);
        assert_eq!(ps[1].position[0], 0.5);
        let mut ps = vec![p(0, 0.0), p(1, 0.5)];
        assert_eq!(resolve(&mut ps, 1.0, &HashSet::new(), &HashSet::from([(0, 1)])).active_contacts, 0);
    }
    #[test]
    fn fused_pieces_and_neighbor_cells() {
        let mut ps = vec![p(0, 0.99), p(1, 1.01)];
        ps[1].piece_id = "b".into();
        assert_eq!(run(&mut ps).active_contacts, 1);
        let mut ps = vec![p(0, 0.99), p(1, 1.01)];
        ps[1].piece_id = "b".into();
        assert_eq!(resolve(&mut ps, 1.0, &HashSet::from([("a".into(), "b".into())]), &HashSet::new()).active_contacts, 0);
    }
    #[test]
    fn coincident_layered_and_invalid() {
        let mut ps = vec![p(0, 0.0), p(1, 0.0)];
        ps[1].layer_index = 1.0;
        assert_eq!(run(&mut ps).active_contacts, 1);
        assert!(ps[1].position[2] > 0.0);
        assert!(ps[0].position[2] < 0.0);
        let mut ps = vec![p(0, f64::NAN), p(1, 0.0)];
        assert_eq!(run(&mut ps).active_contacts, 0);
        assert_eq!(resolve(&mut ps, f64::NAN, &HashSet::new(), &HashSet::new()).active_contacts, 0);
    }
}
