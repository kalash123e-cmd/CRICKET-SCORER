// A "ball event" is one delivery. It is the single source of truth:
// everything else (score, overs, wickets, stats) is calculated from a list of these.
//
// Shape:
//   {
//     runsOffBat: 0-...,
//     extra: null | 'wide' | 'noball' | 'bye' | 'legbye',
//     extraRuns: 0-...,
//     wicket: null | { type: 'bowled' | 'caught' | ..., playerOut: <id or name> }
//   }

export const EXTRA_TYPES = ['wide', 'noball', 'bye', 'legbye'];
export const WICKET_TYPES = ['bowled', 'caught', 'lbw', 'stumped', 'runout', 'hitwicket'];

// Wides and no-balls are NOT legal deliveries: they don't count toward the over.
const ILLEGAL_EXTRAS = ['wide', 'noball'];

// Wickets credited to the bowler (a run-out is not).
const BOWLER_WICKETS = ['bowled', 'caught', 'lbw', 'stumped', 'hitwicket'];

// Ways a batter can be out on an illegal delivery.
const ALLOWED_ON_WIDE = ['stumped', 'runout', 'hitwicket'];
const ALLOWED_ON_NOBALL = ['runout'];

function isNonNegativeInteger(n) {
  return Number.isInteger(n) && n >= 0;
}

function validateWicket(wicket, extra) {
  if (!WICKET_TYPES.includes(wicket.type)) {
    throw new Error(`Unknown wicket type: ${wicket.type}`);
  }
  if (wicket.playerOut === undefined || wicket.playerOut === null || wicket.playerOut === '') {
    throw new Error('A wicket must say which player is out (playerOut)');
  }
  if (extra === 'wide' && !ALLOWED_ON_WIDE.includes(wicket.type)) {
    throw new Error(`A batter cannot be out ${wicket.type} off a wide`);
  }
  if (extra === 'noball' && !ALLOWED_ON_NOBALL.includes(wicket.type)) {
    throw new Error(`A batter cannot be out ${wicket.type} off a no-ball`);
  }
}

export function createBall({ runsOffBat = 0, extra = null, extraRuns, wicket = null } = {}) {
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

  if (wicket !== null) {
    validateWicket(wicket, extra);
    wicket = { type: wicket.type, playerOut: wicket.playerOut }; // store a clean copy
  }

  return { runsOffBat, extra, extraRuns, wicket };
}

// Does this delivery count as one of the six balls in an over?
export function isLegalBall(ball) {
  return !ILLEGAL_EXTRAS.includes(ball.extra);
}

// Total runs added to the team score by this delivery.
export function ballRuns(ball) {
  return ball.runsOffBat + ball.extraRuns;
}

// Did a batter get out on this delivery?
export function isWicket(ball) {
  return ball.wicket !== null;
}

// Does the bowler get credit for the wicket? (Run-outs don't count for the bowler.)
export function isBowlerWicket(ball) {
  return ball.wicket !== null && BOWLER_WICKETS.includes(ball.wicket.type);
}