// generator.js — assemble a question from an example + case.
//
// Pipeline:
//   1. Sample case parameters.
//   2. Compute correct answer.
//   3. Compute every distractor (filtering out anything equal to the
//      correct answer).
//   4. Partition distractors into "earlier than correct" and "later than
//      correct".
//   5. Find feasible correct-answer slot positions (a slot needs
//      ≥(pos-1) earlier and ≥(4-pos) later distractors in the pool, after
//      dedup against each other).
//   6. Pick uniformly among feasible positions.
//   7. From the earlier pool draw (pos-1) distinct distractors; from the
//      later pool draw (4-pos). Reject any sample that yields a duplicate
//      value across the chosen set; re-sample within the pool. If the pool
//      itself is exhausted, restart from step 1 (new params).
//   8. Sort each group ascending; the four ordered choices are then
//      [earlier..., correct, later...].
//
// Returns:
//   {
//     params,
//     choices: [{ label, instant, displayText, ruleId, isCorrect }],
//     correctSlotIndex,
//     minInstant,         // for date-rollover formatting
//   }

import { RULES } from "./rules.js?v=3";
import { sample } from "./sampler.js?v=3";
import { formatTime } from "./time.js?v=3";

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickN(pool, n) {
  // Returns n distinct values from pool with no duplicate `instant`s.
  const shuffled = shuffleInPlace(pool.slice());
  const out = [];
  const seen = new Set();
  for (const item of shuffled) {
    if (seen.has(item.instant)) continue;
    seen.add(item.instant);
    out.push(item);
    if (out.length === n) return out;
  }
  return null; // pool too thin
}

const SLOT_LABELS = ["A", "B", "C", "D"];

/**
 * Build a single question.
 *
 * exampleSpec: the example object from data/.
 * caseSpec: the case object from inside `exampleSpec.cases`.
 * maxOuterAttempts: budget for full re-samples of params (default 50).
 *
 * Throws if no valid question can be generated within the budget. That
 * indicates a case authoring problem (too few distractors).
 */
export function generateQuestion(exampleSpec, caseSpec, maxOuterAttempts = 50) {
  for (let attempt = 0; attempt < maxOuterAttempts; attempt++) {
    const params = sample(caseSpec.params, caseSpec.validate ?? null);
    const ctx = exampleSpec.ctx;

    const correctRule = RULES[caseSpec.correctRule];
    if (!correctRule) {
      throw new Error(`Unknown correct rule: ${caseSpec.correctRule}`);
    }
    const correctInstant = correctRule.compute(params, ctx);

    const distractorPool = [];
    for (const ruleId of caseSpec.distractorRules) {
      const rule = RULES[ruleId];
      if (!rule) throw new Error(`Unknown distractor rule: ${ruleId}`);
      const instant = rule.compute(params, ctx);
      if (instant === correctInstant) continue;
      distractorPool.push({ ruleId, instant });
    }

    // Dedupe pool first by instant so feasibility math reflects actual usable
    // values. We keep the FIRST occurrence of each instant.
    const seen = new Set();
    const dedupedPool = [];
    for (const item of distractorPool) {
      if (seen.has(item.instant)) continue;
      seen.add(item.instant);
      dedupedPool.push(item);
    }

    const earlier = dedupedPool.filter((d) => d.instant < correctInstant);
    const later = dedupedPool.filter((d) => d.instant > correctInstant);

    // Feasible slots: pos in 1..4 such that we have at least (pos-1)
    // earlier distractors and (4-pos) later distractors. Stored 0-indexed.
    const feasibleSlots = [];
    for (let pos = 1; pos <= 4; pos++) {
      if (earlier.length >= pos - 1 && later.length >= 4 - pos) {
        feasibleSlots.push(pos - 1);
      }
    }
    if (feasibleSlots.length === 0) {
      continue; // re-sample params
    }

    const correctSlotIndex =
      feasibleSlots[Math.floor(Math.random() * feasibleSlots.length)];
    const needEarlier = correctSlotIndex;
    const needLater = 3 - correctSlotIndex;

    const pickedEarlier = pickN(earlier, needEarlier);
    const pickedLater = pickN(later, needLater);
    if (
      (needEarlier > 0 && pickedEarlier === null) ||
      (needLater > 0 && pickedLater === null)
    ) {
      continue;
    }

    const earlierSorted = (pickedEarlier ?? []).slice().sort(
      (a, b) => a.instant - b.instant,
    );
    const laterSorted = (pickedLater ?? []).slice().sort(
      (a, b) => a.instant - b.instant,
    );

    const minInstant = Math.min(
      params.t_V1_inop ?? Infinity,
      ...earlierSorted.map((d) => d.instant),
      correctInstant,
      ...laterSorted.map((d) => d.instant),
    );

    const choices = [
      ...earlierSorted.map((d) => ({
        instant: d.instant,
        ruleId: d.ruleId,
        isCorrect: false,
      })),
      {
        instant: correctInstant,
        ruleId: caseSpec.correctRule,
        isCorrect: true,
      },
      ...laterSorted.map((d) => ({
        instant: d.instant,
        ruleId: d.ruleId,
        isCorrect: false,
      })),
    ];

    // Final safety: no duplicate displayed values.
    const valueSet = new Set(choices.map((c) => c.instant));
    if (valueSet.size !== choices.length) continue;

    // Add labels and formatted display text. Choices always include the
    // date so all four answers have a uniform appearance, even when the
    // earliest choice happens to fall on day 1.
    choices.forEach((c, i) => {
      c.label = SLOT_LABELS[i];
      c.displayText = formatTime(c.instant);
    });

    return {
      params,
      choices,
      correctSlotIndex,
      minInstant,
      stem: renderStem(caseSpec.stemTemplate, params, minInstant),
    };
  }

  throw new Error(
    `generator: could not assemble a valid question for case "${caseSpec.id}" ` +
      `within ${maxOuterAttempts} attempts. Likely too few distractors.`,
  );
}

/**
 * Replace {paramName} tokens in a template with the formatted value of that
 * parameter, relative to the question's earliest instant for date rollover.
 */
function renderStem(template, params, minInstant) {
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in params)) {
      throw new Error(`Stem template references unknown param: ${name}`);
    }
    return formatTime(params[name], minInstant);
  });
}
