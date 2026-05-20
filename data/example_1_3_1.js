// Example 1.3-1 — Condition B with two Required Actions.
//
// LCO ACTIONS table:
//   B. Required Action and associated Completion Time not met.
//        B.1 Be in MODE 3.   6 hours
//        AND
//        B.2 Be in MODE 5.  36 hours
//
// Both Completion Times are measured from entry to Condition B; they are
// NOT additive. Per STS 1.3-3 (Example 1.3-1), a total of 36 hours is
// allowed for reaching MODE 5, not 42.
//
// Tested cases:
//   case-1: paired question — asks for BOTH MODE 3 (X) and MODE 5 (Y)
//           deadlines in a 2x2 grid. Tests recognition that B.1 and B.2
//           run from the same time origin (Condition B entry).
//   case-2: single deadline — asks only for MODE 5.
//   case-3: single deadline — asks only for MODE 3.

export const example_1_3_1 = {
  id: "1.3-1",
  title: "Example 1.3-1 — Condition B with two Required Actions",
  reference: {
    lcoTableHtml: "assets/lco_1_3_1_table.html",
  },
  // No CT_A / EXT_A — this example exercises only Condition B's two
  // Required Actions. The deadlines are hard-coded in the rules.
  ctx: {},
  cases: [
    {
      id: "case-1",
      label: "paired question — MODE 3 and MODE 5 deadlines",
      layout: "two_column",
      xLabel: "(X)",
      yLabel: "(Y)",
      stemDateFormat: "always",
      params: {
        t_condB_entry: { kind: "randomHHMM", min: "0000", max: "2300" },
      },
      stemTemplate:
        "Given:\n" +
        "  • Condition B has been entered on {t_condB_entry}.\n\n" +
        "The plant is required to be in MODE 3 ___(X)___.\n" +
        "The plant is required to be in MODE 5 ___(Y)___.",
      xCorrectRule: "mode_3_correct",
      xDistractorRules: [
        "entry_plus_0",
        "entry_plus_3",
        "entry_plus_12",
        "entry_plus_18",
        "entry_plus_30",
        "entry_plus_36",
      ],
      yCorrectRule: "mode_5_correct",
      yDistractorRules: [
        "entry_plus_6", // alias — see note below
        "entry_plus_12",
        "entry_plus_18",
        "entry_plus_30",
        "entry_plus_42",
        "entry_plus_48",
      ],
    },

    {
      id: "case-2",
      label: "MODE 5 deadline only",
      stemDateFormat: "always",
      params: {
        t_condB_entry: { kind: "randomHHMM", min: "0000", max: "2300" },
      },
      stemTemplate:
        "Given:\n" +
        "  • Condition B has been entered on {t_condB_entry}.\n\n" +
        "The plant is required to be in MODE 5 ______.",
      correctRule: "mode_5_correct",
      distractorRules: [
        "entry_plus_6",
        "entry_plus_12",
        "entry_plus_18",
        "entry_plus_30",
        "entry_plus_42",
        "entry_plus_48",
      ],
    },

    {
      id: "case-3",
      label: "MODE 3 deadline only",
      stemDateFormat: "always",
      params: {
        t_condB_entry: { kind: "randomHHMM", min: "0000", max: "2300" },
      },
      stemTemplate:
        "Given:\n" +
        "  • Condition B has been entered on {t_condB_entry}.\n\n" +
        "The plant is required to be in MODE 3 ______.",
      correctRule: "mode_3_correct",
      distractorRules: [
        "entry_plus_0",
        "entry_plus_12",
        "entry_plus_18",
        "entry_plus_36",
        "entry_plus_48",
      ],
    },
  ],
};
