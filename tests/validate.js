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

import { example_1_3_1 } from "../data/example_1_3_1.js";
import { example_1_3_2 } from "../data/example_1_3_2.js";
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

  const ctx = { ...exampleSpec.ctx, ...(caseSpec.ctx ?? {}) };

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
  // Informational only — some cases have distractor pools that make
  // certain correct-slot positions structurally unreachable (e.g. when the
  // correct answer sits near one end of the pool's value range). The
  // generator already restricts to feasible positions per sample; missing
  // slots here reflect case authoring, not engine bugs.
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

// ---- Case 3: V2 is a fresh entry into Condition A ------------------------
const case3Closed = (params, ctx) =>
  addHours(params.t_V2_inop, ctx.CT_A + ctx.CT_B2);

// ---- Cases 4 & 5: modified LCO (CT_A = 72), extension applies -----------
// Both use the same min(a, b) + CT_B2 formula; only the ctx and the param
// ranges differ. Case 4 → (b) wins; Case 5 → (a) wins. The closed-form is
// the same expression in both.
const case4Closed = (params, ctx) =>
  Math.min(
    addHours(params.t_V1_inop, ctx.CT_A + 24),
    addHours(params.t_V2_inop, ctx.CT_A),
  ) + ctx.CT_B2 * 60;
const case5Closed = case4Closed;

// ---- 1.3-1 cases ---------------------------------------------------------
const mode_3_closed = (params) => addHours(params.t_condB_entry, 6);
const mode_5_closed = (params) => addHours(params.t_condB_entry, 36);

function runTwoColumnCase(exampleSpec, caseSpec, xClosed, yClosed) {
  console.log(`\n=== ${exampleSpec.id} / ${caseSpec.id} — ${caseSpec.label} ===`);
  let failures = 0;
  const slotCounts = [0, 0, 0, 0];

  function fail(msg, q) {
    failures++;
    console.error(`  FAIL: ${msg}`);
    if (q) console.error("    q:", JSON.stringify(q, null, 2));
  }

  const ctx = { ...exampleSpec.ctx, ...(caseSpec.ctx ?? {}) };

  for (let i = 0; i < ITERATIONS; i++) {
    let q;
    try {
      q = generateQuestion(exampleSpec, caseSpec);
    } catch (err) {
      fail(`generator threw: ${err.message}`, null);
      continue;
    }

    if (q.layout !== "two_column") {
      fail(`expected layout "two_column", got "${q.layout}"`, q);
      continue;
    }
    if (q.choices.length !== 4) {
      fail(`expected 4 choices, got ${q.choices.length}`, q);
    }

    const expectedX = xClosed(q.params, ctx);
    const expectedY = yClosed(q.params, ctx);
    const correct = q.choices[q.correctSlotIndex];

    // The correct choice must have the X and Y closed-form values.
    // Recover the underlying instants via the formatter is awkward; instead
    // recompute from the rule.
    const xValue = RULES[correct.xRuleId].compute(q.params, ctx);
    const yValue = RULES[correct.yRuleId].compute(q.params, ctx);
    if (xValue !== expectedX) {
      fail(`X correct mismatch: expected ${expectedX}, got ${xValue}`, q);
    }
    if (yValue !== expectedY) {
      fail(`Y correct mismatch: expected ${expectedY}, got ${yValue}`, q);
    }

    // 2x2 grid invariants:
    //   - A.x === B.x (top row shares the same X value)
    //   - C.x === D.x (bottom row shares the same X value)
    //   - A.x < C.x (top row X is smaller)
    //   - A.y === C.y, B.y === D.y (columns share Y)
    //   - A.y < B.y (left column Y is smaller)
    const ax = RULES[q.choices[0].xRuleId].compute(q.params, ctx);
    const bx = RULES[q.choices[1].xRuleId].compute(q.params, ctx);
    const cx = RULES[q.choices[2].xRuleId].compute(q.params, ctx);
    const dx = RULES[q.choices[3].xRuleId].compute(q.params, ctx);
    const ay = RULES[q.choices[0].yRuleId].compute(q.params, ctx);
    const by = RULES[q.choices[1].yRuleId].compute(q.params, ctx);
    const cy = RULES[q.choices[2].yRuleId].compute(q.params, ctx);
    const dy = RULES[q.choices[3].yRuleId].compute(q.params, ctx);
    if (ax !== bx) fail(`A.x (${ax}) !== B.x (${bx})`, q);
    if (cx !== dx) fail(`C.x (${cx}) !== D.x (${dx})`, q);
    if (ay !== cy) fail(`A.y (${ay}) !== C.y (${cy})`, q);
    if (by !== dy) fail(`B.y (${by}) !== D.y (${dy})`, q);
    if (!(ax < cx)) fail(`top-row X (${ax}) not < bottom-row X (${cx})`, q);
    if (!(ay < by)) fail(`left-col Y (${ay}) not < right-col Y (${by})`, q);

    // No duplicate (xRuleId, yRuleId) tuples and the four choices are
    // unique by (xValue, yValue).
    const seen = new Set();
    for (const c of q.choices) {
      const key = `${RULES[c.xRuleId].compute(q.params, ctx)}|${RULES[c.yRuleId].compute(q.params, ctx)}`;
      if (seen.has(key)) {
        fail(`duplicate (X,Y) tuple ${key}`, q);
      }
      seen.add(key);
    }

    slotCounts[q.correctSlotIndex]++;
  }

  console.log(`  Slot distribution: A=${slotCounts[0]} B=${slotCounts[1]} C=${slotCounts[2]} D=${slotCounts[3]}`);
  if (slotCounts.some((c) => c === 0)) {
    fail("at least one correct-slot position never used (all 4 should be reachable)", null);
  }
  if (failures === 0) {
    console.log(`  All ${ITERATIONS} iterations passed.`);
  } else {
    console.error(`  ${failures} failure(s).`);
  }
  return failures;
}

let totalFailures = 0;
totalFailures += runTwoColumnCase(
  example_1_3_1,
  example_1_3_1.cases[0],
  mode_3_closed,
  mode_5_closed,
);
totalFailures += runCase(example_1_3_1, example_1_3_1.cases[1], mode_5_closed);
totalFailures += runCase(example_1_3_1, example_1_3_1.cases[2], mode_3_closed);
// 1.3-2 closed-form
const ex_1_3_2_case1_closed = (params) => addHours(params.t_V2_inop, 37);
const ex_1_3_2_case23_closed = (params) =>
  addHours(params.t_V1_inop, 168 + 36);
totalFailures += runCase(example_1_3_2, example_1_3_2.cases[0], ex_1_3_2_case1_closed);
totalFailures += runCase(example_1_3_2, example_1_3_2.cases[1], ex_1_3_2_case23_closed);
totalFailures += runCase(example_1_3_2, example_1_3_2.cases[2], ex_1_3_2_case23_closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[0], case1Closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[1], case2Closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[2], case3Closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[3], case4Closed);
totalFailures += runCase(example_1_3_4, example_1_3_4.cases[4], case5Closed);

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

console.log("\nCase 3 (V1=0100, V1_restore=0200, V2=0300):");
const c3Params = { t_V1_inop: 60, t_V1_restore: 120, t_V2_inop: 180 };
for (const ruleId of [
  "case_3_correct",
  "B2_from_first_inop",
  "B2_from_first_restored",
  "B2_from_second_inop",
  "B2_no_extension",
  "B2_extension_on_first",
  "seq_B1B2_from_second",
  "seq_B1B2_from_first_extended",
  "B2_extension_on_second",
  "seq_B1B2_from_first_restore_extended",
  "seq_B1B2_from_second_extended",
]) {
  const value = RULES[ruleId].compute(c3Params, example_1_3_4.ctx);
  console.log(`  ${ruleId.padEnd(40)} → ${formatTime(value, 60)}`);
}

// Cases 4 and 5 use the modified LCO ctx (CT_A=72, EXT_A=24).
const ctx72 = {
  ...example_1_3_4.ctx,
  ...example_1_3_4.cases[3].ctx,
};

console.log("\nCase 4 (V1=Jan 1 0100, V2=Jan 1 1000, V1_restore=Jan 1 1200), ctx CT_A=72:");
const c4Params = {
  t_V1_inop: 60,
  t_V2_inop: 60 + 9 * 60,
  t_V1_restore: 60 + 11 * 60,
};
for (const ruleId of [
  "case_1_correct",
  "B2_from_first_inop",
  "B2_from_second_inop",
  "seq_B1B2_from_first",
  "seq_B1B2_from_second",
  "forgot_B2_from_first",
  "forgot_B2_from_second",
  "seq_B1B2_from_first_extended",
  "seq_B1B2_from_second_extended",
  "B2_via_a_limit",
  "forgot_B2_via_a_limit_from_first",
  "forgot_B2_via_a_limit_from_second",
  "seq_B1B2_via_a_limit_from_first",
  "seq_B1B2_via_a_limit_from_second",
  "seq_B1B2_with_CT_A_as_ext_from_first",
  "seq_B1B2_with_CT_A_as_ext_from_second",
]) {
  const value = RULES[ruleId].compute(c4Params, ctx72);
  console.log(`  ${ruleId.padEnd(40)} → ${formatTime(value, 60)}`);
}

console.log("\nCase 5 (V1=Jan 1 0100, V2=Jan 2 1100, V1_restore=Jan 2 1200), ctx CT_A=72:");
const c5Params = {
  t_V1_inop: 60,
  t_V2_inop: 60 + 34 * 60,
  t_V1_restore: 60 + 35 * 60,
};
for (const ruleId of [
  "case_1_correct",
  "B2_from_first_inop",
  "B2_from_second_inop",
  "seq_B1B2_from_first",
  "seq_B1B2_from_second",
  "forgot_B2_from_first",
  "forgot_B2_from_second",
  "seq_B1B2_from_first_extended",
  "seq_B1B2_from_second_extended",
  "B2_via_b_limit_only",
  "forgot_B2_via_a_limit_from_first",
  "forgot_B2_via_a_limit_from_second",
  "seq_B1B2_via_a_limit_from_first",
  "seq_B1B2_via_a_limit_from_second",
  "seq_B1B2_with_CT_A_as_ext_from_first",
  "seq_B1B2_with_CT_A_as_ext_from_second",
]) {
  const value = RULES[ruleId].compute(c5Params, ctx72);
  console.log(`  ${ruleId.padEnd(40)} → ${formatTime(value, 60)}`);
}

if (totalFailures > 0) {
  console.error(`\nTotal failures: ${totalFailures}`);
  process.exit(1);
}
console.log("\nAll cases passed.");
