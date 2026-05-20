// validate.js — bulk-generate Case 1 and assert invariants.
//
// Run with: node tests/validate.js
//
// Invariants checked:
//   1. Closed-form correct answer: B.2 = min(V1+CT_A+24, V2+CT_A) + CT_B2.
//   2. Choices are strictly time-ordered A→D by instant.
//   3. No duplicate displayed values among the four choices.
//   4. Exactly four choices.
//   5. The choice flagged isCorrect matches the slot at correctSlotIndex.
//   6. Correct-slot index distribution covers all feasible positions, given
//      the case has 6 distractor rules.

import { example_1_3_4 } from "../data/example_1_3_4.js";
import { generateQuestion } from "../js/generator.js";
import { addHours, formatTime } from "../js/time.js";

const ITERATIONS = 1000;
let failures = 0;
const slotCounts = [0, 0, 0, 0];

function fail(msg, q) {
  failures++;
  console.error(`FAIL: ${msg}`);
  if (q) {
    console.error("  params:", q.params);
    console.error(
      "  choices:",
      q.choices.map((c) => ({
        label: c.label,
        displayText: c.displayText,
        instant: c.instant,
        ruleId: c.ruleId,
        isCorrect: c.isCorrect,
      })),
    );
    console.error("  correctSlotIndex:", q.correctSlotIndex);
  }
}

const exampleSpec = example_1_3_4;
const caseSpec = exampleSpec.cases[0];
const ctx = exampleSpec.ctx;

for (let i = 0; i < ITERATIONS; i++) {
  let q;
  try {
    q = generateQuestion(exampleSpec, caseSpec);
  } catch (err) {
    fail(`generator threw: ${err.message}`, null);
    continue;
  }

  // 1. closed-form correct answer
  const expectedCorrect =
    Math.min(
      addHours(q.params.t_V1_inop, ctx.CT_A + 24),
      addHours(q.params.t_V2_inop, ctx.CT_A),
    ) +
    ctx.CT_B2 * 60;
  const correctChoice = q.choices[q.correctSlotIndex];
  if (correctChoice.instant !== expectedCorrect) {
    fail(
      `correct answer mismatch: expected ${expectedCorrect}, got ${correctChoice.instant}`,
      q,
    );
  }

  // 2. choices time-ordered
  for (let j = 1; j < q.choices.length; j++) {
    if (q.choices[j].instant <= q.choices[j - 1].instant) {
      fail(`choices not strictly time-ordered at index ${j}`, q);
      break;
    }
  }

  // 3. no duplicate values
  const seen = new Set();
  let dup = false;
  for (const c of q.choices) {
    if (seen.has(c.instant)) {
      dup = true;
      break;
    }
    seen.add(c.instant);
  }
  if (dup) fail("duplicate displayed value among choices", q);

  // 4. exactly four
  if (q.choices.length !== 4) fail(`expected 4 choices, got ${q.choices.length}`, q);

  // 5. flagged isCorrect matches correctSlotIndex
  const flaggedCorrectIndex = q.choices.findIndex((c) => c.isCorrect);
  if (flaggedCorrectIndex !== q.correctSlotIndex) {
    fail(
      `isCorrect flag at index ${flaggedCorrectIndex} disagrees with correctSlotIndex ${q.correctSlotIndex}`,
      q,
    );
  }

  slotCounts[q.correctSlotIndex]++;
}

// 6. slot distribution
console.log("\nSlot distribution (correctSlotIndex over", ITERATIONS, "trials):");
console.log("  A:", slotCounts[0]);
console.log("  B:", slotCounts[1]);
console.log("  C:", slotCounts[2]);
console.log("  D:", slotCounts[3]);

if (slotCounts.some((c) => c === 0)) {
  fail(
    "at least one feasible slot was never used — either the pool is too thin or the distribution is broken",
    null,
  );
}

if (failures > 0) {
  console.error(`\n${failures} failure(s) across ${ITERATIONS} iterations.`);
  process.exit(1);
}
console.log(`\nAll ${ITERATIONS} iterations passed.`);

// Spot-check the canonical example values from the spec.
console.log("\nCanonical spot-check (V1=0100, V2=0200, V1_restore=0300):");
const spotParams = { t_V1_inop: 60, t_V2_inop: 120, t_V1_restore: 180 };
import("../js/rules.js").then(({ RULES }) => {
  for (const ruleId of [
    "case_1_correct",
    "B2_from_first_inop",
    "B2_from_second_inop",
    "B2_no_extension",
    "seq_B1B2_from_first",
    "seq_B1B2_from_second",
    "seq_B1B2_from_second_extended",
  ]) {
    const value = RULES[ruleId].compute(spotParams, ctx);
    console.log(`  ${ruleId.padEnd(36)} → ${formatTime(value, 60)}`);
  }
});
