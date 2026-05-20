// Example 1.3-4 — One or more valves inoperable.
//
// LCO ACTIONS table:
//   A. One or more valves inoperable.
//        A.1 Restore valve(s) to OPERABLE status.       4 hours
//   B. Required Action and associated Completion Time not met.
//        B.1 Be in MODE 3.                              6 hours
//        AND
//        B.2 Be in MODE 4.                             12 hours
//
// Source: NUREG-1431 Vol 1 Rev 5, Westinghouse STS 1.3-6 (Example 1.3-4).
//
// Phase 1 ships only case 1. Cases 2-5 are stubbed below for reference.

export const example_1_3_4 = {
  id: "1.3-4",
  title: "Example 1.3-4 — One or more valves inoperable",
  reference: {
    lcoTableHtml: "assets/lco_1_3_4_table.html",
    tsPdf: "assets/ts_1_3_pages.pdf",
  },
  // Numeric constants used by rules. Hours.
  ctx: {
    CT_A: 4,    // Condition A: restore valve
    CT_B1: 6,   // B.1: Be in MODE 3
    CT_B2: 12,  // B.2: Be in MODE 4
    EXT_A: 4,   // Example 1.3-4 specifically grants "up to 4 hr" extension
                // (per STS 1.3-7). For the 72-hr CT variant (cases 4-5) this
                // would instead be the general TS 1.3 cap of 24 hr.
  },
  cases: [
    {
      id: "case-1",
      label: "two valves, first valve repaired first",
      // The case requires:
      //   V1 INOP at a random hour (entry time).
      //   V2 INOP 1–3 hours after V1 (must be < CT_A so they overlap before
      //   Condition A expires).
      //   V1 RESTORED at V2_inop + 1 hour (so V1 is the first repaired and V2
      //   is still inop afterward, satisfying the TS 1.3 extension criteria).
      params: {
        t_V1_inop: { kind: "randomHHMM", min: "0000", max: "2300" },
        t_V2_inop: {
          kind: "offsetHours",
          from: "t_V1_inop",
          minHours: 1,
          maxHours: 3,
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
      correctRule: "case_1_correct",
      distractorRules: [
        "B2_from_first_inop",
        "B2_from_second_inop",
        "B2_no_extension",
        "seq_B1B2_from_first",
        "seq_B1B2_from_second",
        "seq_B1B2_from_second_extended",
      ],
    },

    {
      id: "case-2",
      label: "two valves, second valve repaired first",
      // V1 INOP at a random hour.
      // V2 INOP 1–2 hours later (so V2 has time to be restored before the
      // Condition A Completion Time expires at V1 + 4 hr).
      // V2 RESTORED 1 hour after it became inoperable. Always before Condition
      // A expiry, satisfying the case-2 premise: V2 (subsequent) is restored
      // before V1 (first), so the extension criterion fails.
      params: {
        t_V1_inop: { kind: "randomHHMM", min: "0000", max: "2300" },
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
      correctRule: "case_2_correct",
      distractorRules: [
        "B2_from_first_inop",
        "B2_from_second_inop",
        "B2_from_second_restored",
        "restart_A_at_second_inop",
        "seq_B1B2_from_first",
        "restart_A_at_second_restore",
        "seq_B1B2_from_second",
        "seq_B1B2_from_second_extended",
      ],
    },

    {
      id: "case-3",
      label: "first valve repaired before second valve inoperable",
      // V1 INOP at a random hour.
      // V1 RESTORED 1-2 hours later (always before Condition A would expire).
      // V2 INOP 1 hour after V1 is restored (so V1 and V2 are never
      // concurrently inop; V2 is a fresh entry into Condition A).
      params: {
        t_V1_inop: { kind: "randomHHMM", min: "0000", max: "2300" },
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
      correctRule: "case_3_correct",
      distractorRules: [
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
      ],
    },

    // ---- cases 4-5 stubbed for later phases ------------------------------
    // case-4: 72-hr CT variant, <24 hr between inoperabilities
    // case-5: 72-hr CT variant, >24 hr between inoperabilities
    //         (note: correct answer for the canonical case 5 = 5 January 2300)
  ],
};
