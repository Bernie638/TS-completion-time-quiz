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

    // ---- cases 2-5 stubbed for later phases ------------------------------
    // case-2: two valves, second valve repaired first (no extension applies)
    // case-3: V1 repaired before V2 declared inop (fresh Condition A entry)
    // case-4: 72-hr CT variant, <24 hr between inoperabilities
    // case-5: 72-hr CT variant, >24 hr between inoperabilities
    //         (note: correct answer for the canonical case 5 = 5 January 2300)
  ],
};
