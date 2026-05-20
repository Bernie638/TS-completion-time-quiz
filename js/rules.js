// rules.js — named correct-answer and distractor rules.
//
// Each rule is registered by id and has:
//   compute(params, ctx) → instant
//   explain(params, ctx) → string  // shown in the Explanation tab
//
// `ctx` carries the example-level constants (e.g. Condition A Completion
// Time, B.1 and B.2 hours from the LCO table).
//
// For Example 1.3-4 cases 1-5 the LCO has:
//   CT_A = 4 hours (Condition A: restore valve)
//   CT_B1 = 6 hours (B.1: Be in MODE 3)
//   CT_B2 = 12 hours (B.2: Be in MODE 4)
//
// All B.x Completion Times run from entry to Condition B (i.e. from the
// moment the Condition A Completion Time expires). Per TS 1.3-1 each Required
// Action under Condition B has its own clock starting at Condition B entry,
// so reaching MODE 4 is "Condition B entry + 12 hours", NOT "B.1 + B.2"
// sequential.

import { addHours, formatTime } from "./time.js?v=5";

// --- helpers ---------------------------------------------------------------

/**
 * Earliest time Condition A Completion Time can expire under TS 1.3
 * extension rules, when V1 and V2 are both inoperable concurrently, V1 is
 * restored first, and V2 remains inoperable after V1 is restored.
 *
 * TS 1.3 limits the total Completion Time to the MORE RESTRICTIVE of:
 *   (a) stated CT measured from initial entry, plus 24 hours
 *   (b) stated CT measured from discovery of the subsequent inoperability
 */
function conditionAExpiryWithExtension(params, ctx) {
  const fromInitialPlus24 = addHours(params.t_V1_inop, ctx.CT_A + 24);
  const fromSubsequent = addHours(params.t_V2_inop, ctx.CT_A);
  return Math.min(fromInitialPlus24, fromSubsequent);
}

// --- rule registry ---------------------------------------------------------

export const RULES = {};

function register(id, compute, explain) {
  RULES[id] = { id, compute, explain };
}

// ---------------- CORRECT RULE -----------------

register(
  "case_1_correct",
  (p, ctx) => {
    const condBEntry = conditionAExpiryWithExtension(p, ctx);
    return addHours(condBEntry, ctx.CT_B2);
  },
  (p, ctx) => {
    const minDate = p.t_V1_inop;
    const condBEntry = conditionAExpiryWithExtension(p, ctx);
    const fromInitialPlus24 = addHours(p.t_V1_inop, ctx.CT_A + 24);
    const fromSubsequent = addHours(p.t_V2_inop, ctx.CT_A);
    const limit =
      fromInitialPlus24 <= fromSubsequent
        ? `initial entry + ${ctx.CT_A} hr + 24 hr extension = ${formatTime(fromInitialPlus24, minDate)}`
        : `subsequent inoperability + ${ctx.CT_A} hr = ${formatTime(fromSubsequent, minDate)}`;
    return (
      `Both valves are inoperable concurrently and V1 (the first) is restored ` +
      `while V2 (the subsequent) remains inoperable, so the TS 1.3 Completion ` +
      `Time extension applies. The extension is limited to the more restrictive ` +
      `of (a) stated CT from initial entry into Condition A plus 24 hours, or ` +
      `(b) stated CT measured from discovery of the subsequent inoperability. ` +
      `Here the limit is ${limit}, so Condition B is entered at ` +
      `${formatTime(condBEntry, minDate)} and B.2 (MODE 4 in ${ctx.CT_B2} hr) ` +
      `is required by ${formatTime(addHours(condBEntry, ctx.CT_B2), minDate)}.`
    );
  },
);

// ---------------- DISTRACTORS ------------------

register(
  "B2_from_first_inop",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_B2),
  (p, ctx) =>
    `Incorrectly starts the B.2 (MODE 4) clock at the first inoperability ` +
    `(${formatTime(p.t_V1_inop, p.t_V1_inop)}) instead of at entry to ` +
    `Condition B. B.2's Completion Time begins when Condition B is entered, ` +
    `not when the LCO was first not met.`,
);

register(
  "B2_from_second_inop",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_B2),
  (p, ctx) =>
    `Incorrectly starts the B.2 clock at the second inoperability ` +
    `(${formatTime(p.t_V2_inop, p.t_V1_inop)}). B.2's clock begins at entry ` +
    `to Condition B, which only occurs after the Condition A Completion ` +
    `Time (with any applicable extension) expires.`,
);

register(
  "B2_no_extension",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Treats Condition A as expiring at the initial entry plus the stated ` +
    `${ctx.CT_A} hr Completion Time, ignoring the extension allowance for ` +
    `the subsequent inoperability. The TS 1.3 extension applies here because ` +
    `V1 and V2 were inoperable concurrently and V2 remains inoperable after ` +
    `V1 is restored.`,
);

register(
  "seq_B1B2_from_first",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Treats B.1 and B.2 as sequential (${ctx.CT_B1} hr + ${ctx.CT_B2} hr = ` +
    `${ctx.CT_B1 + ctx.CT_B2} hr) starting at the first inoperability. ` +
    `Per TS 1.3-1, each Required Action under Condition B has its own ` +
    `Completion Time referenced from entry to Condition B, so the times are ` +
    `not added together.`,
);

register(
  "seq_B1B2_from_second",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Treats B.1 and B.2 as sequential starting at the second inoperability. ` +
    `B.1 and B.2 are not additive — each runs from entry to Condition B — ` +
    `and Condition B does not start at the second inoperability.`,
);

register(
  "seq_B1B2_from_second_extended",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Adds the stated Condition A Completion Time to the second inoperability ` +
    `time and then sequences B.1 + B.2. This double-applies the extension ` +
    `interpretation and treats B.1 + B.2 as additive when they are not.`,
);

// ---------------- CASE 2 ADDITIONS -------------
// Case 2: V2 (subsequent) is restored BEFORE V1 (first), so the TS 1.3
// extension criterion (b) "must remain inoperable after the first is
// resolved" is not met. The extension does not apply.

register(
  "case_2_correct",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) => {
    const minDate = p.t_V1_inop;
    const condBEntry = addHours(p.t_V1_inop, ctx.CT_A);
    return (
      `V2 (the subsequent inoperability) is restored before V1 (the first), ` +
      `so TS 1.3 extension criterion (b) — "the subsequent inoperability must ` +
      `remain inoperable after the first is resolved" — is not met. No ` +
      `extension applies. Condition A's Completion Time runs from initial ` +
      `entry at ${formatTime(p.t_V1_inop, minDate)} for the stated ` +
      `${ctx.CT_A} hr, expiring at ${formatTime(condBEntry, minDate)}. ` +
      `Condition B is entered at that point and B.2 (MODE 4 in ${ctx.CT_B2} ` +
      `hr) is required by ${formatTime(addHours(condBEntry, ctx.CT_B2), minDate)}.`
    );
  },
);

register(
  "B2_from_second_restored",
  (p, ctx) => addHours(p.t_V2_restore, ctx.CT_B2),
  (p, ctx) =>
    `Incorrectly starts the B.2 clock when the second valve is restored to ` +
    `OPERABLE status (${formatTime(p.t_V2_restore, p.t_V1_inop)}). Restoring ` +
    `a subsequent inop does not start any clock; the relevant clock is ` +
    `Condition A, which has been running since the initial entry.`,
);

register(
  "restart_A_at_second_inop",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Treats the second inoperability as restarting (or separately entering) ` +
    `Condition A. Per TS 1.3, subsequent inoperabilities within the same ` +
    `Condition do not cause re-entry; the Condition A clock continues from ` +
    `the initial entry at ${formatTime(p.t_V1_inop, p.t_V1_inop)}.`,
);

register(
  "restart_A_at_second_restore",
  (p, ctx) => addHours(p.t_V2_restore, ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Treats the restoration of the second valve as restarting the ` +
    `Condition A clock. Restoring a subsequent inop has no effect on the ` +
    `Condition A clock — it continues to run from the initial entry at ` +
    `${formatTime(p.t_V1_inop, p.t_V1_inop)}.`,
);

// ---------------- CASE 3 ADDITIONS -------------
// Case 3: V1 is restored BEFORE V2 becomes inoperable. V1 and V2 are never
// concurrently inoperable, so V2 is a FRESH entry into Condition A — not a
// "subsequent" inop. No extension applies. Condition A's clock for V2 runs
// from V2 inop, and B.2 is required CT_B2 hours after that clock expires.
//
// The Example-specific 4-hour extension allowance is stored on ctx as
// EXT_A so distractor rules can reference it without hard-coding 4.

register(
  "case_3_correct",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) => {
    const minDate = p.t_V1_inop;
    const condAExpiry = addHours(p.t_V2_inop, ctx.CT_A);
    return (
      `V1 was restored at ${formatTime(p.t_V1_restore, minDate)} — before ` +
      `V2 became inoperable at ${formatTime(p.t_V2_inop, minDate)} — so V1 ` +
      `and V2 are never concurrently inoperable. V2 is therefore a FRESH ` +
      `entry into Condition A, not a "subsequent" inop, and no extension ` +
      `applies. Condition A's clock for V2 runs the stated ${ctx.CT_A} hr ` +
      `from ${formatTime(p.t_V2_inop, minDate)}, expiring at ` +
      `${formatTime(condAExpiry, minDate)}. Condition B is entered then and ` +
      `B.2 (MODE 4 in ${ctx.CT_B2} hr) is required by ` +
      `${formatTime(addHours(condAExpiry, ctx.CT_B2), minDate)}.`
    );
  },
);

register(
  "B2_from_first_restored",
  (p, ctx) => addHours(p.t_V1_restore, ctx.CT_B2),
  (p, ctx) =>
    `Incorrectly starts the B.2 clock at the time the first valve was ` +
    `restored to OPERABLE status (${formatTime(p.t_V1_restore, p.t_V1_inop)}). ` +
    `Restoring V1 exits Condition A; it does not start any clock. The ` +
    `relevant clock for B.2 is Condition B, which begins only after the ` +
    `Condition A Completion Time expires.`,
);

register(
  "B2_extension_on_first",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.EXT_A + ctx.CT_B2),
  (p, ctx) =>
    `Applies the Example 1.3-4 "up to ${ctx.EXT_A} hr" extension to V1's ` +
    `Condition A clock, extending it to ${ctx.CT_A + ctx.EXT_A} hours from ` +
    `V1 inop. The extension only applies when there is a subsequent ` +
    `inoperability concurrent with the first; here V1 was already restored ` +
    `when V2 became inoperable, so the extension does not apply to V1.`,
);

register(
  "seq_B1B2_from_first_extended",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Treats B.1 and B.2 as sequential after V1's Condition A Completion ` +
    `Time expires. Two errors: (1) per TS 1.3-1, B.1 and B.2 are not ` +
    `additive — each runs from entry to Condition B; (2) V1 was restored ` +
    `before its Condition A clock expired, so this Condition A path never ` +
    `actually led to Condition B.`,
);

register(
  "B2_extension_on_second",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.EXT_A + ctx.CT_B2),
  (p, ctx) =>
    `Applies the Example 1.3-4 "up to ${ctx.EXT_A} hr" extension to V2's ` +
    `Condition A clock. The extension requires a subsequent inoperability ` +
    `concurrent with the first; here V2 is a fresh entry into Condition A, ` +
    `not a subsequent inop, so no extension applies.`,
);

register(
  "seq_B1B2_from_first_restore_extended",
  (p, ctx) => addHours(p.t_V1_restore, ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Treats V1's restoration time as the start of a Condition A clock, ` +
    `then sequences B.1 + B.2. Restoring V1 exits Condition A; it does not ` +
    `begin any clock. The relevant clock is the fresh Condition A entry ` +
    `triggered by V2 inop at ${formatTime(p.t_V2_inop, p.t_V1_inop)}.`,
);
