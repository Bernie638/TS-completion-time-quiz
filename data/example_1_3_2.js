import { addHours } from "../js/time.js?v=12";

// Example 1.3-2 — One pump inoperable; behavior when a second pump fails.
//
// LCO ACTIONS table:
//   A. One pump inoperable.
//        A.1 Restore pump to OPERABLE status.       7 days
//   B. Required Action and associated Completion Time not met.
//        B.1 Be in MODE 3.                          6 hours
//        AND
//        B.2 Be in MODE 5.                         36 hours
//
// Critical mechanics tested here:
//   - When a SECOND pump becomes inoperable, the LCO has no Condition
//     covering two pumps inop, so LCO 3.0.3 is entered.
//     LCO 3.0.3: MODE 3 in 7 hr, MODE 4 in 13 hr, MODE 5 in 37 hr.
//   - The Condition A clock continues from pump 1's inop time, even when
//     LCO 3.0.3 is in effect.
//   - If a pump is restored to OPERABLE while in LCO 3.0.3 (before LCO
//     3.0.3.c expires), LCO 3.0.3 is exited and Condition A continues.
//   - NO +24 hour extension applies. Condition A reads "One pump
//     inoperable" (singular) — there is no provision for the Condition
//     to cover subsequent inops, which is the very reason LCO 3.0.3 is
//     required in the first place.
//
// Cases:
//   case-1: both pumps stay inoperable → correct = LCO 3.0.3.c from V2.
//   case-2: pump 1 restored before LCO 3.0.3.c expires.
//   case-3: pump 2 restored before LCO 3.0.3.c expires.
// Cases 2 and 3 have the same correct answer (V1 + 168 + 36 = V1+204);
// they differ in scenario wording and which pump's restore time is
// referenced in the stem.

export const example_1_3_2 = {
  id: "1.3-2",
  title: "Example 1.3-2 — One pump inoperable (with LCO 3.0.3 entry)",
  reference: {
    lcoTableHtml: "assets/lco_1_3_2_table.html",
  },
  ctx: {},
  cases: [
    {
      id: "case-1",
      label: "both pumps remain inoperable",
      stemDateFormat: "always",
      params: {
        // Pump 1 fixed at Jan 1 0100 to keep the math simple.
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        // Pump 2 random within Condition A's 7-day window: 1-6 days
        // (in hours: 23-166) after pump 1's inop.
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 23,
          maxHours: 166,
        },
      },
      stemTemplate:
        "Given:\n" +
        "  • on {t_V1_inop} a pump is declared INOPERABLE.\n" +
        "  • on {t_V2_inop} a second pump is declared INOPERABLE.\n\n" +
        "What date and time is the plant required to be in MODE 5?",
      correctRule: "lco_303c_from_second",
      distractorRules: [
        "condA_plus_B1_from_first",
        "condA_plus_303a_from_first",
        "lco_303a_from_second",
        "condA_plus_303b_from_first",
        "lco_303b_from_second",
        "condA_plus_B2_from_first",          // plausible
        "condA_plus_seq_B1B2_from_first",    // plausible
        "lco_303_sequential_from_second",    // plausible
        "condA_plus_B1_from_second",
        "condA_plus_B2_from_second",         // plausible
        "condA_plus_303c_from_second",
        "condA_plus_seq_B1B2_from_second",   // plausible
      ],
      plausibleDistractors: [
        "condA_plus_B2_from_first",
        "condA_plus_seq_B1B2_from_first",
        "lco_303_sequential_from_second",
        "condA_plus_B2_from_second",
        "condA_plus_seq_B1B2_from_second",
      ],
    },

    {
      id: "case-2",
      label: "pump 1 restored before LCO 3.0.3.c expires",
      stemDateFormat: "always",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 23,
          maxHours: 143,
        },
        // Pump 1 restored: 1 to 36 hours after pump 2's inop
        // (i.e., before LCO 3.0.3.c expires at V2 + 37) AND before
        // Condition A would expire at V1 + 168.
        t_V1_restore: {
          kind: "offsetHours",
          from: "t_V2_inop",
          minHours: 1,
          maxHours: 36,
        },
      },
      // Ensure pump 1 restored before Cond A expires (V1 + 168 hours).
      validate: (p) => p.t_V1_restore < p.t_V1_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_V1_inop} a pump is declared INOPERABLE.\n" +
        "  • on {t_V2_inop} a second pump is declared INOPERABLE.\n" +
        "  • on {t_V1_restore} Pump 1 is restored to OPERABLE status.\n\n" +
        "What date and time is the plant required to be in MODE 5?",
      correctRule: "condA_plus_B2_from_first",
      distractorRules: [
        "B2_from_first_no_condA",
        "lco_303c_from_first",
        "B2_from_second_no_condA",
        "lco_303c_from_second",              // plausible
        "lco_303_sequential_from_second",
        "condA_plus_seq_B1B2_from_first",
        "condA_plus_303c_from_first",
        "condA_plus_B2_from_second",         // plausible
        "condA_plus_303c_from_second",
        "condA_plus_seq_B1B2_from_second",   // plausible
        "condA_plus_24_extension_plus_B2_from_first",       // plausible
        "condA_plus_seven_day_extension_plus_B2_from_first", // plausible
      ],
      plausibleDistractors: [
        "lco_303c_from_second",
        "condA_plus_B2_from_second",
        "condA_plus_seq_B1B2_from_second",
        "condA_plus_24_extension_plus_B2_from_first",
        "condA_plus_seven_day_extension_plus_B2_from_first",
      ],
    },

    {
      id: "case-3",
      label: "pump 2 restored before LCO 3.0.3.c expires",
      stemDateFormat: "always",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 23,
          maxHours: 143,
        },
        // Pump 2 restored: 1 to 36 hours after pump 2's inop, and before
        // Condition A's 168-hour Completion Time elapses.
        t_V2_restore: {
          kind: "offsetHours",
          from: "t_V2_inop",
          minHours: 1,
          maxHours: 36,
        },
      },
      validate: (p) => p.t_V2_restore < p.t_V1_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_V1_inop} a pump is declared INOPERABLE.\n" +
        "  • on {t_V2_inop} a second pump is declared INOPERABLE.\n" +
        "  • on {t_V2_restore} Pump 2 is restored to OPERABLE status.\n\n" +
        "What date and time is the plant required to be in MODE 5?",
      correctRule: "condA_plus_B2_from_first",
      distractorRules: [
        "B2_from_first_no_condA",
        "lco_303c_from_first",
        "B2_from_second_no_condA",
        "lco_303c_from_second",              // plausible
        "lco_303_sequential_from_second",
        "condA_plus_seq_B1B2_from_first",
        "condA_plus_303c_from_first",
        "condA_plus_B2_from_second",         // plausible
        "condA_plus_303c_from_second",
        "condA_plus_seq_B1B2_from_second",   // plausible
        "condA_plus_24_extension_plus_B2_from_first",       // plausible
        "condA_plus_seven_day_extension_plus_B2_from_first", // plausible
      ],
      plausibleDistractors: [
        "lco_303c_from_second",
        "condA_plus_B2_from_second",
        "condA_plus_seq_B1B2_from_second",
        "condA_plus_24_extension_plus_B2_from_first",
        "condA_plus_seven_day_extension_plus_B2_from_first",
      ],
    },

    {
      // Mode-at-time variant of case-1: both pumps stay inoperable; the
      // LCO 3.0.3 cascade from V2 inop drives the timeline. All four
      // modes reachable.
      id: "case-1-mode",
      label: "MODE at time — both pumps inoperable, LCO 3.0.3 cascade",
      layout: "mode_at_time",
      stemDateFormat: "always",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 23,
          maxHours: 143,
        },
      },
      stemTemplate:
        "Given:\n" +
        "  • on {t_V1_inop} a pump is declared INOPERABLE.\n" +
        "  • on {t_V2_inop} a second pump is declared INOPERABLE.\n" +
        "  • All Required Actions are performed at the exact time required.\n\n" +
        "At {t_queryTime}, the plant is required to be in MODE ___.",
      modeTimeline: (p) => [
        {
          mode: 1,
          fromTime: p.t_V2_inop,
          transitionReason:
            "LCO 3.0.3 entered when the second pump went inoperable, but no mode change is required yet",
        },
        {
          mode: 3,
          fromTime: addHours(p.t_V2_inop, 7),
          transitionReason:
            "LCO 3.0.3.a (MODE 3 within 7 hr of LCO 3.0.3 entry)",
        },
        {
          mode: 4,
          fromTime: addHours(p.t_V2_inop, 13),
          transitionReason:
            "LCO 3.0.3.b (MODE 4 within 13 hr of LCO 3.0.3 entry)",
        },
        {
          mode: 5,
          fromTime: addHours(p.t_V2_inop, 37),
          transitionReason:
            "LCO 3.0.3.c (MODE 5 within 37 hr of LCO 3.0.3 entry)",
        },
      ],
      finalSegmentMaxHours: 48,
    },
  ],
};
