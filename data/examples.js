// examples.js — registry of all examples available to the quiz.
//
// Phase 1: only Example 1.3-4 is implemented. The other 7 are listed here
// with `available: false` so the dashboard can show them as disabled
// placeholders.

import { example_1_3_4 } from "./example_1_3_4.js?v=4";

export const EXAMPLES = [
  { id: "1.3-1", title: "Example 1.3-1", available: false },
  { id: "1.3-2", title: "Example 1.3-2", available: false },
  { id: "1.3-3", title: "Example 1.3-3", available: false },
  { id: "1.3-4", title: example_1_3_4.title, available: true, spec: example_1_3_4 },
  { id: "1.3-5", title: "Example 1.3-5", available: false },
  { id: "1.3-6", title: "Example 1.3-6", available: false },
  { id: "1.3-7", title: "Example 1.3-7", available: false },
  { id: "1.3-8", title: "Example 1.3-8", available: false },
];
