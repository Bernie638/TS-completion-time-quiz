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

import { RULES } from "./rules.js?v=11";
import { sample } from "./sampler.js?v=11";
import { formatTime } from "./time.js?v=11";

function shuffleInPlace(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function pickN(pool, n, plausibleSet = null) {
  // Returns n distinct values from pool with no duplicate `instant`s.
  //
  // Strict priority: if `plausibleSet` is provided and non-empty, items
  // whose ruleId is in the set are tried FIRST. Non-plausible items are
  // drawn only if the plausibles can't fill the slot.
  let ordered;
  if (plausibleSet && plausibleSet.size > 0) {
    const plausible = shuffleInPlace(
      pool.filter((d) => plausibleSet.has(d.ruleId)),
    );
    const others = shuffleInPlace(
      pool.filter((d) => !plausibleSet.has(d.ruleId)),
    );
    ordered = [...plausible, ...others];
  } else {
    ordered = shuffleInPlace(pool.slice());
  }

  const out = [];
  const seen = new Set();
  for (const item of ordered) {
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
  if (caseSpec.layout === "two_column") {
    return generateTwoColumnQuestion(exampleSpec, caseSpec, maxOuterAttempts);
  }
  if (caseSpec.layout === "mode_at_time") {
    return generateModeAtTimeQuestion(exampleSpec, caseSpec, maxOuterAttempts);
  }
  return generateSingleColumnQuestion(exampleSpec, caseSpec, maxOuterAttempts);
}

function generateSingleColumnQuestion(exampleSpec, caseSpec, maxOuterAttempts) {
  // Merge ctx: case-level fields override example-level. Used for the
  // modified-LCO variants in Example 1.3-4 where Cases 4 and 5 carry
  // CT_A: 72 and EXT_A: 24 over the example defaults of 4 and 4.
  const ctx = { ...exampleSpec.ctx, ...(caseSpec.ctx ?? {}) };

  for (let attempt = 0; attempt < maxOuterAttempts; attempt++) {
    const params = sample(caseSpec.params, caseSpec.validate ?? null);

    const correctRule = RULES[caseSpec.correctRule];
    if (!correctRule) {
      throw new Error(`Unknown correct rule: ${caseSpec.correctRule}`);
    }
    const correctInstant = correctRule.compute(params, ctx);

    const plausibleSet = new Set(caseSpec.plausibleDistractors ?? []);

    const distractorPool = [];
    for (const ruleId of caseSpec.distractorRules) {
      const rule = RULES[ruleId];
      if (!rule) throw new Error(`Unknown distractor rule: ${ruleId}`);
      const instant = rule.compute(params, ctx);
      if (instant === correctInstant) continue;
      distractorPool.push({ ruleId, instant });
    }

    // Dedupe pool by instant; when two rules collide on the same value,
    // prefer the plausible variant so its explanation is the one available
    // to the learner.
    const byInstant = new Map();
    for (const item of distractorPool) {
      const existing = byInstant.get(item.instant);
      if (
        !existing ||
        (plausibleSet.has(item.ruleId) && !plausibleSet.has(existing.ruleId))
      ) {
        byInstant.set(item.instant, item);
      }
    }
    const dedupedPool = [...byInstant.values()];

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

    const pickedEarlier = pickN(earlier, needEarlier, plausibleSet);
    const pickedLater = pickN(later, needLater, plausibleSet);
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
      stem: renderStem(
        caseSpec.stemTemplate,
        params,
        minInstant,
        caseSpec.stemDateFormat,
      ),
    };
  }

  throw new Error(
    `generator: could not assemble a valid question for case "${caseSpec.id}" ` +
      `within ${maxOuterAttempts} attempts. Likely too few distractors.`,
  );
}

/**
 * Two-column layout: each choice is a paired (X, Y) tuple with X-value and
 * Y-value rendered side-by-side. The four choices form a 2x2 grid of
 * (correct/distractor X) x (correct/distractor Y). Sort order: column 0 is
 * the smaller X, column 1 the larger; within each row, smaller Y first.
 *
 * Returns:
 *   {
 *     layout: "two_column",
 *     params, stem, minInstant, correctSlotIndex,
 *     xLabel, yLabel,
 *     choices: [{ label, xText, yText, xRuleId, yRuleId,
 *                 xIsCorrect, yIsCorrect, isCorrect }, ...4 entries]
 *   }
 */
function generateTwoColumnQuestion(exampleSpec, caseSpec, maxOuterAttempts) {
  const ctx = { ...exampleSpec.ctx, ...(caseSpec.ctx ?? {}) };

  for (let attempt = 0; attempt < maxOuterAttempts; attempt++) {
    const params = sample(caseSpec.params, caseSpec.validate ?? null);

    const xCorrectRule = RULES[caseSpec.xCorrectRule];
    const yCorrectRule = RULES[caseSpec.yCorrectRule];
    if (!xCorrectRule || !yCorrectRule) {
      throw new Error(
        `two_column: missing xCorrectRule or yCorrectRule for case "${caseSpec.id}"`,
      );
    }
    const xCorrect = xCorrectRule.compute(params, ctx);
    const yCorrect = yCorrectRule.compute(params, ctx);

    const xPool = caseSpec.xDistractorRules
      .map((id) => ({ ruleId: id, instant: RULES[id].compute(params, ctx) }))
      .filter((d) => d.instant !== xCorrect);
    const yPool = caseSpec.yDistractorRules
      .map((id) => ({ ruleId: id, instant: RULES[id].compute(params, ctx) }))
      .filter((d) => d.instant !== yCorrect);

    if (xPool.length === 0 || yPool.length === 0) continue;

    const xDist = xPool[Math.floor(Math.random() * xPool.length)];
    const yDist = yPool[Math.floor(Math.random() * yPool.length)];

    // Row sorting: smaller X first.
    const xRows = xCorrect < xDist.instant
      ? [
          { instant: xCorrect, ruleId: caseSpec.xCorrectRule, isCorrect: true },
          { instant: xDist.instant, ruleId: xDist.ruleId, isCorrect: false },
        ]
      : [
          { instant: xDist.instant, ruleId: xDist.ruleId, isCorrect: false },
          { instant: xCorrect, ruleId: caseSpec.xCorrectRule, isCorrect: true },
        ];

    // Column sorting: smaller Y first.
    const yCols = yCorrect < yDist.instant
      ? [
          { instant: yCorrect, ruleId: caseSpec.yCorrectRule, isCorrect: true },
          { instant: yDist.instant, ruleId: yDist.ruleId, isCorrect: false },
        ]
      : [
          { instant: yDist.instant, ruleId: yDist.ruleId, isCorrect: false },
          { instant: yCorrect, ruleId: caseSpec.yCorrectRule, isCorrect: true },
        ];

    // Flatten the 2x2 grid into A, B, C, D (row-major: A=row0-col0,
    // B=row0-col1, C=row1-col0, D=row1-col1).
    const choices = [
      { x: xRows[0], y: yCols[0] },
      { x: xRows[0], y: yCols[1] },
      { x: xRows[1], y: yCols[0] },
      { x: xRows[1], y: yCols[1] },
    ];

    const correctSlotIndex = choices.findIndex(
      (c) => c.x.isCorrect && c.y.isCorrect,
    );

    choices.forEach((c, i) => {
      c.label = SLOT_LABELS[i];
      c.xText = formatTime(c.x.instant);
      c.yText = formatTime(c.y.instant);
      c.xRuleId = c.x.ruleId;
      c.yRuleId = c.y.ruleId;
      c.xIsCorrect = c.x.isCorrect;
      c.yIsCorrect = c.y.isCorrect;
      c.isCorrect = c.x.isCorrect && c.y.isCorrect;
      // Drop the internal x/y refs; ui.js reads xText/yText/etc.
      delete c.x;
      delete c.y;
    });

    const minInstant = Math.min(xCorrect, xDist.instant, yCorrect, yDist.instant);

    return {
      layout: "two_column",
      params,
      choices,
      correctSlotIndex,
      minInstant,
      xLabel: caseSpec.xLabel ?? "(X)",
      yLabel: caseSpec.yLabel ?? "(Y)",
      stem: renderStem(
        caseSpec.stemTemplate,
        params,
        minInstant,
        caseSpec.stemDateFormat,
      ),
    };
  }

  throw new Error(
    `generator: could not assemble a two-column question for case "${caseSpec.id}"`,
  );
}

/**
 * mode_at_time layout. Each case defines a `modeTimeline(params, ctx)`
 * function returning an array of segments:
 *   [
 *     { mode, fromTime, transitionReason },
 *     ...
 *   ]
 * The first segment's `fromTime` is the earliest meaningful T for the
 * question; the segment's `mode` is what's required from there until the
 * next segment's `fromTime`. `transitionReason` is the human-readable
 * reason that mode begins (used in explanations).
 *
 * The engine picks a target segment uniformly and samples a whole-hour
 * query time uniformly within its [fromTime, nextFromTime) bucket. The
 * final segment is capped at `caseSpec.finalSegmentMaxHours` (default 48).
 *
 * Returns:
 *   {
 *     layout: "mode_at_time",
 *     params, queryTime, timeline, targetIndex,
 *     correctSlotIndex,
 *     choices: [{ label, mode, displayText, isCorrect }, ...4 entries],
 *     minInstant, stem,
 *   }
 */
function generateModeAtTimeQuestion(exampleSpec, caseSpec, maxOuterAttempts) {
  const ctx = { ...exampleSpec.ctx, ...(caseSpec.ctx ?? {}) };
  const finalCapHours = caseSpec.finalSegmentMaxHours ?? 48;
  const MODES = [1, 3, 4, 5];

  for (let attempt = 0; attempt < maxOuterAttempts; attempt++) {
    const params = sample(caseSpec.params, caseSpec.validate ?? null);
    const timeline = caseSpec.modeTimeline(params, ctx);

    if (!Array.isArray(timeline) || timeline.length === 0) {
      throw new Error(
        `mode_at_time: empty modeTimeline for case "${caseSpec.id}"`,
      );
    }

    // Pick a target segment uniformly.
    const targetIndex = Math.floor(Math.random() * timeline.length);
    const targetSegment = timeline[targetIndex];

    // Validate target mode is one of the displayed choices.
    if (!MODES.includes(targetSegment.mode)) {
      throw new Error(
        `mode_at_time: target mode ${targetSegment.mode} not in {1,3,4,5}`,
      );
    }

    // Compute sampling window for target segment.
    const startMin = targetSegment.fromTime;
    let endMin;
    if (targetIndex < timeline.length - 1) {
      endMin = timeline[targetIndex + 1].fromTime;
    } else {
      endMin = startMin + finalCapHours * 60;
    }

    // Need at least 1 hour of room.
    if (endMin - startMin < 60) continue;

    // Whole-hour T uniformly in [startMin, endMin).
    const hourCount = Math.floor((endMin - startMin) / 60);
    const queryTime = startMin + Math.floor(Math.random() * hourCount) * 60;

    const choices = MODES.map((mode, i) => ({
      label: SLOT_LABELS[i],
      mode,
      displayText: `MODE ${mode}`,
      isCorrect: mode === targetSegment.mode,
    }));
    const correctSlotIndex = choices.findIndex((c) => c.isCorrect);

    const minInstant = Math.min(
      queryTime,
      ...timeline.map((s) => s.fromTime),
    );

    const stem = renderStem(
      caseSpec.stemTemplate,
      { ...params, t_queryTime: queryTime },
      minInstant,
      caseSpec.stemDateFormat,
    );

    return {
      layout: "mode_at_time",
      params,
      queryTime,
      timeline,
      targetIndex,
      choices,
      correctSlotIndex,
      minInstant,
      stem,
    };
  }

  throw new Error(
    `generator: mode_at_time question failed for case "${caseSpec.id}" within ${maxOuterAttempts} attempts.`,
  );
}

/**
 * Replace {paramName} tokens in a template with the formatted value of that
 * parameter.
 *
 * dateFormat:
 *   "auto" (default): same-day timestamps render as HHMM, only show date
 *                     label on rollover (relative to minInstant).
 *   "always":         every timestamp renders as "Month Day at HHMM" — used
 *                     for multi-day cases where date is always meaningful.
 */
function renderStem(template, params, minInstant, dateFormat = "auto") {
  const reference = dateFormat === "always" ? null : minInstant;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    if (!(name in params)) {
      throw new Error(`Stem template references unknown param: ${name}`);
    }
    return formatTime(params[name], reference);
  });
}
