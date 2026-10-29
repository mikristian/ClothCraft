//! Deterministic self-contact broadphase, staged for integration into lib.rs.
//!
//! Callers retain ownership of fused-piece filtering, collision exclusions,
//! layer-directed normals, correction accumulation and final position writes.
//! Input order must match the JS piece/particle enumeration order. In
//! particular, this routine does not sort returned contacts by sim_index.

use std::collections::HashMap;

const EPSILON: f64 = 1e-6;

#[derive(Clone, Copy, Debug)]
pub struct Particle {
    pub position: [f64; 3],
    pub sim_index: i64,
    pub inverse_mass: f64,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct Candidate {
    pub source: usize,
    pub other: usize,
    pub squared_distance: f64,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BroadphaseError {
    InvalidMinimumDistance,
    NonFinitePosition,
    CellCoordinateOutOfRange,
}

type Cell = (i64, i64, i64);

fn cell(position: [f64; 3], width: f64) -> Result<Cell, BroadphaseError> {
    let mut coordinates = [0_i64; 3];
    for axis in 0..3 {
        let value = (position[axis] / width).floor();
        if !value.is_finite() {
            return Err(BroadphaseError::NonFinitePosition);
        }
        // Avoid saturating float-to-integer casts and unsafe +/- 1 neighbors.
        if value <= i64::MIN as f64 + 2.0 || value >= i64::MAX as f64 - 2048.0 {
            return Err(BroadphaseError::CellCoordinateOutOfRange);
        }
        coordinates[axis] = value as i64;
    }
    Ok((coordinates[0], coordinates[1], coordinates[2]))
}

/// Generate geometric contacts in the JS traversal order.
///
/// Only movable *source* particles initiate a search. The other particle can
/// be pinned, matching JS. The caller must subsequently apply the fused-piece
/// and exclusion tests before resolving each contact. An invalid coordinate
/// aborts the entire operation without returning partial candidates.
pub fn candidates(
    particles: &[Particle],
    minimum_distance: f64,
) -> Result<Vec<Candidate>, BroadphaseError> {
    if !minimum_distance.is_finite() || minimum_distance <= 0.0 {
        return Err(BroadphaseError::InvalidMinimumDistance);
    }
    if minimum_distance <= EPSILON {
        return Ok(Vec::new());
    }

    let mut grid: HashMap<Cell, Vec<usize>> = HashMap::new();
    let mut cells = Vec::with_capacity(particles.len());
    for (index, particle) in particles.iter().enumerate() {
        let key = cell(particle.position, minimum_distance)?;
        grid.entry(key).or_default().push(index);
        cells.push(key);
    }

    let mut contacts = Vec::new();
    let minimum_squared = minimum_distance * minimum_distance;
    for (source, particle) in particles.iter().enumerate() {
        if particle.inverse_mass <= 0.0 {
            continue;
        }
        let (x, y, z) = cells[source];
        for dx in -1_i64..=1 {
            for dy in -1_i64..=1 {
                for dz in -1_i64..=1 {
                    let key = (x + dx, y + dy, z + dz);
                    if let Some(indices) = grid.get(&key) {
                        for &other in indices {
                            if particles[other].sim_index <= particle.sim_index {
                                continue;
                            }
                            let a = particle.position;
                            let b = particles[other].position;
                            let squared_distance = (b[0] - a[0]).powi(2)
                                + (b[1] - a[1]).powi(2)
                                + (b[2] - a[2]).powi(2);
                            if squared_distance >= minimum_squared {
                                continue;
                            }
                            contacts.push(Candidate { source, other, squared_distance });
                        }
                    }
                }
            }
        }
    }
    Ok(contacts)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f64, y: f64, z: f64, sim_index: i64, inverse_mass: f64) -> Particle {
        Particle { position: [x, y, z], sim_index, inverse_mass }
    }

    #[test]
    fn finds_across_cell_boundary_but_not_at_cutoff() {
        let input = [p(0.09, 0.0, 0.0, 3, 1.0), p(0.11, 0.0, 0.0, 4, 0.0), p(0.50, 0.0, 0.0, 5, 1.0)];
        let got = candidates(&input, 0.1).unwrap();
        assert_eq!(got.len(), 1);
        assert_eq!((got[0].source, got[0].other), (0, 1));
    }

    #[test]
    fn keeps_js_neighbor_then_insertion_order() {
        let input = [p(0.0, 0.0, 0.0, 0, 1.0), p(0.01, 0.0, 0.0, 2, 1.0), p(-0.01, 0.0, 0.0, 1, 1.0)];
        let got = candidates(&input, 0.1).unwrap();
        assert_eq!(got.iter().map(|c| (c.source, c.other)).collect::<Vec<_>>(), vec![(0, 2), (0, 1), (2, 1)]);
        assert_eq!(got, candidates(&input, 0.1).unwrap());
    }

    #[test]
    fn pinned_sources_do_not_search_and_duplicate_indices_do_not_pair() {
        let input = [p(0.0, 0.0, 0.0, 1, 0.0), p(0.0, 0.0, 0.0, 1, 1.0), p(0.0, 0.0, 0.0, 2, 0.0)];
        assert_eq!(candidates(&input, 0.1).unwrap().iter().map(|c| (c.source, c.other)).collect::<Vec<_>>(), vec![(1, 2)]);
    }

    #[test]
    fn rejects_nonfinite_and_unrepresentable_cells_without_partial_output() {
        assert_eq!(candidates(&[p(f64::NAN, 0.0, 0.0, 1, 1.0)], 0.1), Err(BroadphaseError::NonFinitePosition));
        assert_eq!(candidates(&[p(1e30, 0.0, 0.0, 1, 1.0)], 0.1), Err(BroadphaseError::CellCoordinateOutOfRange));
        assert_eq!(candidates(&[], f64::NAN), Err(BroadphaseError::InvalidMinimumDistance));
        assert_eq!(candidates(&[], EPSILON), Ok(vec![]));
    }
}
