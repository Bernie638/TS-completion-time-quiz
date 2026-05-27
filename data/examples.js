// examples.js — registry of all examples available to the quiz.
//
// Phase 1: only Example 1.3-4 is implemented. The other 7 are listed here
// with `available: false` so the dashboard can show them as disabled
// placeholders.

import { example_1_3_1 } from "./example_1_3_1.js?v=11";
import { example_1_3_2 } from "./example_1_3_2.js?v=11";
import { example_1_3_3 } from "./example_1_3_3.js?v=11";
import { example_1_3_4 } from "./example_1_3_4.js?v=11";
import { example_1_3_5 } from "./example_1_3_5.js?v=11";

export const EXAMPLES = [
  { id: "1.3-1", title: example_1_3_1.title, available: true, spec: example_1_3_1 },
  { id: "1.3-2", title: example_1_3_2.title, available: true, spec: example_1_3_2 },
  { id: "1.3-3", title: example_1_3_3.title, available: true, spec: example_1_3_3 },
  { id: "1.3-4", title: example_1_3_4.title, available: true, spec: example_1_3_4 },
  { id: "1.3-5", title: example_1_3_5.title, available: true, spec: example_1_3_5 },
  { id: "1.3-6", title: "Example 1.3-6", available: false },
  { id: "1.3-7", title: "Example 1.3-7", available: false },
  { id: "1.3-8", title: "Example 1.3-8", available: false },
];
