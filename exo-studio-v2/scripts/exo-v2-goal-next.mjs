#!/usr/bin/env node
/**
 * Read-only, no-dependencies goal handoff; does not execute a task.
 * Usage: node scripts/exo-v2-goal-next.mjs [--id CAD-001] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const file = path.join(root, "docs/goals/exo-v2-goals.json");
const argv = process.argv.slice(2);
const idPos = argv.indexOf("--id");
const id = idPos < 0 ? null : argv[idPos + 1];
const json = argv.includes("--json");
const m = JSON.parse(fs.readFileSync(file, "utf8"));
const map = new Map(m.goals.map((g) => [g.id, g]));
if (idPos >= 0 && !id) {
  console.error("--id requires a goal ID");
  process.exitCode = 2;
} else {
  const ready = m.goals.filter((g) => g.status === "planned" && g.dependsOn.every((d) => map.get(d)?.status === "verified"));
  const g = id ? map.get(id) : ready.sort((a, b) => a.priority.localeCompare(b.priority) || a.id.localeCompare(b.id))[0];
  if (!g) {
    console.error(id ? "Unknown goal: " + id : "No goal is currently eligible; inspect blocked dependencies.");
    process.exitCode = 2;
  } else {
    const dependencies = g.dependsOn.map((d) => ({ id: d, title: map.get(d)?.title || "MISSING", status: map.get(d)?.status || "MISSING" }));
    const eligible = g.status === "planned" && dependencies.every((d) => d.status === "verified");
    const packet = {
      kind: "exo-v2-read-only-handoff",
      goalId: g.id, title: g.title, area: g.domain, priority: g.priority,
      status: g.status, eligible, dependencies, role: g.ownerRole,
      sourcePath: g.sourcePath, deliverable: g.deliverable,
      acceptanceCriteria: g.acceptanceCriteria, requiredEvidenceTier: g.requiredEvidenceTier,
      verificationState: g.verificationState,
      executionRules: [
        "Check current git status, source revision, disk and coordinator lock; never rely on the dated snapshot.",
        "Use an isolated bounded work scope; preserve all current authored source and user garments.",
        "Do not run native builds without at least 8 GiB free, or tee trials with under 1 GiB.",
        "Use independently executed acceptance checks; no proof, no verified status.",
        "Never start another Rust writer, auto-merge a dirty branch, auto-release or install over existing apps."
      ],
      spec: m.sourceOfTruth,
      operatingProtocol: m.executionProtocol,
      note: eligible
        ? "Eligibility only means declared dependencies are verified in the manifest; inspect real external evidence before starting."
        : "READ-ONLY PLANNING: dependencies or current status block automatic execution."
    };
    if (json) console.log(JSON.stringify(packet, null, 2));
    else {
      console.log("EXO GOAL HANDOFF (read only)");
      console.log(g.id + " | " + g.priority + " | " + g.title);
      console.log("Status: " + g.status + " | Eligibility: " + (eligible ? "declared ready" : "blocked by manifest"));
      console.log("Owner role: " + g.ownerRole + " | Required proof: " + g.requiredEvidenceTier);
      console.log("Source: " + g.sourcePath);
      console.log("Dependencies: " + (dependencies.length ? dependencies.map((d) => d.id + "=" + d.status).join(", ") : "none"));
      console.log("Deliverable: " + g.deliverable);
      for (const [i, c] of g.acceptanceCriteria.entries()) console.log("Acceptance " + (i + 1) + ": " + c);
      console.log("Safety: inspect repo/locks, preserve work, >=8 GiB before builds, no parallel Rust writer.");
      console.log(packet.note);
    }
  }
}
