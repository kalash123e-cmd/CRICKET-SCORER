import { describe, it, expect } from 'vitest';
import { createBall } from './ball.js';
import { runsRun, nextBatters, currentBatters } from './strike.js';

const dot = () => createBall();
const runs = (n) => createBall({ runsOffBat: n });
const wide = (extraRuns) => createBall({ extra: 'wide', extraRuns });
const noBall = (runsOffBat = 0) => createBall({ extra: 'noball', runsOffBat });
const bye = (n) => createBall({ extra: 'bye', extraRuns: n });
const legBye = (n) => createBall({ extra: 'legbye', extraRuns: n });
const repeat = (ball, n) => Array.from({ length: n }, () => ball);

const start = { striker: 'A', nonStriker: 'B' };
const swapped = { striker: 'B', nonStriker: 'A' };

describe('runsRun', () => {
  it('equals runs off the bat for a normal ball', () => {
    expect(runsRun(runs(3))).toBe(3);
  });

  it('excludes the penalty run on a wide', () => {
    expect(runsRun(wide())).toBe(0); // plain wide: nobody ran
    expect(runsRun(wide(3))).toBe(2); // wide + 2 run
  });

  it('excludes the penalty run on a no-ball but includes bat runs', () => {
    expect(runsRun(noBall(0))).toBe(0);
    expect(runsRun(noBall(1))).toBe(1);
  });

  it('includes byes and leg-byes', () => {
    expect(runsRun(bye(2))).toBe(2);
    expect(runsRun(legBye(1))).toBe(1);
  });
});

describe('nextBatters: swap on odd runs (mid-over)', () => {
  it('keeps strike after a dot ball', () => {
    expect(nextBatters(start, dot(), 0)).toEqual(start);
  });

  it('swaps after 1 run', () => {
    expect(nextBatters(start, runs(1), 0)).toEqual(swapped);
  });

  it('keeps strike after 2 runs', () => {
    expect(nextBatters(start, runs(2), 0)).toEqual(start);
  });

  it('swaps after 3 runs', () => {
    expect(nextBatters(start, runs(3), 0)).toEqual(swapped);
  });

  it('keeps strike after a four or a six', () => {
    expect(nextBatters(start, runs(4), 0)).toEqual(start);
    expect(nextBatters(start, runs(6), 0)).toEqual(start);
  });

  it('swaps after 5 runs (for example 4 overthrows)', () => {
    expect(nextBatters(start, runs(5), 0)).toEqual(swapped);
  });
});

describe('nextBatters: extras', () => {
  it('keeps strike after a plain wide', () => {
    expect(nextBatters(start, wide(), 0)).toEqual(start);
  });

  it('swaps after a wide where the batters ran 1', () => {
    expect(nextBatters(start, wide(2), 0)).toEqual(swapped);
  });

  it('swaps after a no-ball hit for a single', () => {
    expect(nextBatters(start, noBall(1), 0)).toEqual(swapped);
  });

  it('swaps after a single bye or leg-bye', () => {
    expect(nextBatters(start, bye(1), 0)).toEqual(swapped);
    expect(nextBatters(start, legBye(1), 0)).toEqual(swapped);
  });
});

describe('nextBatters: end of over', () => {
  it('swaps after a dot ball on the 6th legal ball', () => {
    expect(nextBatters(start, dot(), 5)).toEqual(swapped);
  });

  it('cancels out: a single on the 6th legal ball keeps the same batter on strike', () => {
    expect(nextBatters(start, runs(1), 5)).toEqual(start);
  });

  it('swaps after a four on the 6th legal ball', () => {
    expect(nextBatters(start, runs(4), 5)).toEqual(swapped);
  });

  it('does not end the over on a wide, even as the 6th delivery', () => {
    // 5 legal balls bowled; the next ball is a wide, so the over is not done
    expect(nextBatters(start, wide(), 5)).toEqual(start);
  });

  it('does not end the over on a no-ball', () => {
    expect(nextBatters(start, noBall(), 5)).toEqual(start);
  });

  it('works with a custom balls-per-over', () => {
    expect(nextBatters(start, dot(), 3, 4)).toEqual(swapped);
    expect(nextBatters(start, dot(), 2, 4)).toEqual(start);
  });
});

describe('nextBatters: purity', () => {
  it('does not mutate the input batters', () => {
    const input = { striker: 'A', nonStriker: 'B' };
    nextBatters(input, runs(1), 0);
    expect(input).toEqual({ striker: 'A', nonStriker: 'B' });
  });
});

describe('currentBatters (replaying a list of balls)', () => {
  it('returns the opening pair for an empty innings', () => {
    expect(currentBatters([], start)).toEqual(start);
  });

  it('handles a full over of dot balls (swap at the end)', () => {
    expect(currentBatters(repeat(dot(), 6), start)).toEqual(swapped);
  });

  it('handles a full over of singles (6 swaps + end-of-over swap = 7 swaps)', () => {
    expect(currentBatters(repeat(runs(1), 6), start)).toEqual(swapped);
  });

  it('keeps the same striker through two dot-ball overs', () => {
    expect(currentBatters(repeat(dot(), 12), start)).toEqual(start);
  });

  it('ignores wides when counting the over', () => {
    // 5 dots + a wide = still the same over, no end-of-over swap yet
    const balls = [...repeat(dot(), 5), wide()];
    expect(currentBatters(balls, start)).toEqual(start);
    // the 6th legal ball completes the over -> swap
    expect(currentBatters([...balls, dot()], start)).toEqual(swapped);
  });

  it('follows a realistic sequence', () => {
    const balls = [
      runs(1), // A runs 1       -> B on strike
      runs(4), // B hits a four  -> B still
      wide(),  // wide           -> B still
      runs(2), // B runs 2       -> B still
      runs(1), // B runs 1       -> A on strike
      dot(),   // A dot          -> A still
      runs(1), // A single, 6th legal ball: over ends -> A still faces
    ];
    expect(currentBatters(balls, start)).toEqual({ striker: 'A', nonStriker: 'B' });
  });

  it('does not mutate the input list or opening pair', () => {
    const balls = [runs(1)];
    const opening = { striker: 'A', nonStriker: 'B' };
    currentBatters(balls, opening);
    expect(balls).toEqual([runs(1)]);
    expect(opening).toEqual({ striker: 'A', nonStriker: 'B' });
  });
});

// ---------- wickets ----------
const out = (type, playerOut = 'A', rest = {}) =>
  createBall({ ...rest, wicket: { type, playerOut } });

describe('nextBatters: wickets', () => {
  it('puts the new batter on strike when the striker is bowled', () => {
    expect(nextBatters(start, out('bowled', 'A'), 0, 6, 'C')).toEqual({
      striker: 'C',
      nonStriker: 'B',
    });
  });

  it('works the same way for a catch', () => {
    expect(nextBatters(start, out('caught', 'A'), 0, 6, 'C')).toEqual({
      striker: 'C',
      nonStriker: 'B',
    });
  });

  it('after a wicket on the last ball of the over, the not-out batter faces next', () => {
    expect(nextBatters(start, out('bowled', 'A'), 5, 6, 'C')).toEqual({
      striker: 'B',
      nonStriker: 'C',
    });
  });

  it('a stumping off a wide does not end the over', () => {
    const ball = out('stumped', 'A', { extra: 'wide' });
    expect(nextBatters(start, ball, 5, 6, 'C')).toEqual({ striker: 'C', nonStriker: 'B' });
  });

  it('replaces the non-striker when the non-striker is run out with no runs completed', () => {
    expect(nextBatters(start, out('runout', 'B'), 0, 6, 'C')).toEqual({
      striker: 'A',
      nonStriker: 'C',
    });
  });

  it('run out after completing one run: the batters have crossed first', () => {
    // A and B cross (1 run), then A is run out going for the second.
    // After crossing: B is on strike, A is at the other end -> C replaces A there.
    const ball = out('runout', 'A', { runsOffBat: 1 });
    expect(nextBatters(start, ball, 0, 6, 'C')).toEqual({ striker: 'B', nonStriker: 'C' });
  });

  it('run out of the other batter after one run puts the new batter on strike', () => {
    // After crossing: B is on strike. B is run out -> C takes the striker end.
    const ball = out('runout', 'B', { runsOffBat: 1 });
    expect(nextBatters(start, ball, 0, 6, 'C')).toEqual({ striker: 'C', nonStriker: 'A' });
  });

  it('leaves an empty slot when nobody is left to come in (last wicket)', () => {
    expect(nextBatters(start, out('bowled', 'A'), 0)).toEqual({
      striker: null,
      nonStriker: 'B',
    });
  });

  it('throws if the dismissed player is not at the crease', () => {
    expect(() => nextBatters(start, out('bowled', 'Z'), 0, 6, 'C')).toThrow();
  });

  it('does not mutate the input batters', () => {
    const input = { striker: 'A', nonStriker: 'B' };
    nextBatters(input, out('bowled', 'A'), 0, 6, 'C');
    expect(input).toEqual({ striker: 'A', nonStriker: 'B' });
  });
});

describe('currentBatters with wickets', () => {
  it('brings in the next batter from the batting order', () => {
    expect(currentBatters([out('bowled', 'A')], start, 6, ['C', 'D'])).toEqual({
      striker: 'C',
      nonStriker: 'B',
    });
  });

  it('brings in batters in order across several wickets', () => {
    const balls = [out('bowled', 'A'), out('lbw', 'C')];
    expect(currentBatters(balls, start, 6, ['C', 'D', 'E'])).toEqual({
      striker: 'D',
      nonStriker: 'B',
    });
  });

  it('handles a wicket on the sixth legal ball of an over', () => {
    const balls = [...repeat(dot(), 5), out('bowled', 'A')];
    expect(currentBatters(balls, start, 6, ['C'])).toEqual({
      striker: 'B',
      nonStriker: 'C',
    });
  });

  it('leaves an empty slot when the batting order runs out', () => {
    expect(currentBatters([out('bowled', 'A')], start, 6, [])).toEqual({
      striker: null,
      nonStriker: 'B',
    });
  });

  it('does not change the yetToBat list you pass in', () => {
    const queue = ['C', 'D'];
    currentBatters([out('bowled', 'A')], start, 6, queue);
    expect(queue).toEqual(['C', 'D']);
  });
});