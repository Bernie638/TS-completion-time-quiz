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

import { addHours, formatTime } from "./time.js?v=12";

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

// ---------------- CASES 4 & 5 ADDITIONS --------
// These cases use the modified Example 1.3-4 LCO with Condition A's stated
// Completion Time = 72 hours. The TS 1.3 extension cap of +24 hours from
// initial entry becomes the relevant limit; the "more restrictive of" rule
// in TS 1.3 selects between (a) initial + CT_A + 24 and (b) subsequent +
// CT_A. Case 4 (V2 within 24 hr of V1) → (b) wins. Case 5 (V2 > 24 hr after
// V1) → (a) wins.
//
// case_1_correct already implements min(a, b) + CT_B2 and is reused as the
// correct rule for both Case 4 and Case 5. The new rules below populate
// the distractor pool with the common conceptual errors specific to the
// 72-hr variant.

register(
  "forgot_B2_from_first",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A),
  (p, ctx) =>
    `Reports V1's Condition A completion time (${ctx.CT_A} hr after V1 ` +
    `inop) and forgets that the question asks for MODE 4, not Condition A ` +
    `expiry. B.2 adds ${ctx.CT_B2} more hours after entry to Condition B.`,
);

register(
  "forgot_B2_from_second",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A),
  (p, ctx) =>
    `Reports V2's Condition A completion time (${ctx.CT_A} hr after V2 ` +
    `inop) and forgets that the question asks for MODE 4, not Condition A ` +
    `expiry. B.2 adds ${ctx.CT_B2} more hours after entry to Condition B.`,
);

register(
  "B2_via_a_limit",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + 24 + ctx.CT_B2),
  (p, ctx) => {
    const minDate = p.t_V1_inop;
    return (
      `Applies the TS 1.3 (a) limit — initial entry + CT_A + 24 hours = ` +
      `${formatTime(addHours(p.t_V1_inop, ctx.CT_A + 24), minDate)} — and ` +
      `then adds B.2 (${ctx.CT_B2} hr). This is the correct answer when ` +
      `(a) is more restrictive than (b), but a distractor when (b) is more ` +
      `restrictive.`
    );
  },
);

register(
  "B2_via_b_limit_only",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) => {
    const minDate = p.t_V1_inop;
    return (
      `Applies only the TS 1.3 (b) limit — subsequent + CT_A = ` +
      `${formatTime(addHours(p.t_V2_inop, ctx.CT_A), minDate)} — without ` +
      `checking the (a) cap (initial + CT_A + 24 hr). When V2 is more than ` +
      `24 hours after V1, the (a) limit is more restrictive and bounds the ` +
      `Completion Time before (b) would.`
    );
  },
);

register(
  "forgot_B2_via_a_limit_from_first",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + 24),
  (p, ctx) =>
    `Reports the TS 1.3 (a) limit (V1 + CT_A + 24 hr) and forgets that ` +
    `the question asks for MODE 4. B.2 adds ${ctx.CT_B2} more hours.`,
);

register(
  "forgot_B2_via_a_limit_from_second",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + 24),
  (p, ctx) =>
    `Adds the 24-hour extension to V2's clock (V2 + CT_A + 24) and forgets ` +
    `B.2. The 24-hour cap applies from INITIAL entry into Condition A (V1 ` +
    `inop), not from the subsequent inoperability.`,
);

register(
  "seq_B1B2_via_a_limit_from_first",
  (p, ctx) =>
    addHours(p.t_V1_inop, ctx.CT_A + 24 + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Applies the (a) limit then sequences B.1 + B.2 (${ctx.CT_B1} hr + ` +
    `${ctx.CT_B2} hr) additively. Per TS 1.3-1, B.1 and B.2 each run from ` +
    `entry to Condition B; they are not added.`,
);

register(
  "seq_B1B2_via_a_limit_from_second",
  (p, ctx) =>
    addHours(p.t_V2_inop, ctx.CT_A + 24 + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Adds the 24-hour extension to V2's clock and then sequences B.1 + ` +
    `B.2. Two errors: (1) the 24-hour extension cap is measured from V1 ` +
    `(initial entry), not V2; (2) B.1 and B.2 are concurrent, not additive.`,
);

register(
  "seq_B1B2_with_CT_A_as_ext_from_first",
  (p, ctx) =>
    addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Misinterprets "extension" as another full stated Completion Time ` +
    `(${ctx.CT_A} hr), then sequences B.1 + B.2. The TS 1.3 extension is ` +
    `capped at 24 hours from initial entry, not another ${ctx.CT_A} hours.`,
);

register(
  "seq_B1B2_with_CT_A_as_ext_from_second",
  (p, ctx) =>
    addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Misinterprets "extension" as another full stated Completion Time ` +
    `applied to V2, then sequences B.1 + B.2. The extension is 24 hours ` +
    `from V1 (initial entry), not another ${ctx.CT_A} hours from V2.`,
);

// ---------------- EXAMPLE 1.3-1 RULES ----------
// LCO has only Condition B with B.1 (MODE 3, 6 hr) AND B.2 (MODE 5, 36 hr).
// Both Completion Times are measured from entry into Condition B, not
// sequentially. Parameter: t_condB_entry.

register(
  "mode_3_correct",
  (p) => addHours(p.t_condB_entry, 6),
  (p) =>
    `B.1 requires the plant to be in MODE 3 within 6 hours of entry into ` +
    `Condition B. Condition B was entered at ` +
    `${formatTime(p.t_condB_entry)}, so MODE 3 is required by ` +
    `${formatTime(addHours(p.t_condB_entry, 6))}.`,
);

register(
  "mode_5_correct",
  (p) => addHours(p.t_condB_entry, 36),
  (p) =>
    `B.2 requires the plant to be in MODE 5 within 36 hours of entry into ` +
    `Condition B. The 36-hour clock runs from Condition B entry — not ` +
    `from when MODE 3 was reached — so B.1 and B.2 are not additive. ` +
    `Condition B was entered at ${formatTime(p.t_condB_entry)}, so MODE 5 ` +
    `is required by ${formatTime(addHours(p.t_condB_entry, 36))}.`,
);

// Generic entry-offset distractors used by 1.3-1 cases. Each represents a
// plausible misreading or arithmetic error against entry into Condition B.

register(
  "entry_plus_0",
  (p) => p.t_condB_entry,
  () =>
    `Treats the Required Action as required immediately upon entering ` +
    `Condition B. B.1 and B.2 each have a stated Completion Time.`,
);

register(
  "entry_plus_3",
  (p) => addHours(p.t_condB_entry, 3),
  () =>
    `Halves the 6-hour Completion Time of B.1. The full stated Completion ` +
    `Time is the deadline, not half of it.`,
);

register(
  "entry_plus_6",
  (p) => addHours(p.t_condB_entry, 6),
  () =>
    `Uses 6 hours from Condition B entry. That is B.1's Completion Time ` +
    `(MODE 3), not B.2's (MODE 5).`,
);

register(
  "entry_plus_12",
  (p) => addHours(p.t_condB_entry, 12),
  () =>
    `Uses 12 hours from Condition B entry. Neither B.1 (6 hr) nor B.2 ` +
    `(36 hr) has a 12-hour Completion Time.`,
);

register(
  "entry_plus_18",
  (p) => addHours(p.t_condB_entry, 18),
  () =>
    `Treats B.1 and B.2 as sequential (6 hr + 12 hr) or otherwise picks ` +
    `18 hours from entry. Both Completion Times are measured from ` +
    `Condition B entry, not added together.`,
);

register(
  "entry_plus_30",
  (p) => addHours(p.t_condB_entry, 30),
  () =>
    `Uses 30 hours from Condition B entry — perhaps subtracting B.1's ` +
    `6 hours from B.2's 36 hours. B.2's clock runs from Condition B ` +
    `entry, not from the moment MODE 3 is reached.`,
);

register(
  "entry_plus_36",
  (p) => addHours(p.t_condB_entry, 36),
  () =>
    `Uses 36 hours from Condition B entry. That is B.2's Completion Time ` +
    `(MODE 5), not B.1's (MODE 3).`,
);

register(
  "entry_plus_42",
  (p) => addHours(p.t_condB_entry, 42),
  () =>
    `Treats B.1 and B.2 as sequential: 6 hours to MODE 3 plus 36 hours ` +
    `to MODE 5 = 42 hours. Per TS 1.3-1, both Completion Times run from ` +
    `entry into Condition B, so they are NOT additive.`,
);

register(
  "entry_plus_48",
  (p) => addHours(p.t_condB_entry, 48),
  () =>
    `Uses 48 hours from Condition B entry. Neither B.1 nor B.2 has a ` +
    `48-hour Completion Time, and B.1 + B.2 sequentially is 42 hr, not 48.`,
);

// ---------------- EXAMPLE 1.3-2 RULES ----------
// LCO: Cond A = One pump inoperable, restore in 7 days; Cond B = MODE 3 in
// 6 hr AND MODE 5 in 36 hr. When a SECOND pump goes inop while pump 1 is
// still inop, the LCO has no Condition for two inops, so LCO 3.0.3 is
// entered (a: MODE 3 in 7 hr, b: MODE 4 in 13 hr, c: MODE 5 in 37 hr —
// all measured from LCO 3.0.3 entry = the second pump's inop time).
//
// Critical pedagogy: the TS 1.3 +24-hr extension does NOT apply to this
// example, because Condition A is "One pump inoperable" (singular) — there
// is no "or more" allowing the Condition to cover subsequent inops. That's
// why LCO 3.0.3 is required in the first place.
//
// Parameters: t_V1_inop (fixed Jan 1 0100), t_V2_inop (random within Cond
// A window), and for Cases 2/3 either t_V1_restore or t_V2_restore.

// Constants in hours.
const CT_A_1_3_2 = 168; // 7 days
const CT_B1_1_3_2 = 6;
const CT_B2_1_3_2 = 36; // MODE 5 (not MODE 4 as in 1.3-4)
const LCO_303_A = 7; // MODE 3 within 7 hr of LCO 3.0.3 entry
const LCO_303_B = 13; // MODE 4 within 13 hr
const LCO_303_C = 37; // MODE 5 within 37 hr
const EXTENSION_24 = 24;

// ---- Case 1 correct -----
register(
  "lco_303c_from_second",
  (p) => addHours(p.t_V2_inop, LCO_303_C),
  (p) =>
    `When the second pump is declared INOPERABLE while pump 1 is still ` +
    `inoperable, the LCO has no Condition covering two simultaneous ` +
    `inoperable pumps, so LCO 3.0.3 is entered. LCO 3.0.3.c requires ` +
    `MODE 5 within ${LCO_303_C} hours of LCO 3.0.3 entry (the second ` +
    `pump's inop time at ${formatTime(p.t_V2_inop)}). MODE 5 is therefore ` +
    `required by ${formatTime(addHours(p.t_V2_inop, LCO_303_C))}.`,
);

// ---- Cases 2 & 3 correct -----
register(
  "condA_plus_B2_from_first",
  (p) => addHours(p.t_V1_inop, CT_A_1_3_2 + CT_B2_1_3_2),
  (p) =>
    `Once a pump is restored to OPERABLE status, only one pump is ` +
    `inoperable again — LCO 3.0.3 is exited and Condition A continues. ` +
    `Per TS 1.3-2, the Condition A clock is NOT reset; it continues from ` +
    `pump 1's inop time at ${formatTime(p.t_V1_inop)}. No +24 hour ` +
    `extension is available — Condition A reads "One pump inoperable" ` +
    `(singular), so there is no provision allowing the Condition to cover ` +
    `subsequent inops, which is why LCO 3.0.3 was required in the first ` +
    `place. Condition A expires ${CT_A_1_3_2} hr after pump 1's inop ` +
    `at ${formatTime(addHours(p.t_V1_inop, CT_A_1_3_2))}; Condition B is ` +
    `then entered, and B.2 requires MODE 5 within ${CT_B2_1_3_2} more ` +
    `hours, so MODE 5 is required by ` +
    `${formatTime(addHours(p.t_V1_inop, CT_A_1_3_2 + CT_B2_1_3_2))}.`,
);

// ---- Distractors anchored on the FIRST pump's inop ------------------

register(
  "B2_from_first_no_condA",
  (p) => addHours(p.t_V1_inop, CT_B2_1_3_2),
  () =>
    `Treats B.2 (MODE 5 in 36 hr) as running from pump 1's inop time. ` +
    `B.2 only applies after Condition B is entered (which only happens ` +
    `after Condition A's 7-day Completion Time expires).`,
);

register(
  "lco_303c_from_first",
  (p) => addHours(p.t_V1_inop, LCO_303_C),
  () =>
    `Applies LCO 3.0.3.c from pump 1's inop time. LCO 3.0.3 is not ` +
    `entered when a single pump is inoperable — Condition A covers that ` +
    `case. LCO 3.0.3 is entered when the SECOND pump is declared inop.`,
);

register(
  "condA_plus_B1_from_first",
  (p) => addHours(p.t_V1_inop, CT_A_1_3_2 + CT_B1_1_3_2),
  () =>
    `Reports the B.1 (MODE 3) deadline instead of B.2 (MODE 5). The ` +
    `question asks for MODE 5, which has B.2's 36-hr Completion Time, ` +
    `not B.1's 6 hr.`,
);

register(
  "condA_plus_303a_from_first",
  (p) => addHours(p.t_V1_inop, CT_A_1_3_2 + LCO_303_A),
  () =>
    `Applies LCO 3.0.3.a (MODE 3 in 7 hr) starting at Condition A's ` +
    `expiry. Two errors: (1) the question asks for MODE 5, not MODE 3; ` +
    `and (2) LCO 3.0.3 was entered when the SECOND pump became inoperable, ` +
    `not when Condition A's clock ran out.`,
);

register(
  "condA_plus_303b_from_first",
  (p) => addHours(p.t_V1_inop, CT_A_1_3_2 + LCO_303_B),
  () =>
    `Applies LCO 3.0.3.b (MODE 4 in 13 hr) starting at Condition A's ` +
    `expiry. The question asks for MODE 5, not MODE 4, and LCO 3.0.3 ` +
    `was entered at the second pump's inop time, not at Condition A's ` +
    `expiry.`,
);

register(
  "condA_plus_303c_from_first",
  (p) => addHours(p.t_V1_inop, CT_A_1_3_2 + LCO_303_C),
  () =>
    `Applies LCO 3.0.3.c (MODE 5 in 37 hr) starting at Condition A's ` +
    `expiry. LCO 3.0.3 was entered at the SECOND pump's inop time, not ` +
    `when Condition A expired.`,
);

register(
  "condA_plus_seq_B1B2_from_first",
  (p) =>
    addHours(p.t_V1_inop, CT_A_1_3_2 + CT_B1_1_3_2 + CT_B2_1_3_2),
  () =>
    `Treats B.1 and B.2 as sequential (6 hr to MODE 3, then 36 hr to ` +
    `MODE 5) after Condition A expires. Per TS 1.3-1, both B.1 and B.2 ` +
    `Completion Times run from entry to Condition B — they are not added ` +
    `together.`,
);

register(
  "condA_plus_24_extension_plus_B2_from_first",
  (p) =>
    addHours(p.t_V1_inop, CT_A_1_3_2 + EXTENSION_24 + CT_B2_1_3_2),
  () =>
    `Applies a 24-hour extension to Condition A's Completion Time, then ` +
    `B.2 from there. The TS 1.3 extension only applies to Conditions ` +
    `that accept "one or more" components (as in Example 1.3-4). Example ` +
    `1.3-2's Condition A is "One pump inoperable" — singular — so no ` +
    `extension is available here.`,
);

register(
  "condA_plus_seven_day_extension_plus_B2_from_first",
  (p) =>
    addHours(p.t_V1_inop, CT_A_1_3_2 + CT_A_1_3_2 + CT_B2_1_3_2),
  () =>
    `Applies a 7-day "extension" (= a second full Condition A Completion ` +
    `Time) before B.2. Wrong on two counts: TS 1.3 extensions are capped ` +
    `at 24 hours, and no extension applies to Example 1.3-2 at all (the ` +
    `LCO doesn't permit it).`,
);

// ---- Distractors anchored on the SECOND pump's inop -----------------

register(
  "B2_from_second_no_condA",
  (p) => addHours(p.t_V2_inop, CT_B2_1_3_2),
  () =>
    `Treats B.2 (MODE 5 in 36 hr) as running from the second pump's inop ` +
    `time. B.2 only applies after Condition B is entered; Condition B is ` +
    `not directly relevant once LCO 3.0.3 is in effect.`,
);

register(
  "lco_303a_from_second",
  (p) => addHours(p.t_V2_inop, LCO_303_A),
  () =>
    `Reports LCO 3.0.3.a (MODE 3 in 7 hr). The question asks for MODE 5, ` +
    `not MODE 3. Stopping at MODE 3 leaves the plant in a condition where ` +
    `the LCO is still applicable.`,
);

register(
  "lco_303b_from_second",
  (p) => addHours(p.t_V2_inop, LCO_303_B),
  () =>
    `Reports LCO 3.0.3.b (MODE 4 in 13 hr). The question asks for MODE 5, ` +
    `not MODE 4. The plant must continue cooling down past MODE 4 to ` +
    `exit the LCO's applicability.`,
);

register(
  "lco_303_sequential_from_second",
  (p) => addHours(p.t_V2_inop, LCO_303_A + LCO_303_B + LCO_303_C),
  () =>
    `Treats LCO 3.0.3's three sub-Completion Times as sequential ` +
    `(7 + 13 + 37 = 57 hr). Each sub-Completion Time is measured ` +
    `independently from LCO 3.0.3 entry, NOT from the completion of the ` +
    `previous one; they are not additive.`,
);

register(
  "condA_plus_B1_from_second",
  (p) => addHours(p.t_V2_inop, CT_A_1_3_2 + CT_B1_1_3_2),
  () =>
    `Treats the second pump's inop as the start of a fresh Condition A ` +
    `clock, then reports B.1 (MODE 3). Per TS 1.3, subsequent inops do ` +
    `not start a new Condition A clock; the clock continues from the ` +
    `original entry. (And the question asks for MODE 5, not MODE 3.)`,
);

register(
  "condA_plus_B2_from_second",
  (p) => addHours(p.t_V2_inop, CT_A_1_3_2 + CT_B2_1_3_2),
  () =>
    `Treats the second pump's inop as the start of a fresh Condition A ` +
    `clock, then adds B.2. Per TS 1.3, subsequent inops within the same ` +
    `Condition continue with the original Condition's clock — they don't ` +
    `start a new one. And because Condition A here is "One pump" only, ` +
    `the second pump cannot be in Condition A at all — LCO 3.0.3 is what ` +
    `applies.`,
);

register(
  "condA_plus_303c_from_second",
  (p) => addHours(p.t_V2_inop, CT_A_1_3_2 + LCO_303_C),
  () =>
    `Treats the second pump as starting a fresh Condition A clock, then ` +
    `applies LCO 3.0.3.c after that. Neither is right: subsequent inops ` +
    `don't restart Condition A, and LCO 3.0.3 is entered immediately ` +
    `when the second pump fails (at ${"`"}V2_inop${"`"}), not 7 days later.`,
);

register(
  "condA_plus_seq_B1B2_from_second",
  (p) =>
    addHours(p.t_V2_inop, CT_A_1_3_2 + CT_B1_1_3_2 + CT_B2_1_3_2),
  () =>
    `Treats the second pump as starting a fresh Condition A clock AND ` +
    `treats B.1 + B.2 as additive. Two errors: subsequent inops continue ` +
    `the original Cond A clock, and B.1 + B.2 are not sequential.`,
);

// ---------------- EXAMPLE 1.3-3 RULES ----------
// LCO: Three Conditions tracked INDEPENDENTLY by entry time.
//   A. One Function X train inoperable.  CT = 7 days  (clock from V_X inop)
//   B. One Function Y train inoperable.  CT = 72 hr   (clock from V_Y inop)
//   C. One X AND one Y train inoperable. CT = 48 hr  (MODIFIED from NUREG's
//      72 hr to allow distractors that compare B vs C; clock from V_Y inop,
//      i.e. "the second train was declared inoperable").
//      C.1 = Restore X train  OR  C.2 = Restore Y train.
//
// Because A, B, and C are SEPARATE Conditions (not "or more" sub-cases of
// a single Condition), the TS 1.3 +24-hour extension provision does NOT
// apply to any of them. The "extension" distractors test recognition of
// this scope limit.
//
// When a pump is restored to OPERABLE status while in Condition C:
//   - Restoring X completes C.1 → C is exited; A is also exited (X is
//     operable). B continues with its 72-hr clock from V_Y inop.
//   - Restoring Y completes C.2 → C is exited; B is also exited (Y is
//     operable). A continues with its 7-day clock from V_X inop.
//
// Parameters: t_X_inop, t_Y_inop, and (Cases 2/3) t_X_restored or
// t_Y_restored. Note these use different names from the 1.3-2 rules,
// since they refer to function trains rather than pumps.

const CT_A_1_3_3 = 168;
const CT_B_1_3_3 = 72;
const CT_C_1_3_3 = 48; // MODIFIED from NUREG's 72 hr.
const EXT_24_1_3_3 = 24;
const EXT_7DAY_1_3_3 = 168;

register(
  "function_X_inop_time",
  (p) => p.t_X_inop,
  () =>
    `This is just the time Function X was declared INOPERABLE. LCO 3.0.3 ` +
    `is entered when a Completion Time expires, not at the moment a ` +
    `Condition is entered.`,
);

register(
  "function_Y_inop_time",
  (p) => p.t_Y_inop,
  () =>
    `This is just the time Function Y was declared INOPERABLE. LCO 3.0.3 ` +
    `is entered when a Completion Time expires, not at the moment a ` +
    `Condition is entered.`,
);

register(
  "X_plus_C_1_3_3",
  (p) => addHours(p.t_X_inop, CT_C_1_3_3),
  () =>
    `Applies Condition C's ${CT_C_1_3_3}-hour clock from Function X's ` +
    `inop time. Per TS 1.3-3, Cond C's clock starts when the SECOND ` +
    `train was declared inoperable (Y inop), not from the first train.`,
);

register(
  "Y_plus_C_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_C_1_3_3),
  (p) =>
    `Condition C is entered when both X and Y trains are inoperable. ` +
    `C's ${CT_C_1_3_3}-hour modified Completion Time runs from the second ` +
    `train's inop time (Y inop at ${formatTime(p.t_Y_inop)}). When ` +
    `neither C.1 nor C.2 is satisfied within ${CT_C_1_3_3} hours, no ` +
    `other ACTIONS Condition applies for two trains inop — LCO 3.0.3 is ` +
    `entered at ${formatTime(addHours(p.t_Y_inop, CT_C_1_3_3))}. (If ` +
    `either train is restored within ${CT_C_1_3_3} hours, Cond C is ` +
    `exited via C.1 or C.2 and this answer no longer applies.)`,
);

register(
  "Y_plus_B_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_B_1_3_3),
  (p) =>
    `Condition B's ${CT_B_1_3_3}-hour clock runs from when Function Y ` +
    `was declared inoperable (${formatTime(p.t_Y_inop)}). When Cond B is ` +
    `not satisfied, LCO 3.0.3 is entered at ` +
    `${formatTime(addHours(p.t_Y_inop, CT_B_1_3_3))}. This is the ` +
    `controlling deadline only if Cond C has already been exited (via ` +
    `Function X being restored to OPERABLE status, completing C.1).`,
);

register(
  "Y_plus_C_plus_24hr_ext_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_C_1_3_3 + EXT_24_1_3_3),
  () =>
    `Adds a 24-hour "extension" to Condition C's clock. The TS 1.3 ` +
    `+24-hour extension applies ONLY to subsequent inoperabilities within ` +
    `a single Condition that has an "or more" allowance (e.g., the ` +
    `"One or more valves inoperable" Condition in Example 1.3-4). In ` +
    `1.3-3, Conditions A, B, and C are separate Conditions, so the ` +
    `extension does not apply here.`,
);

register(
  "Y_plus_B_plus_24hr_ext_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_B_1_3_3 + EXT_24_1_3_3),
  () =>
    `Adds a 24-hour "extension" to Condition B's 72-hour clock. The ` +
    `TS 1.3 extension applies only within a single Condition with an ` +
    `"or more" allowance, not across the LCO's separate A/B/C Conditions.`,
);

register(
  "Y_plus_B_plus_C_sequential_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_B_1_3_3 + CT_C_1_3_3),
  () =>
    `Sequences Cond B (${CT_B_1_3_3} hr) and Cond C (${CT_C_1_3_3} hr) ` +
    `as additive. Per TS 1.3, each Condition's Completion Time runs ` +
    `independently from when its Condition was entered. Cond B and ` +
    `Cond C run in parallel from V_Y inop, not sequentially.`,
);

register(
  "X_plus_A_1_3_3",
  (p) => addHours(p.t_X_inop, CT_A_1_3_3),
  (p) =>
    `Condition A's 7-day (${CT_A_1_3_3}-hour) clock runs from when ` +
    `Function X was declared inoperable (${formatTime(p.t_X_inop)}). ` +
    `When Cond A is not satisfied, LCO 3.0.3 is entered at ` +
    `${formatTime(addHours(p.t_X_inop, CT_A_1_3_3))}. This is the ` +
    `controlling deadline only when Cond B and Cond C have been exited ` +
    `(typically by Function Y being restored, completing C.2 and clearing ` +
    `Cond B).`,
);

register(
  "X_plus_A_plus_24hr_ext_1_3_3",
  (p) => addHours(p.t_X_inop, CT_A_1_3_3 + EXT_24_1_3_3),
  () =>
    `Adds a 24-hour "extension" to Condition A's 7-day clock. Cond A ` +
    `in 1.3-3 is "One Function X train inoperable" — singular — so no ` +
    `extension applies. The TS 1.3 +24-hour extension is only for ` +
    `subsequent inops within a single "or more" Condition.`,
);

register(
  "Y_plus_B_plus_7day_ext_1_3_3",
  (p) => addHours(p.t_Y_inop, CT_B_1_3_3 + EXT_7DAY_1_3_3),
  () =>
    `Adds a 7-day "extension" (the full Cond A 168-hour CT) to Cond B's ` +
    `72-hour clock. TS 1.3 extensions are capped at 24 hours and apply ` +
    `only within a single "or more" Condition. Neither the cap nor the ` +
    `scope is right here — and Cond A's 7 days has nothing to do with ` +
    `Cond B.`,
);

register(
  "X_plus_A_plus_C_1_3_3",
  (p) => addHours(p.t_X_inop, CT_A_1_3_3 + CT_C_1_3_3),
  () =>
    `Sequences Cond A (${CT_A_1_3_3} hr) and Cond C.1 (${CT_C_1_3_3} hr) ` +
    `as if Cond C's clock starts at Cond A's expiry. Cond C's clock ` +
    `runs independently from the second train's inop, not from Cond A's ` +
    `expiry. And if Y was restored (which exits Cond C via C.2), Cond C's ` +
    `clock has stopped — it doesn't restart later.`,
);

register(
  "X_plus_A_plus_7day_ext_1_3_3",
  (p) => addHours(p.t_X_inop, CT_A_1_3_3 + EXT_7DAY_1_3_3),
  () =>
    `Doubles Cond A's 7-day clock by adding a 7-day "extension". TS 1.3 ` +
    `extensions are capped at 24 hours and apply only within a single ` +
    `"or more" Condition. Cond A in 1.3-3 has no such allowance.`,
);

// ---------------- EXAMPLE 1.3-5 RULES ----------
// LCO ACTIONS table identical to 1.3-4 BUT with NOTE:
//   "Separate Condition entry is allowed for each inoperable valve."
//
// Pedagogy:
// - Each inoperable valve has its OWN Condition A clock with the stated
//   Completion Time, tracked independently from when that valve was
//   declared inoperable.
// - When a valve is restored to OPERABLE, only THAT valve's clock exits.
// - The TS 1.3 +24-hour extension provision does NOT apply: per TS 1.3,
//   "Completion Time extensions do not apply to those Specifications that
//   have exceptions that allow completely separate re-entry into the
//   Condition... These exceptions are stated in individual Specifications."
//   The NOTE in 1.3-5 is exactly such an exception.
// - For our cases V1 is always restored before V1's own Cond A clock
//   expires, so V1's clock exits cleanly. V2 carries the controlling
//   deadline (Cases 1, 3, 4, 5) — or V1 does, when V2 is the restored
//   valve (Case 2).
//
// Cases 1-3 use ctx { CT_A: 4, CT_B1: 6, CT_B2: 12, EXT_A: 4 }.
// Cases 4-5 use ctx { CT_A: 72, CT_B1: 6, CT_B2: 12, EXT_A: 24 }.
// CT_A and EXT_A come from ctx so the same rules cover both ctx variants.

// ---- correct rules ----

register(
  "V1_plus_CT_A_plus_B2_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Each valve has its own Condition A clock (per the NOTE allowing ` +
    `separate Condition entry per inoperable valve). V1's clock runs ` +
    `${ctx.CT_A} hr from V1 inop at ${formatTime(p.t_V1_inop)}; if V1 is ` +
    `not restored by then, V1's Cond B is entered and V1's B.2 (MODE 4 ` +
    `in ${ctx.CT_B2} hr) must be met. With V2 restored before its own ` +
    `Cond A expires, V2's clock exits cleanly; V1's deadline of ` +
    `${formatTime(addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B2))} controls.`,
);

register(
  "V2_plus_CT_A_plus_B2_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Each valve has its own Condition A clock (per the NOTE allowing ` +
    `separate Condition entry per inoperable valve). V2's clock runs ` +
    `${ctx.CT_A} hr from V2 inop at ${formatTime(p.t_V2_inop)}; if V2 is ` +
    `not restored by then, V2's Cond B is entered and V2's B.2 (MODE 4 ` +
    `in ${ctx.CT_B2} hr) must be met. With V1 restored before its own ` +
    `Cond A expires, V1's clock exits cleanly; V2's deadline of ` +
    `${formatTime(addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B2))} controls. ` +
    `No +24-hour extension applies — the NOTE allowing separate re-entry ` +
    `means the TS 1.3 extension provision is excluded.`,
);

// ---- distractor rules ----

register(
  "V1_plus_B1_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_B1),
  (p, ctx) =>
    `Adds B.1's ${ctx.CT_B1}-hour Completion Time to V1's inop time. ` +
    `Two issues: B.1 is the MODE 3 deadline (the question asks for MODE 4), ` +
    `and B.1 begins at Cond B entry — not at V1's inop.`,
);

register(
  "V2_plus_B1_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_B1),
  (p, ctx) =>
    `Adds B.1's ${ctx.CT_B1}-hour clock to V2's inop. B.1 is the MODE 3 ` +
    `deadline (not MODE 4) and starts at Cond B entry (after V2's own ` +
    `Condition A clock expires), not at V2's inop.`,
);

register(
  "V1_plus_CT_A_plus_ext_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.EXT_A),
  (p, ctx) =>
    `Adds a ${ctx.EXT_A}-hour "extension" to V1's Condition A clock, ` +
    `stopping there. Two issues: per the NOTE allowing separate Condition ` +
    `entry per valve, the TS 1.3 extension provision does NOT apply to ` +
    `1.3-5; and even if it did, this stops at Cond A expiry instead of ` +
    `adding B.2's ${ctx.CT_B2} hours for MODE 4.`,
);

register(
  "V1_plus_CT_A_plus_B1_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B1),
  (p, ctx) =>
    `V1's Condition A expiry plus B.1's ${ctx.CT_B1}-hour clock. B.1 is ` +
    `the MODE 3 deadline; the question asks for MODE 4 (B.2, ${ctx.CT_B2} hr).`,
);

register(
  "V2_plus_CT_A_plus_B1_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_B1),
  (p, ctx) =>
    `V2's Condition A expiry plus B.1's ${ctx.CT_B1}-hour clock. B.1 ` +
    `gives the MODE 3 deadline (not MODE 4).`,
);

register(
  "V1_plus_B2_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_B2),
  (p, ctx) =>
    `Adds B.2's ${ctx.CT_B2}-hour clock to V1's inop. B.2 begins at ` +
    `entry to Cond B (after V1's own Cond A clock expires) — not at V1's ` +
    `inop. With separate entries per valve, V1's Cond A still has to ` +
    `expire (or V1 must be left unrestored long enough) before V1's B.2 ` +
    `clock starts.`,
);

register(
  "V2_plus_B2_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_B2),
  (p, ctx) =>
    `Adds B.2's ${ctx.CT_B2}-hour clock to V2's inop. B.2 begins at entry ` +
    `to V2's Cond B (after V2's own Cond A clock of ${ctx.CT_A} hr expires) ` +
    `— not at V2's inop.`,
);

register(
  "V1_plus_CT_A_plus_ext_plus_B2_135",
  (p, ctx) =>
    addHours(p.t_V1_inop, ctx.CT_A + ctx.EXT_A + ctx.CT_B2),
  (p, ctx) =>
    `Applies a ${ctx.EXT_A}-hour extension to V1's Cond A clock, then ` +
    `adds B.2. Per TS 1.3, the extension provision does NOT apply to ` +
    `1.3-5 because the NOTE allows separate re-entry into the Condition ` +
    `for each valve — exactly the kind of exception that excludes the ` +
    `extension. Each valve runs its stated CT, period.`,
);

register(
  "V2_plus_CT_A_plus_ext_plus_B2_135",
  (p, ctx) =>
    addHours(p.t_V2_inop, ctx.CT_A + ctx.EXT_A + ctx.CT_B2),
  (p, ctx) =>
    `Applies a ${ctx.EXT_A}-hour extension to V2's Cond A clock, then ` +
    `adds B.2. The +${ctx.EXT_A}-hour extension does NOT apply in 1.3-5 ` +
    `because the NOTE allows separate Condition entry per valve, which ` +
    `excludes the TS 1.3 extension provision.`,
);

register(
  "V1_plus_CT_A_plus_seq_B1_B2_135",
  (p, ctx) =>
    addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `Treats B.1 (${ctx.CT_B1} hr) and B.2 (${ctx.CT_B2} hr) as sequential ` +
    `after V1's Cond A expires. Per TS 1.3-1, B.1 and B.2 each run from ` +
    `entry to Cond B — they run concurrently, not in sequence — so they ` +
    `are NOT additive.`,
);

register(
  "V1_restore_plus_CT_A_plus_ext_plus_B2_135",
  (p, ctx) =>
    addHours(p.t_V1_restore, ctx.CT_A + ctx.EXT_A + ctx.CT_B2),
  (p, ctx) =>
    `Anchors at V1's restoration time (${formatTime(p.t_V1_restore)}), ` +
    `then applies V1's Cond A clock + a ${ctx.EXT_A}-hour extension + ` +
    `B.2. V1's restoration EXITS V1's Cond A clock; it does NOT start a ` +
    `new one. The controlling clock is V2's, running from V2's inop.`,
);

register(
  "V1_plus_seq_B1_B2_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `B.1 + B.2 sequentially from V1's inop, skipping Condition A ` +
    `entirely. V1's Cond A clock (${ctx.CT_A} hr) must elapse before ` +
    `Cond B is entered. B.1 and B.2 also run concurrently from Cond B ` +
    `entry, not additively.`,
);

register(
  "V2_plus_seq_B1_B2_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_B1 + ctx.CT_B2),
  (p, ctx) =>
    `B.1 + B.2 sequentially from V2's inop, skipping Condition A. V2's ` +
    `Cond A clock (${ctx.CT_A} hr) must elapse first, and B.1/B.2 run ` +
    `concurrently from Cond B entry.`,
);

register(
  "V1_plus_CT_A_only_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A),
  (p, ctx) =>
    `Reports V1's Cond A expiry (${ctx.CT_A} hr from V1 inop) and stops ` +
    `there. This is when Cond B would be entered — the question asks for ` +
    `MODE 4 (B.2), which adds another ${ctx.CT_B2} hours.`,
);

register(
  "V2_plus_CT_A_only_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A),
  (p, ctx) =>
    `Reports V2's Cond A expiry (${ctx.CT_A} hr from V2 inop) and stops ` +
    `there. The question asks for MODE 4 (B.2), which adds ${ctx.CT_B2} ` +
    `more hours after V2's Cond B is entered.`,
);

register(
  "V1_plus_CT_A_doubled_plus_B2_135",
  (p, ctx) => addHours(p.t_V1_inop, ctx.CT_A + ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Adds the full Cond A Completion Time (${ctx.CT_A} hr) as if it were ` +
    `an "extension" to itself, then B.2. Misinterprets the TS 1.3 ` +
    `extension cap (24 hr) as the stated CT (${ctx.CT_A} hr) — and ` +
    `regardless, no extension applies to 1.3-5 because of the NOTE.`,
);

register(
  "V2_plus_CT_A_doubled_plus_B2_135",
  (p, ctx) => addHours(p.t_V2_inop, ctx.CT_A + ctx.CT_A + ctx.CT_B2),
  (p, ctx) =>
    `Adds the full Cond A Completion Time as if it were an extension to ` +
    `V2's Cond A, then B.2. The TS 1.3 extension cap is 24 hours, not ` +
    `${ctx.CT_A} — and the extension doesn't apply to 1.3-5 anyway.`,
);
