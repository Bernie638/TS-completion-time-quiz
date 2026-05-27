import { addHours } from "../js/time.js?v=11";

// Example 1.3-3 — Three-Condition LCO with X train, Y train, and the
// combined (X AND Y) Condition C.
//
// LCO (MODIFIED for pedagogy — C.1 and C.2 reduced from 72 hr to 48 hr):
//   A. One Function X train inoperable.            7 days     (clock: V_X)
//   B. One Function Y train inoperable.            72 hours   (clock: V_Y)
//   C. One X AND one Y inoperable.                 48 hours   (clock: V_Y)
//      C.1 Restore X train  OR  C.2 Restore Y train
//
// All three Conditions are tracked independently from their respective
// entry times. The LCO has no Condition covering "Required Action and
// associated Completion Time not met", so when any of A/B/C's CT expires
// without being satisfied, LCO 3.0.3 is entered.
//
// Critical pedagogy: the TS 1.3 +24-hour extension does NOT apply to any
// Condition in 1.3-3. The extension provision is for subsequent inops
// within a single "or more" Condition (1.3-4 pattern). A, B, and C here
// are separate Conditions.
//
// Cases:
//   case-1: neither train restored → C expires first → correct = V_Y + 48
//   case-2: X restored before Cond C expires → A and C exit; B continues
//           → correct = V_Y + 72
//   case-3: Y restored before Cond C expires → B and C exit; A continues
//           → correct = V_X + 168

export const example_1_3_3 = {
  id: "1.3-3",
  title: "Example 1.3-3 — Three-Condition LCO (C.1/C.2 modified to 48 hr)",
  reference: {
    lcoTableHtml: "assets/lco_1_3_3_table.html",
  },
  ctx: {},
  cases: [
    {
      id: "case-1",
      label: "neither train restored; Cond C expires first",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        // V_Y within Cond A's window AND constrained to V_X + 23..71 so
        // Cond C expires before Cond B and Cond A always.
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
      },
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n\n" +
        "At what date and time is LCO 3.0.3 required to be entered?",
      correctRule: "Y_plus_C_1_3_3",
      distractorRules: [
        "function_X_inop_time",
        "function_Y_inop_time",
        "X_plus_C_1_3_3",
        "Y_plus_B_1_3_3",
        "Y_plus_C_plus_24hr_ext_1_3_3", // = Y_plus_B value; plausible wins
        "Y_plus_B_plus_24hr_ext_1_3_3",
        "Y_plus_B_plus_C_sequential_1_3_3",
        "X_plus_A_1_3_3",
        "X_plus_A_plus_24hr_ext_1_3_3",
        "Y_plus_B_plus_7day_ext_1_3_3",
        "X_plus_A_plus_7day_ext_1_3_3",
      ],
      plausibleDistractors: ["Y_plus_C_plus_24hr_ext_1_3_3"],
    },

    {
      id: "case-2",
      label: "Function X restored before Cond C expires",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
        // X restored 1 to 47 hours after Y inop (i.e. before Cond C's
        // 48-hour clock expires). Also enforced below to be before A's
        // 168-hr clock — guaranteed since Y < V_X+72, so restored <
        // V_X + 119 < V_X + 168.
        t_X_restored: {
          kind: "offsetHours",
          from: "t_Y_inop",
          minHours: 1,
          maxHours: 47,
        },
      },
      validate: (p) => p.t_X_restored < p.t_X_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n" +
        "  • on {t_X_restored} Function X is restored to OPERABLE status.\n\n" +
        "At what date and time is LCO 3.0.3 required to be entered?",
      correctRule: "Y_plus_B_1_3_3",
      distractorRules: [
        "function_X_inop_time",
        "function_Y_inop_time",
        "X_plus_C_1_3_3",
        "Y_plus_C_1_3_3",
        "Y_plus_C_plus_24hr_ext_1_3_3", // = correct value; auto-filtered
        "Y_plus_B_plus_24hr_ext_1_3_3",
        "Y_plus_B_plus_C_sequential_1_3_3",
        "X_plus_A_1_3_3",
        "X_plus_A_plus_24hr_ext_1_3_3",
        "Y_plus_B_plus_7day_ext_1_3_3",
        "X_plus_A_plus_7day_ext_1_3_3",
      ],
      plausibleDistractors: ["Y_plus_C_plus_24hr_ext_1_3_3"],
    },

    {
      id: "case-3",
      label: "Function Y restored before Cond C expires",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
        t_Y_restored: {
          kind: "offsetHours",
          from: "t_Y_inop",
          minHours: 1,
          maxHours: 47,
        },
      },
      validate: (p) => p.t_Y_restored < p.t_X_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n" +
        "  • on {t_Y_restored} Function Y is restored to OPERABLE status.\n\n" +
        "At what date and time is LCO 3.0.3 required to be entered?",
      correctRule: "X_plus_A_1_3_3",
      distractorRules: [
        "function_X_inop_time",
        "function_Y_inop_time",
        "X_plus_C_1_3_3",
        "Y_plus_C_1_3_3",
        "Y_plus_B_1_3_3",
        "Y_plus_C_plus_24hr_ext_1_3_3", // = Y_plus_B value; plausible wins
        "Y_plus_B_plus_24hr_ext_1_3_3",
        "Y_plus_B_plus_C_sequential_1_3_3",
        "X_plus_A_plus_24hr_ext_1_3_3",
        "X_plus_A_plus_C_1_3_3",
        "X_plus_A_plus_7day_ext_1_3_3",
      ],
      plausibleDistractors: ["Y_plus_C_plus_24hr_ext_1_3_3"],
    },

    // ---- mode-at-time variants ----

    {
      id: "case-1-mode",
      label: "MODE at time — neither train restored (Cond C triggers LCO 3.0.3)",
      layout: "mode_at_time",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
      },
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n" +
        "  • All Required Actions are performed at the exact time required.\n\n" +
        "At {t_queryTime}, the plant is required to be in MODE ___.",
      modeTimeline: (p) => {
        const lcoEntry = addHours(p.t_Y_inop, 48); // Cond C expiry
        return [
          {
            mode: 1,
            fromTime: p.t_Y_inop,
            transitionReason:
              "the LCO's Conditions are running but none have expired yet — no mode change required",
          },
          {
            mode: 3,
            fromTime: addHours(lcoEntry, 7),
            transitionReason:
              "LCO 3.0.3.a (MODE 3 within 7 hr of LCO 3.0.3 entry, which occurred when Cond C expired)",
          },
          {
            mode: 4,
            fromTime: addHours(lcoEntry, 13),
            transitionReason: "LCO 3.0.3.b (MODE 4 within 13 hr of LCO 3.0.3 entry)",
          },
          {
            mode: 5,
            fromTime: addHours(lcoEntry, 37),
            transitionReason: "LCO 3.0.3.c (MODE 5 within 37 hr of LCO 3.0.3 entry)",
          },
        ];
      },
      finalSegmentMaxHours: 48,
    },

    {
      id: "case-2-mode",
      label: "MODE at time — Function X restored; Cond B triggers LCO 3.0.3",
      layout: "mode_at_time",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
        t_X_restored: {
          kind: "offsetHours",
          from: "t_Y_inop",
          minHours: 1,
          maxHours: 47,
        },
      },
      validate: (p) => p.t_X_restored < p.t_X_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n" +
        "  • on {t_X_restored} Function X is restored to OPERABLE status.\n" +
        "  • All Required Actions are performed at the exact time required.\n\n" +
        "At {t_queryTime}, the plant is required to be in MODE ___.",
      modeTimeline: (p) => {
        // After X restored: A and C exit, B continues. LCO 3.0.3 enters
        // when B's 72-hr clock from V_Y expires.
        const lcoEntry = addHours(p.t_Y_inop, 72);
        return [
          {
            mode: 1,
            fromTime: p.t_Y_inop,
            transitionReason:
              "Conditions B and C running; Function X then restored; no mode change required yet",
          },
          {
            mode: 3,
            fromTime: addHours(lcoEntry, 7),
            transitionReason:
              "LCO 3.0.3.a (entered when Cond B's 72-hr clock from V_Y expired)",
          },
          {
            mode: 4,
            fromTime: addHours(lcoEntry, 13),
            transitionReason: "LCO 3.0.3.b",
          },
          {
            mode: 5,
            fromTime: addHours(lcoEntry, 37),
            transitionReason: "LCO 3.0.3.c",
          },
        ];
      },
      finalSegmentMaxHours: 48,
    },

    {
      id: "case-3-mode",
      label: "MODE at time — Function Y restored; Cond A triggers LCO 3.0.3",
      layout: "mode_at_time",
      stemDateFormat: "always",
      params: {
        t_X_inop: { kind: "fixedHHMM", value: "0100" },
        t_Y_inop: {
          kind: "offsetHours",
          from: "t_X_inop",
          minHours: 23,
          maxHours: 71,
        },
        t_Y_restored: {
          kind: "offsetHours",
          from: "t_Y_inop",
          minHours: 1,
          maxHours: 47,
        },
      },
      validate: (p) => p.t_Y_restored < p.t_X_inop + 168 * 60,
      stemTemplate:
        "Given:\n" +
        "  • on {t_X_inop} Function X is declared INOPERABLE.\n" +
        "  • on {t_Y_inop} Function Y is declared INOPERABLE.\n" +
        "  • on {t_Y_restored} Function Y is restored to OPERABLE status.\n" +
        "  • All Required Actions are performed at the exact time required.\n\n" +
        "At {t_queryTime}, the plant is required to be in MODE ___.",
      modeTimeline: (p) => {
        // After Y restored: B and C exit, A continues. LCO 3.0.3 enters
        // when A's 168-hr clock from V_X expires.
        const lcoEntry = addHours(p.t_X_inop, 168);
        return [
          {
            mode: 1,
            fromTime: p.t_Y_inop,
            transitionReason:
              "Conditions are running but Cond A's 7-day clock has not yet expired — no mode change required",
          },
          {
            mode: 3,
            fromTime: addHours(lcoEntry, 7),
            transitionReason:
              "LCO 3.0.3.a (entered when Cond A's 7-day clock from V_X expired)",
          },
          {
            mode: 4,
            fromTime: addHours(lcoEntry, 13),
            transitionReason: "LCO 3.0.3.b",
          },
          {
            mode: 5,
            fromTime: addHours(lcoEntry, 37),
            transitionReason: "LCO 3.0.3.c",
          },
        ];
      },
      finalSegmentMaxHours: 48,
    },
  ],
};
