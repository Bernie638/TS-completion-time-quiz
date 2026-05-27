// Example 1.3-5 — Same ACTIONS as 1.3-4 BUT with NOTE allowing separate
// Condition entry per inoperable valve.
//
// LCO ACTIONS (Cases 1-3, CT_A = 4 hr; Cases 4-5, CT_A = 72 hr):
//   NOTE: Separate Condition entry is allowed for each inoperable valve.
//   A. One or more valves inoperable.            CT_A hr     (per valve)
//      A.1 Restore valve to OPERABLE status.
//   B. Required Action and associated CT not met.
//      B.1 Be in MODE 3.                         6 hours    (per valve)
//      AND
//      B.2 Be in MODE 4.                        12 hours    (per valve)
//
// The NOTE makes each valve's Condition A clock independent. The TS 1.3
// +24-hour extension provision DOES NOT APPLY (per TS 1.3, extensions
// don't apply to LCOs with separate-re-entry exceptions). In all our
// cases V1 is always restored before V1's own Cond A expires, so V1's
// clock exits cleanly; V2 (or V1 in Case 2, if V2 was restored) carries
// the controlling deadline.
//
// Cases:
//   case-1: V2 inop, then V1 restored → V2 carries deadline (V2 + CT_A + B.2)
//   case-2: V2 inop, then V2 restored → V1 carries deadline (V1 + CT_A + B.2)
//   case-3: V1 restored before V2 inop → V2 carries deadline
//   case-4: 72-hr CT, V2 within 24 hr of V1, V1 restored → V2 deadline
//   case-5: 72-hr CT, V2 > 24 hr after V1, V1 restored → V2 deadline

const CASES_1_3_CTX = { CT_A: 4, CT_B1: 6, CT_B2: 12, EXT_A: 4 };
const CASES_4_5_CTX = { CT_A: 72, CT_B1: 6, CT_B2: 12, EXT_A: 24 };

export const example_1_3_5 = {
  id: "1.3-5",
  title: "Example 1.3-5 — Separate Condition entry per inoperable valve",
  reference: {
    lcoTableHtml: "assets/lco_1_3_5_table.html",
  },
  ctx: CASES_1_3_CTX,
  cases: [
    {
      id: "case-1",
      label: "two valves, V1 restored after V2 inop",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        // V2 inop 1-2 hr after V1 (so V1 restore = V2 inop + 1 stays
        // strictly inside V1's 4-hr Cond A window).
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 1,
          maxHours: 2,
        },
        t_V1_restore: {
          kind: "offsetHours",
          from: "t_V2_inop",
          minHours: 1,
          maxHours: 1,
        },
      },
      stemTemplate:
        "At time {t_V1_inop} Valve V1 is declared INOPERABLE.\n" +
        "At time {t_V2_inop} Valve V2 is declared INOPERABLE.\n" +
        "At time {t_V1_restore} Valve V1 is restored to OPERABLE status.\n\n" +
        "Using any applicable extensions, what is the latest time the plant " +
        "is required to be in MODE 4?",
      correctRule: "V2_plus_CT_A_plus_B2_135",
      distractorRules: [
        "V1_plus_B1_135",
        "V2_plus_B1_135",
        "V1_plus_CT_A_plus_ext_135",
        "V1_plus_CT_A_plus_B1_135",
        "V2_plus_CT_A_plus_B1_135",
        "V1_plus_B2_135",
        "V2_plus_B2_135",
        "V1_plus_CT_A_plus_B2_135",
        "V1_plus_CT_A_plus_ext_plus_B2_135",
        "V2_plus_CT_A_plus_ext_plus_B2_135",
        "V1_plus_CT_A_plus_seq_B1_B2_135",
      ],
    },

    {
      id: "case-2",
      label: "two valves, V2 restored after V2 inop",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 1,
          maxHours: 2,
        },
        t_V2_restore: {
          kind: "offsetHours",
          from: "t_V2_inop",
          minHours: 1,
          maxHours: 1,
        },
      },
      stemTemplate:
        "At time {t_V1_inop} Valve V1 is declared INOPERABLE.\n" +
        "At time {t_V2_inop} Valve V2 is declared INOPERABLE.\n" +
        "At time {t_V2_restore} Valve V2 is restored to OPERABLE status.\n\n" +
        "Using any applicable extensions, what is the latest time the plant " +
        "is required to be in MODE 4?",
      correctRule: "V1_plus_CT_A_plus_B2_135",
      distractorRules: [
        "V1_plus_B1_135",
        "V2_plus_B1_135",
        "V1_plus_CT_A_plus_ext_135",
        "V1_plus_CT_A_plus_B1_135",
        "V2_plus_CT_A_plus_B1_135",
        "V1_plus_B2_135",
        "V2_plus_B2_135",
        "V2_plus_CT_A_plus_B2_135",
        "V1_plus_CT_A_plus_ext_plus_B2_135",
        "V2_plus_CT_A_plus_ext_plus_B2_135",
        "V1_plus_CT_A_plus_seq_B1_B2_135",
      ],
    },

    {
      id: "case-3",
      label: "V1 restored before V2 inop (separate fresh entry for V2)",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V1_restore: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 1,
          maxHours: 2,
        },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_restore",
          minHours: 1,
          maxHours: 1,
        },
      },
      stemTemplate:
        "At time {t_V1_inop} Valve V1 is declared INOPERABLE.\n" +
        "At time {t_V1_restore} Valve V1 is restored to OPERABLE status.\n" +
        "At time {t_V2_inop} Valve V2 is declared INOPERABLE.\n\n" +
        "Using any applicable extensions, what is the latest time the plant " +
        "is required to be in MODE 4?",
      correctRule: "V2_plus_CT_A_plus_B2_135",
      distractorRules: [
        "V1_plus_B1_135",
        "V2_plus_B1_135",
        "V1_plus_CT_A_plus_ext_135",
        "V1_plus_CT_A_plus_B1_135",
        "V2_plus_CT_A_plus_B1_135",
        "V1_plus_B2_135",
        "V2_plus_B2_135",
        "V1_plus_CT_A_plus_B2_135",
        "V1_plus_CT_A_plus_ext_plus_B2_135",
        "V1_restore_plus_CT_A_plus_ext_plus_B2_135",
        "V2_plus_CT_A_plus_ext_plus_B2_135",
      ],
    },

    {
      id: "case-4",
      label: "modified LCO (CT_A = 72 hr), V2 within 24 hr of V1",
      ctx: CASES_4_5_CTX,
      reference: { lcoTableHtml: "assets/lco_1_3_5_72hr_table.html" },
      stemDateFormat: "always",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 1,
          maxHours: 22,
        },
        t_V1_restore: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 2,
          maxHours: 23,
        },
      },
      validate: (p) => p.t_V1_restore > p.t_V2_inop,
      stemTemplate:
        "On {t_V1_inop} Valve V1 is declared INOPERABLE.\n" +
        "On {t_V2_inop} Valve V2 is declared INOPERABLE.\n" +
        "On {t_V1_restore} Valve V1 is restored to OPERABLE status.\n\n" +
        "Using any applicable extensions, what is the latest time the plant " +
        "is required to be in MODE 4?",
      correctRule: "V2_plus_CT_A_plus_B2_135",
      distractorRules: [
        "V1_plus_B2_135",
        "V2_plus_B2_135",
        "V1_plus_seq_B1_B2_135",
        "V2_plus_seq_B1_B2_135",
        "V1_plus_CT_A_only_135",
        "V2_plus_CT_A_only_135",
        "V1_plus_CT_A_plus_seq_B1_B2_135",
        "V1_plus_CT_A_plus_B2_135",
        "V1_plus_CT_A_plus_ext_plus_B2_135",
        "V2_plus_CT_A_plus_ext_plus_B2_135",
        "V1_plus_CT_A_doubled_plus_B2_135",
        "V2_plus_CT_A_doubled_plus_B2_135",
      ],
    },

    {
      id: "case-5",
      label: "modified LCO (CT_A = 72 hr), V2 more than 24 hr after V1",
      ctx: CASES_4_5_CTX,
      reference: { lcoTableHtml: "assets/lco_1_3_5_72hr_table.html" },
      stemDateFormat: "always",
      params: {
        t_V1_inop: { kind: "fixedHHMM", value: "0100" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 25,
          maxHours: 47,
        },
        t_V1_restore: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 26,
          maxHours: 70,
        },
      },
      validate: (p) => p.t_V1_restore > p.t_V2_inop,
      stemTemplate:
        "On {t_V1_inop} Valve V1 is declared INOPERABLE.\n" +
        "On {t_V2_inop} Valve V2 is declared INOPERABLE.\n" +
        "On {t_V1_restore} Valve V1 is restored to OPERABLE status.\n\n" +
        "Using any applicable extensions, what is the latest time the plant " +
        "is required to be in MODE 4?",
      correctRule: "V2_plus_CT_A_plus_B2_135",
      distractorRules: [
        "V1_plus_B2_135",
        "V2_plus_B2_135",
        "V1_plus_seq_B1_B2_135",
        "V2_plus_seq_B1_B2_135",
        "V1_plus_CT_A_only_135",
        "V2_plus_CT_A_only_135",
        "V1_plus_CT_A_plus_B2_135",
        "V1_plus_CT_A_plus_ext_plus_B2_135",
        "V2_plus_CT_A_plus_ext_plus_B2_135",
        "V1_plus_CT_A_doubled_plus_B2_135",
        "V2_plus_CT_A_doubled_plus_B2_135",
      ],
    },
  ],
};
