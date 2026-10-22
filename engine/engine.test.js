import { describe, it, expect } from 'vitest';
import { createBall, isLegalBall, ballRuns } from './ball.js';
import {
  legalBallCount,
  totalRuns,
  formatOvers,
  runRate,
  isInningsOver,
  summarizeInnings,
} from './innings.js';

// Small helpers to keep the tests readable.
const dot = () => createBall();
const runs = (n) => createBall({ runsOffBat: n });
const wide = (extraRuns) => createBall({ extra: 'wide', extraRuns });
const noBall = (runsOffBat = 0) => createBall({ extra: 'noball', runsOffBat });
const bye = (n) => createBall({ extra: 'bye', extraRuns: n });
const legBye = (n) => createBall({ extra: 'legbye', extraRuns: n });
const repeat = (ball, n) => Array.from({ length: n }, () => ball);

describe('createBall', () => {
  it('defaults to a dot ball', () => {
    expect(createBall()).toEqual({ runsOffBat: 0, extra: null, extraRuns: 0 });
  });

  it('gives a wide or no-ball 1 extra run by default', () => {
    expect(createBall({ extra: 'wide' }).extraRuns).toBe(1);
    expect(createBall({ extra: 'noball' }).extraRuns).toBe(1);
  });

  it('gives a bye or leg-bye 0 extra runs by default', () => {
    expect(createBall({ extra: 'bye' }).extraRuns).toBe(0);
    expect(createBall({ extra: 'legbye' }).extraRuns).toBe(0);
  });

  it('rejects negative, fractional or non-numeric runs', () => {
    expect(() => createBall({ runsOffBat: -1 })).toThrow();
    expect(() => createBall({ runsOffBat: 1.5 })).toThrow();
    expect(() => createBall({ runsOffBat: '4' })).toThrow();
  });

  it('rejects an unknown extra type', () => {
    expect(() => createBall({ extra: 'overthrow' })).toThrow();
  });

  it('rejects extraRuns without an extra type', () => {
    expect(() => createBall({ extraRuns: 2 })).toThrow();
  });
});

describe('isLegalBall', () => {
  it('counts normal deliveries as legal', () => {
    expect(isLegalBall(dot())).toBe(true);
    expect(isLegalBall(runs(4))).toBe(true);
  });

  it('does not count wides or no-balls as legal', () => {
    expect(isLegalBall(wide())).toBe(false);
    expect(isLegalBall(noBall())).toBe(false);
  });

  it('counts byes and leg-byes as legal', () => {
    expect(isLegalBall(bye(1))).toBe(true);
    expect(isLegalBall(legBye(2))).toBe(true);
  });
});

describe('ballRuns', () => {
  it('returns runs off the bat for a normal ball', () => {
    expect(ballRuns(runs(6))).toBe(6);
  });

  it('adds the wide penalty and any runs run', () => {
    expect(ballRuns(wide())).toBe(1);
    expect(ballRuns(wide(4))).toBe(4); // 1 penalty + 3 run
  });

  it('adds the no-ball penalty to runs off the bat', () => {
    expect(ballRuns(noBall(0))).toBe(1);
    expect(ballRuns(noBall(4))).toBe(5);
  });

  it('counts byes and leg-byes as team runs', () => {
    expect(ballRuns(bye(2))).toBe(2);
    expect(ballRuns(legBye(1))).toBe(1);
  });
});

describe('legalBallCount', () => {
  it('is 0 for an empty innings', () => {
    expect(legalBallCount([])).toBe(0);
  });

  it('counts only legal deliveries', () => {
    const balls = [runs(1), wide(), dot(), noBall(), bye(1)];
    expect(legalBallCount(balls)).toBe(3);
  });
});

describe('totalRuns', () => {
  it('is 0 for an empty innings', () => {
    expect(totalRuns([])).toBe(0);
  });

  it('adds runs off the bat and extras', () => {
    const balls = [runs(4), runs(1), wide(), noBall(2), bye(1), legBye(2), dot()];
    // 4 + 1 + 1 + 3 + 1 + 2 + 0
    expect(totalRuns(balls)).toBe(12);
  });
});

describe('formatOvers', () => {
  it('formats whole overs and partial overs', () => {
    expect(formatOvers(0)).toBe('0.0');
    expect(formatOvers(5)).toBe('0.5');
    expect(formatOvers(6)).toBe('1.0');
    expect(formatOvers(27)).toBe('4.3');
    expect(formatOvers(120)).toBe('20.0');
  });

  it('supports a custom balls-per-over', () => {
    expect(formatOvers(8, 4)).toBe('2.0');
    expect(formatOvers(9, 4)).toBe('2.1');
  });
});

describe('runRate', () => {
  it('is 0 before any legal ball (no divide by zero)', () => {
    expect(runRate(0, 0)).toBe(0);
    expect(runRate(5, 0)).toBe(0); // e.g. only a wide so far
  });

  it('is runs per over', () => {
    expect(runRate(36, 36)).toBe(6); // 36 runs in 6 overs
    expect(runRate(10, 12)).toBe(5); // 10 runs in 2 overs
  });

  it('works for part overs', () => {
    expect(runRate(3, 3)).toBe(6); // 3 runs in half an over
  });
});

describe('isInningsOver', () => {
  it('is false until max overs of legal balls are bowled', () => {
    expect(isInningsOver(repeat(dot(), 5), 1)).toBe(false);
    expect(isInningsOver(repeat(dot(), 6), 1)).toBe(true);
  });

  it('does not count wides or no-balls toward the limit', () => {
    const balls = [...repeat(dot(), 5), wide(), noBall()];
    expect(isInningsOver(balls, 1)).toBe(false);
    expect(isInningsOver([...balls, dot()], 1)).toBe(true);
  });
});

describe('summarizeInnings', () => {
  it('summarizes an empty innings', () => {
    expect(summarizeInnings([])).toEqual({
      runs: 0,
      legalBalls: 0,
      completedOvers: 0,
      ballsInCurrentOver: 0,
      overs: '0.0',
      runRate: 0,
    });
  });

  it('summarizes a mid-over innings with extras', () => {
    // Over 1: 1, wide, 4, dot, 2, noball+1, 0, 6  -> 6 legal balls
    // Over 2: 1, 1  -> 2 legal balls
    const balls = [
      runs(1), wide(), runs(4), dot(), runs(2), noBall(1), dot(), runs(6),
      runs(1), runs(1),
    ];
    const summary = summarizeInnings(balls);
    expect(summary.legalBalls).toBe(8);
    expect(summary.completedOvers).toBe(1);
    expect(summary.ballsInCurrentOver).toBe(2);
    expect(summary.overs).toBe('1.2');
    // 1 + 1 + 4 + 0 + 2 + 2 + 0 + 6 + 1 + 1
    expect(summary.runs).toBe(18);
    expect(summary.runRate).toBeCloseTo(13.5, 5);
  });

  it('rolls over to a new over after the sixth legal ball', () => {
    const summary = summarizeInnings(repeat(runs(1), 6));
    expect(summary.completedOvers).toBe(1);
    expect(summary.ballsInCurrentOver).toBe(0);
    expect(summary.overs).toBe('1.0');
  });

  it('does not mutate the input list', () => {
    const balls = [runs(1), wide()];
    const copy = JSON.parse(JSON.stringify(balls));
    summarizeInnings(balls);
    expect(balls).toEqual(copy);
  });
});