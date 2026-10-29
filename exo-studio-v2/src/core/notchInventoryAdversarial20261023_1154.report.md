# Independent notch baseline adversarial audit — 2026-10-23 11:54

Scope: `authoredNotchInventory20261023.js` and `manufacturingReleaseReadiness.js`; no production edits or factory approval.

## Verified

- 14/14 targeted Node tests pass (exit 0). Full output: `notchInventoryAdversarial20261023_1154.log`.
- A separately preserved baseline detects removed notch identities and entire missing pieces.
- Baseline schema/approved flag, duplicate baseline piece IDs and empty baseline notch inventory trigger blockers.
- Zero authored source notches cannot be captured as a baseline; deleting all notches from a previously captured nonempty baseline triggers missing-notch blockers.
- Size-set additions/removals, order changes and base-size changes trigger `SIZE_RUN_CHANGED`.
- Manufacturing readiness still sets `factoryCertified`, `factoryCuttingAuthorized`, and `bulkProductionAuthorized` to false.

## Unresolved blockers / trust limitations

1. **Baseline authenticity is unverified.** `compareAuthoredNotchInventoryBaseline20261023` accepts an attacker-edited baseline with `approved:false`; deletion of `side` from both source and baseline produces `identity_match_only` with zero blockers. There is no signed, immutable, independently approved provenance. The `approved:false` check is structural only.
2. **No connection to release.** `inspectManufacturingReleaseReadiness` never receives or invokes an authored-notch inventory baseline comparison. This identity check therefore cannot independently block a release readiness report when a source notch disappears. Release remains unapproved for other reasons, but provenance is not enforced in this gate.
3. **Identity is not physical geometry.** The baseline checks piece and notch IDs, not edge location, grade geometry, seam semantics or factory DXF physical notch realization. Existing physical QA must remain independent and fail closed.
4. **Baseline size contents are not internally authenticated.** The compare function checks equality to the current source size array, but does not independently validate the baseline size run for duplicates or base-size membership. A co-tampered source/baseline or forged record can match without provenance evidence.

Recommendation: independently authenticate/store baselines, tie verified baseline identity to manufacturing readiness with fail-closed missing-baseline policy when notches are expected, and retain physical per-size notch QA plus independent factory/sample signoff.
