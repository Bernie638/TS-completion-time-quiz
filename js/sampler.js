// sampler.js — sample case parameters under declarative constraints.
//
// A case declares its parameters as a map of name → spec. Each spec has a
// `kind`. Supported kinds:
//
//   { kind: "fixedHHMM", value: "0100" }
//       Anchor parameter. Always Jan 1 + value.
//
//   { kind: "randomHHMM", min: "0000", max: "2300" }
//       Random whole-hour HHMM on Jan 1, inclusive bounds.
//
//   { kind: "offsetHours", from: "<paramName>", minHours: N, maxHours: M }
//       Whole-hour offset from another (already-resolved) parameter. The
//       offset is inclusive on both ends.
//
// All resolved parameter values are returned as `instant` integers (minutes
// from Jan 1 00:00). The case-spec resolves names in declaration order, so a
// `from` reference must point to an earlier parameter.
//
// The optional `validate` argument to `sample()` is a predicate over the
// fully-resolved param map. Returning `false` triggers a re-sample. Use
// `maxAttempts` to bound this; failures throw.

import { parseHHMM, addHours } from "./time.js?v=8";

function randInt(min, max) {
  // Inclusive on both ends.
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function resolveOne(name, spec, resolved) {
  switch (spec.kind) {
    case "fixedHHMM":
      return parseHHMM(spec.value);

    case "randomHHMM": {
      const minH = parseHHMM(spec.min ?? "0000") / 60;
      const maxH = parseHHMM(spec.max ?? "2300") / 60;
      const hour = randInt(minH, maxH);
      return hour * 60;
    }

    case "offsetHours": {
      const base = resolved[spec.from];
      if (base === undefined) {
        throw new Error(
          `Parameter "${name}" references "${spec.from}" which is not yet resolved`,
        );
      }
      const hours = randInt(spec.minHours, spec.maxHours);
      return addHours(base, hours);
    }

    default:
      throw new Error(`Unknown param kind: ${spec.kind} for "${name}"`);
  }
}

/**
 * Sample one set of parameter values for a case.
 *
 * paramsSpec: ordered object (insertion order matters) of name → spec.
 * validate:   optional predicate; if returns false the sample is discarded.
 * maxAttempts: re-sample budget (default 200).
 *
 * Returns: { name: instant, ... }
 */
export function sample(paramsSpec, validate = null, maxAttempts = 200) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const resolved = {};
    for (const [name, spec] of Object.entries(paramsSpec)) {
      resolved[name] = resolveOne(name, spec, resolved);
    }
    if (!validate || validate(resolved)) return resolved;
  }
  throw new Error(
    `sampler.sample(): no valid parameter set within ${maxAttempts} attempts`,
  );
}
