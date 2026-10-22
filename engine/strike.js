import { isLegalBall } from './ball.js';
import { BALLS_PER_OVER } from './innings.js';

// Batters are tracked as { striker, nonStriker } (any ids or names).
// A slot is null when nobody is there (the side is all out).
//
// What happens on each ball, in this order:
//   1. If the batters ran an ODD number of runs, they cross -> swap.
//   2. If a batter is out, the incoming batter takes THEIR place, wherever they
//      are standing after step 1 (this is what makes run-outs work).
//   3. If the over ended (6th LEGAL ball), the batters swap ends again.
//
// Wides and no-balls are not legal balls, so they can never end an over.

// How many runs did the batters actually run on this ball?
// The penalty run for a wide or no-ball is NOT run, so it is excluded.
// Boundaries (4s and 6s) are even, so they never change strike on their own.
export function runsRun(ball) {
  const penalty = ball.extra === 'wide' || ball.extra === 'noball' ? 1 : 0;
  return ball.runsOffBat + ball.extraRuns - penalty;
}

// Who is at the crease after this ball?
//   legalBallsBefore = legal balls bowled BEFORE this one
//   incomingBatter   = who replaces a dismissed batter (null if nobody is left)
export function nextBatters(
  batters,
  ball,
  legalBallsBefore,
  ballsPerOver = BALLS_PER_OVER,
  incomingBatter = null
) {
  let { striker, nonStriker } = batters;

  // 1. Batters cross on an odd number of runs
  if (runsRun(ball) % 2 === 1) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  // 2. Replace the dismissed batter where they now stand
  if (ball.wicket) {
    const out = ball.wicket.playerOut;
    if (out === striker) {
      striker = incomingBatter;
    } else if (out === nonStriker) {
      nonStriker = incomingBatter;
    } else {
      throw new Error(`${out} is out but is not one of the batters at the crease`);
    }
  }

  // 3. End of over: batters change ends
  const overEnded = isLegalBall(ball) && (legalBallsBefore + 1) % ballsPerOver === 0;
  if (overEnded) {
    [striker, nonStriker] = [nonStriker, striker];
  }

  return { striker, nonStriker };
}

// Replay a whole list of balls to find who is at the crease now.
//   yetToBat = the batters still to come in, in batting order
export function currentBatters(
  balls,
  openingBatters,
  ballsPerOver = BALLS_PER_OVER,
  yetToBat = []
) {
  const queue = [...yetToBat]; // copy so the caller's list is not changed
  let batters = { ...openingBatters };
  let legalBalls = 0;

  for (const ball of balls) {
    const incoming = ball.wicket ? (queue.shift() ?? null) : null;
    batters = nextBatters(batters, ball, legalBalls, ballsPerOver, incoming);
    if (isLegalBall(ball)) legalBalls += 1;
  }
  return batters;
}