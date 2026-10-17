// A "ball event" is one delivery. It is the single source of truth:
// everything else (score, overs, stats) is calculated from a list of these.
//
// Shape:
//   { runsOffBat: 0-..., extra: null | 'wide' | 'noball' | 'bye' | 'legbye', extraRuns: 0-... }

export const EXTRA_TYPES = ['wide', 'noball', 'bye', 'legbye'];

// Wides and no-balls are NOT legal deliveries: they don't count toward the over.
const ILLEGAL_EXTRAS = ['wide', 'noball'];

function isNonNegativeInteger(n) {
  return Number.isInteger(n) && n >= 0;
}

export function createBall({ runsOffBat = 0, extra = null, extraRuns } = {}) {
  if (!isNonNegativeInteger(runsOffBat)) {
    throw new Error(`runsOffBat must be a non-negative integer, got ${runsOffBat}`);
  }
  if (extra !== null && !EXTRA_TYPES.includes(extra)) {
    throw new Error(`Unknown extra type: ${extra}`);
  }

  // A wide or no-ball always costs at least 1 run, so default to 1.
  // Byes and leg-byes default to 0 unless you say how many were run.
  if (extraRuns === undefined) {
    extraRuns = ILLEGAL_EXTRAS.includes(extra) ? 1 : 0;
  }
  if (!isNonNegativeInteger(extraRuns)) {
    throw new Error(`extraRuns must be a non-negative integer, got ${extraRuns}`);
  }
  if (extra === null && extraRuns !== 0) {
    throw new Error('extraRuns given without an extra type');
  }

  return { runsOffBat, extra, extraRuns };
}

// Does this delivery count as one of the six balls in an over?
export function isLegalBall(ball) {
  return !ILLEGAL_EXTRAS.includes(ball.extra);
}

// Total runs added to the team score by this delivery.
export function ballRuns(ball) {
  return ball.runsOffBat + ball.extraRuns;
}
