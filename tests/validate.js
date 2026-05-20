// validate.js — bulk-generate every authored case and assert invariants.
//
// Run with: node tests/validate.js
//
// Invariants checked per case:
//   1. Closed-form correct answer matches generator output.
//   2. Choices are strictly time-ordered A→D by instant.
//   3. No duplicate displayed values among the four choices.
//   4. Exactly four choices.
//   5. The choice flagged isCorrect matches the slot at correctSlotIndex.
//   6. Correct-slot index distribution covers all feasible positions.

import { example_1_3_4 } from "../data/example_1_3_4.js";
import { generateQuestion } from "../js/generator.js";
import { addHours, formatTime } from "../js/time.js";
import { RULES } from "../js/rules.js";

const ITERATIONS = 1000;

function runCase(exampleSpec, caseSpec, closedFormCorrect) {
  console.log(`\n=== ${exampleSpec.id} / ${caseSpec.id} — ${caseSpec.label} ===`);
  let failures = 0;
  const slotCounts = [0, 0, 0, 0];

  function fail(msg, q) {
    failures++;
    console.error(`  FAIL: ${msg}`);
    if (q) {
      console.error("    params:", q.params);
      console.error(
        "    choices:",
        q.choices.map((c) => ({
          label: c.label,
          displayText: c.displayText,
          instant: c.instant,
          ruleId: c.ruleId,
          isCorrect: c.isCorrect,
        })),
      );
      console.error("    correctSlotIndex:", q.correctSlotIndex);
    }
  }

  const ctx = exampleSpec.ctx;

  for (let i = 0; i < ITERATIONS; i++) {
    let q;
    try {
      q = generateQuestion(exampleSpec, caseSpec);
    } catch (err) {
      fail(`generator threw: ${err.message}`, null);
      continue;
    }

    const expected = closedFormCorrect(q.params, ctx);
    const correctChoice = q.choices[q.correctSlotIndex];
    if (correctChoice.instant !== expected) {
      fail(`correct answer mismatch: expected ${expected}, got ${correctChoice.instant}`, q);
    }

    for (let j = 1; j < q.choices.length; j++) {
      if (q.choices[j].instant <= q.choices[j - 1].instant) {
        fail(`choices not strictly time-ordered at index ${j}`, q);
        break;
      }
    }

    const seen = new Set();
    let dup = false;
    for (const c of q.choices) {
      if (seen.has(c.instant)) { dup = true; break; }
      seen.add(c.instant);
    }
    if (dup) fail("duplicate displayed value among choices", q);

    if (q.choices.length !== 4) fail(`expected 4 choices, got ${q.choices.length}`, q);

    const flaggedCorrectIndex = q.choices.findIndex((c) => c.isCorrect);
    if (flaggedCorrectIndex !== q.correctSlotIndex) {
      fail(`isCorrect flag at ${flaggedCorrectIndex} disagrees with correctSlotIndex ${q.correctSlotIndex}`, q);
    }

    slotCounts[q.correctSlotIndex]++;
  }

  console.log(`  Slot distribution: A=${slotCounts[0]} B=${slotCounts[1]} C=${slotCounts[2]} D=${slotCounts[3]}`);
  if (slotCounts.some((c) => c === 0)) {
    fail("at least one feasible slot was never used", null);
  }
  if (failures === 0) {
    console.log(`  All ${ITERATIONS} iterations passed.`);
  } else {
    console.error(`  ${failures} failure(s).`);
  }
  return failures;
}

// ---- Case 1: extension applies -------------------------------------------
const case1Closed = (params, ctx) =>
  Math.min(
    addHours(params.t_V1_inop, ctx.CT_A + 24),
    addHours(params.t_V2_inop, ctx.CT_A),
  ) + ctx.CT_B2 * 60;

// ---- Case 2: extension does NOT apply ------------------------------------
const case2Closed = (params, ctx) =>
  addHours(params.t_V1_inop, ctx.CT_A + ctx.CT_B2);

let totalFailures = 0;
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[0], case1Closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[1], case2Closed);

// ---- Canonical spot checks -----------------------------------------------
console.log("\n=== Canonical spot checks ===");

console.log("\nCase 1 (V1=0100, V2=0200, V1_restore=0300):");
const c1Params = { t_V1_inop: 60, t_V2_inop: 120, t_V1_restore: 180 };
for (const ruleId of [
  "case_1_correct",
  "B2_from_first_inop",
  "B2_from_second_inop",
  "B2_no_extension",
  "seq_B1B2_from_first",
  "seq_B1B2_from_second",
  "seq_B1B2_from_second_extended",
]) {
  const value = RULES[ruleId].compute(c1Params, example_1_3_4.ctx);
  console.log(`  ${ruleId.padEnd(36)} → ${formatTime(value, 60)}`);
}

console.log("\nCase 2 (V1=0100, V2=0200, V2_restore=0300):");
const c2Params = { t_V1_inop: 60, t_V2_inop: 120, t_V2_restore: 180 };
for (const ruleId of [
  "case_2_correct",
  "B2_from_first_inop",
  "B2_from_second_inop",
  "B2_from_second_restored",
  "restart_A_at_second_inop",
  "seq_B1B2_from_first",
  "restart_A_at_second_restore",
  "seq_B1B2_from_second",
  "seq_B1B2_from_second_extended",
]) {
  const value = RULES[ruleId].compute(c2Params, example_1_3_4.ctx);
  console.log(`  ${ruleId.padEnd(36)} → ${formatTime(value, 60)}`);
}

if (totalFailures > 0) {
  console.error(`\nTotal failures: ${totalFailures}`);
  process.exit(1);
}
console.log("\nAll cases passed.");
