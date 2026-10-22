import { isLegalBall, ballRuns, isWicket } from './ball.js';

export const BALLS_PER_OVER = 6;
export const DEFAULT_MAX_WICKETS = 10;

function validateBalls(balls) {
  if (!Array.isArray(balls)) throw new Error('balls must be an array');
}

function validateBallsPerOver(ballsPerOver) {
  if (!Number.isInteger(ballsPerOver) || ballsPerOver <= 0) {
    throw new Error('ballsPerOver must be a positive integer');
  }
}

// How many legal deliveries have been bowled.
export function legalBallCount(balls) {
  validateBalls(balls);
  return balls.filter(isLegalBall).length;
}

// Team total.
export function totalRuns(balls) {
  validateBalls(balls);
  return balls.reduce((sum, ball) => sum + ballRuns(ball), 0);
}

// Cricket notation: 27 legal balls -> "4.3" (4 overs and 3 balls).
// Store overs as balls internally; only convert to this string for display.
export function formatOvers(legalBalls, ballsPerOver = BALLS_PER_OVER) {
  if (!Number.isInteger(legalBalls) || legalBalls < 0) {
    throw new Error('legalBalls must be a non-negative integer');
  }
  validateBallsPerOver(ballsPerOver);
  const completed = Math.floor(legalBalls / ballsPerOver);
  const remainder = legalBalls % ballsPerOver;
  return `${completed}.${remainder}`;
}

// Run rate = runs per over. Returns 0 before the first legal ball.
export function runRate(runs, legalBalls, ballsPerOver = BALLS_PER_OVER) {
  if (!Number.isFinite(runs) || runs < 0) throw new Error('runs must be a non-negative number');
  if (!Number.isInteger(legalBalls) || legalBalls < 0) {
    throw new Error('legalBalls must be a non-negative integer');
  }
  validateBallsPerOver(ballsPerOver);
  if (legalBalls === 0) return 0;
  return runs / (legalBalls / ballsPerOver);
}

// How many batters are out.
export function wicketCount(balls) {
  validateBalls(balls);
  return balls.filter(isWicket).length;
}

// Innings is over once the maximum number of overs has been bowled.
export function isInningsOver(balls, maxOvers, ballsPerOver = BALLS_PER_OVER) {
  validateBalls(balls);
  if (!Number.isInteger(maxOvers) || maxOvers < 0) {
    throw new Error('maxOvers must be a non-negative integer');
  }
  validateBallsPerOver(ballsPerOver);
  return legalBallCount(balls) >= maxOvers * ballsPerOver;
}

// All out: the batting side has lost all the wickets it can lose.
// (10 for a full team of 11; pass a smaller number for smaller teams.)
export function isAllOut(balls, maxWickets = DEFAULT_MAX_WICKETS) {
  validateBalls(balls);
  if (!Number.isInteger(maxWickets) || maxWickets < 0) {
    throw new Error('maxWickets must be a non-negative integer');
  }
  return wicketCount(balls) >= maxWickets;
}

// The innings ends when overs run out OR the side is all out.
export function isInningsComplete(
  balls,
  maxOvers,
  maxWickets = DEFAULT_MAX_WICKETS,
  ballsPerOver = BALLS_PER_OVER
) {
  return isInningsOver(balls, maxOvers, ballsPerOver) || isAllOut(balls, maxWickets);
}

// Everything the scorecard header needs, in one call.
export function summarizeInnings(balls, ballsPerOver = BALLS_PER_OVER) {
  validateBalls(balls);
  validateBallsPerOver(ballsPerOver);
  const legalBalls = legalBallCount(balls);
  const runs = totalRuns(balls);
  return {
    runs,
    wickets: wicketCount(balls),
    legalBalls,
    completedOvers: Math.floor(legalBalls / ballsPerOver),
    ballsInCurrentOver: legalBalls % ballsPerOver,
    overs: formatOvers(legalBalls, ballsPerOver),
    runRate: runRate(runs, legalBalls, ballsPerOver),
  };
}