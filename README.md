# Technical Specifications Completion Time Quiz

Random multiple-choice quiz engine for the rules governing Completion Times
in the Westinghouse Standard Technical Specifications (NUREG-1431 Vol 1
Rev 5). Each question generates random entry times within the constraints
of the selected example and computes the correct answer plus three time-
ordered distractors.

Phase 1 ships **Example 1.3-4, Case 1** (two valves, first valve repaired
first). The engine is example-agnostic; adding more cases is a data change.

## Running standalone

The bundle is a static folder. Most browsers require ES modules to be
served over HTTP (not opened via `file://`). From this directory:

```
python -m http.server 8000
```

then open `http://localhost:8000/` in a browser.

For local Node-free quick checks, any static file server works.

## Embedding

### PowerPoint

PowerPoint supports a Web Viewer add-in that renders a URL inside the slide:

1. Host the `TS_quiz/` folder somewhere reachable (intranet IIS, SharePoint,
   GitHub Pages, etc.).
2. In PowerPoint: **Insert → Add-ins → Get Add-ins → Web Viewer**.
3. Paste the hosted URL of `index.html`. Save.

### Articulate Storyline

Storyline can embed an HTML bundle as a Web Object:

1. Zip the `TS_quiz/` folder (or upload the unzipped folder to a CDN).
2. In Storyline: **Insert → Web Object**.
3. Select **From this computer** and pick the folder containing
   `index.html`, or **From URL** and point at the hosted location.
4. Set display mode to *Display in slide*.

When you publish the Storyline course, the quiz is bundled inside it.

### Plain web

Drop the folder onto any static-file host (S3, Netlify, GitHub Pages,
Nginx). Single-page; no backend.

## Repository layout

```
.
  index.html                          entry point + DOM scaffolding
  css/styles.css                      all visual styling
  js/
    time.js                           Jan-1 anchored time math and formatters
    sampler.js                        random parameter generation under constraints
    rules.js                          correct + distractor rule registry
    generator.js                      end-to-end question assembly
    ui.js                             dashboard + question screen wiring
  data/
    examples.js                       registry of available examples
    example_1_3_4.js                  Example 1.3-4 with Case 1 populated
  assets/
    ts_1_3_pages.pdf                  TS 1.3 Completion Times reference PDF
    lco_3_0_3.pdf                     LCO 3.0.3 reference PDF
    lco_1_3_4_table.html              ACTIONS table fragment for the Reference TS tab
  docs/case-specs/
    example-1-3-4.md                  case spec / design doc for Example 1.3-4
  tests/
    validate.js                       bulk invariant check (Node)
  package.json
  README.md
  LICENSE
```

## Validation

```
npm test
```

runs `tests/validate.js`, which generates Case 1 1000 times and asserts:

- correct answer matches an independent closed-form computation
- four choices, strictly time-ordered A→D
- no duplicate displayed values
- every feasible correct-slot position is exercised

## Adding a new case

1. Add a case object to the `cases: [...]` array in
   `data/example_1_3_4.js` (or a new `data/example_X_Y_Z.js`).
2. Declare its parameters under `params` using `sampler.js` kinds
   (`fixedHHMM`, `randomHHMM`, `offsetHours`).
3. Register one correct rule and several distractor rules in `js/rules.js`.
   Each rule has `compute(params, ctx) → instant` and
   `explain(params, ctx) → string`.
4. Reference the rule ids from the case's `correctRule` and
   `distractorRules`.
5. If you add a brand-new example, flip `available: true` for it in
   `data/examples.js` and assign `spec: <theExportedSpec>`.
6. Run `npm test` to confirm invariants hold for the new case (add an
   independent closed-form check in `tests/validate.js`).

## Phase plan

| Phase | Scope |
|---|---|
| 1 (this release) | Engine + UI shell + Example 1.3-4 Case 1 |
| 2 | Reconcile Cases 2–3 and add to Example 1.3-4 |
| 3 | Cases 4–5 (Condition A = 72 hr variant) |
| 4 | Examples 1.3-1, 1.3-2, 1.3-3, 1.3-5, 1.3-6, 1.3-7, 1.3-8 |
| 5 | Embed testing in PowerPoint and Articulate Storyline; final polish |
