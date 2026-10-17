import { isLegalBall, ballRuns } from './ball.js';

export const BALLS_PER_OVER = 6;

// How many legal deliveries have been bowled.
export function legalBallCount(balls) {
  return balls.filter(isLegalBall).length;
}

// Team total.
export function totalRuns(balls) {
  return balls.reduce((sum, ball) => sum + ballRuns(ball), 0);
}

// Cricket notation: 27 legal balls -> "4.3" (4 overs and 3 balls).
// Store overs as balls internally; only convert to this string for display.
export function formatOvers(legalBalls, ballsPerOver = BALLS_PER_OVER) {
  const completed = Math.floor(legalBalls / ballsPerOver);
  const remainder = legalBalls % ballsPerOver;
  return `${completed}.${remainder}`;
}

// Run rate = runs per over. Returns 0 before the first legal ball.
export function runRate(runs, legalBalls, ballsPerOver = BALLS_PER_OVER) {
  if (legalBalls === 0) return 0;
  return runs / (legalBalls / ballsPerOver);
}

// Innings is over once the maximum number of overs has been bowled.
export function isInningsOver(balls, maxOvers, ballsPerOver = BALLS_PER_OVER) {
  return legalBallCount(balls) >= maxOvers * ballsPerOver;
}

// Everything the scorecard header needs, in one call.
export function summarizeInnings(balls, ballsPerOver = BALLS_PER_OVER) {
  const legalBalls = legalBallCount(balls);
  const runs = totalRuns(balls);
  return {
    runs,
    legalBalls,
    completedOvers: Math.floor(legalBalls / ballsPerOver),
    ballsInCurrentOver: legalBalls % ballsPerOver,
    overs: formatOvers(legalBalls, ballsPerOver),
    runRate: runRate(runs, legalBalls, ballsPerOver),
  };
}
