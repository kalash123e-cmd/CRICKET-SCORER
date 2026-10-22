import { isLegalBall } from './ball.js';
import { BALLS_PER_OVER } from './innings.js';

// Batters are tracked as { striker, nonStriker } (any ids or names).
//
// Rules for who faces the next ball:
//   1. If the batters ran an ODD number of runs, they end up at opposite ends -> swap.
//   2. When an over ends (6th LEGAL ball), the batters swap ends again.
//   3. Both rules apply together: an odd run on the last ball of an over
//      cancels out (swap + swap = no change).
//   4. Wides and no-balls are not legal balls, so they can never end an over.

// How many runs did the batters actually run on this ball?
// The penalty run for a wide or no-ball is NOT run, so it is excluded.
// Boundaries (4s and 6s) are even, so they never change strike on their own.
export function runsRun(ball) {
  const penalty = ball.extra === 'wide' || ball.extra === 'noball' ? 1 : 0;
  return ball.runsOffBat + ball.extraRuns - penalty;
}

// Who is on strike after this ball?
// legalBallsBefore = number of legal balls bowled BEFORE this one.
export function nextBatters(
  batters,
  ball,
  legalBallsBefore,
  ballsPerOver = BALLS_PER_OVER
) {
  const legal = isLegalBall(ball);
  const overEnded = legal && (legalBallsBefore + 1) % ballsPerOver === 0;

  const oddRuns = runsRun(ball) % 2 === 1;
  const swap = oddRuns !== overEnded; // XOR: exactly one of the two rules applies

  return swap
    ? { striker: batters.nonStriker, nonStriker: batters.striker }
    : { ...batters };
}

// Replay a whole list of balls to find who is on strike now.
export function currentBatters(
  balls,
  openingBatters,
  ballsPerOver = BALLS_PER_OVER
) {
  let batters = { ...openingBatters };
  let legalBalls = 0;

  for (const ball of balls) {
    batters = nextBatters(batters, ball, legalBalls, ballsPerOver);
    if (isLegalBall(ball)) legalBalls += 1;
  }
  return batters;
}
