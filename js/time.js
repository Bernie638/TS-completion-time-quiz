// time.js — Jan-1 anchored time arithmetic and formatters.
//
// Internal representation: minutes elapsed since January 1, 00:00.
// Engine never reasons about real calendar dates — only "minutes from Jan 1".
//
// All public functions are pure.

const MIN_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MIN_PER_DAY = MIN_PER_HOUR * HOURS_PER_DAY;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
// Days in each month for a non-leap year. Quiz scenarios never run more than
// a few days, so leap-year handling is unnecessary; we anchor to Jan 1 and
// assume non-leap for the date label.
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/** Convert an "HHMM" 24-hour string on January 1 into minutes from Jan 1 00:00. */
export function parseHHMM(hhmm) {
  if (typeof hhmm !== "string" || !/^\d{4}$/.test(hhmm)) {
    throw new Error(`parseHHMM expects "HHMM", got ${JSON.stringify(hhmm)}`);
  }
  const hours = Number(hhmm.slice(0, 2));
  const minutes = Number(hhmm.slice(2, 4));
  if (hours > 23 || minutes > 59) {
    throw new Error(`parseHHMM out of range: ${hhmm}`);
  }
  return hours * MIN_PER_HOUR + minutes;
}

/** Add a number of hours to an instant. */
export function addHours(instant, hours) {
  return instant + Math.round(hours * MIN_PER_HOUR);
}

/** Add minutes to an instant. */
export function addMinutes(instant, minutes) {
  return instant + minutes;
}

/**
 * Format an instant for display.
 *
 *   minDate = the earliest instant in the question. If `instant` falls on the
 *   same calendar day as `minDate`, only "HHMM" is shown. If it falls on a
 *   later day, "Month Day at HHMM" is shown. This matches the spec: rollover
 *   is signaled only when the instant crosses days relative to the question.
 *
 *   If `minDate` is omitted the formatter always emits "Month Day at HHMM".
 */
export function formatTime(instant, minDate = null) {
  const day = Math.floor(instant / MIN_PER_DAY);
  const hhmm = formatHHMM(instant);

  if (minDate !== null) {
    const minDay = Math.floor(minDate / MIN_PER_DAY);
    if (day === minDay) return hhmm;
  }
  return `${dateLabel(day)} at ${hhmm}`;
}

/** "HHMM" component of an instant (24-hour). */
export function formatHHMM(instant) {
  const minutesIntoDay = ((instant % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const hours = Math.floor(minutesIntoDay / MIN_PER_HOUR);
  const minutes = minutesIntoDay % MIN_PER_HOUR;
  return String(hours).padStart(2, "0") + String(minutes).padStart(2, "0");
}

/** "Month Day" label for the given day index (0 = January 1). */
export function dateLabel(dayIndex) {
  let remaining = dayIndex;
  for (let month = 0; month < 12; month++) {
    if (remaining < DAYS_IN_MONTH[month]) {
      return `${MONTH_NAMES[month]} ${remaining + 1}`;
    }
    remaining -= DAYS_IN_MONTH[month];
  }
  // Beyond December 31 — should not occur for any quiz scenario, but degrade
  // gracefully by reporting day count.
  return `Day ${dayIndex + 1}`;
}

/** Day index (0 = Jan 1) for an instant. */
export function dayIndex(instant) {
  return Math.floor(instant / MIN_PER_DAY);
}

// Exposed for tests / readability.
export const constants = { MIN_PER_HOUR, MIN_PER_DAY };
