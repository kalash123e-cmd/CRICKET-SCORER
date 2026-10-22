import { describe, expect, it } from 'vitest';
import { createBall } from './ball.js';
import { summarizeScorecard } from './stats.js';

const event = (ball, striker = 'A', bowlerId = 'X') => ({ ball, striker, bowlerId });

describe('summarizeScorecard', () => {
  it('calculates batter, bowler, and extras figures from delivery events', () => {
    const innings = {
      battingOrder: ['A', 'B'],
      events: [
        event(createBall()),
        event(createBall({ runsOffBat: 4 })),
        event(createBall({ extra: 'bye', extraRuns: 2 })),
        event(createBall({ extra: 'wide', extraRuns: 2 })),
        event(createBall({ runsOffBat: 1, extra: 'noball' })),
        event(createBall({ wicket: { type: 'bowled', playerOut: 'A' } })),
      ],
    };

    const scorecard = summarizeScorecard(innings);
    expect(scorecard.runs).toBe(10);
    expect(scorecard.legalBalls).toBe(4);
    expect(scorecard.extras).toEqual({ wides: 2, noBalls: 1, byes: 2, legByes: 0 });
    expect(scorecard.totalExtras).toBe(5);
    expect(scorecard.batters[0]).toMatchObject({
      playerId: 'A',
      runs: 5,
      ballsFaced: 4,
      fours: 1,
      dismissal: { type: 'bowled', bowlerId: 'X' },
    });
    expect(scorecard.bowlers[0]).toMatchObject({
      playerId: 'X',
      legalBalls: 4,
      overs: '0.4',
      runsConceded: 8,
      wickets: 1,
      wides: 2,
      noBalls: 1,
    });
    expect(scorecard.bowlers[0].economy).toBe(12);
  });

  it('counts a completed six-ball scoreless over as a maiden', () => {
    const innings = {
      battingOrder: ['A', 'B'],
      events: Array.from({ length: 6 }, () => event(createBall())),
    };
    const scorecard = summarizeScorecard(innings);
    expect(scorecard.bowlers[0].maidens).toBe(1);
    expect(scorecard.completedMaidens).toBe(1);
    expect(scorecard.currentOverLegalBalls).toBe(0);
  });

  it('separates a no-ball penalty from byes for bowler figures', () => {
    const innings = {
      battingOrder: ['A', 'B'],
      events: [
        event(createBall({ extra: 'noball', extraRuns: 3, noBallExtra: 'bye' })),
      ],
    };
    const scorecard = summarizeScorecard(innings);
    expect(scorecard.runs).toBe(3);
    expect(scorecard.extras).toEqual({ wides: 0, noBalls: 1, byes: 2, legByes: 0 });
    expect(scorecard.bowlers[0]).toMatchObject({ runsConceded: 1, noBalls: 1, legalBalls: 0 });
  });

  it('credits no-ball boundary runs to the batter and separates the penalty', () => {
    const innings = {
      battingOrder: ['A', 'B'],
      events: [event(createBall({ extra: 'noball', runsOffBat: 4 }))],
    };
    const scorecard = summarizeScorecard(innings);
    expect(scorecard.runs).toBe(5);
    expect(scorecard.extras.noBalls).toBe(1);
    expect(scorecard.batters[0]).toMatchObject({ runs: 4, ballsFaced: 1, fours: 1 });
    expect(scorecard.bowlers[0]).toMatchObject({ runsConceded: 5, noBalls: 1 });
  });

  it('records wide running runs and no-ball leg-byes in the right columns', () => {
    const innings = {
      battingOrder: ['A', 'B'],
      events: [
        event(createBall({ extra: 'wide', extraRuns: 3 })),
        event(createBall({ extra: 'noball', extraRuns: 3, noBallExtra: 'legbye' })),
      ],
    };
    const scorecard = summarizeScorecard(innings);
    expect(scorecard.runs).toBe(6);
    expect(scorecard.extras).toEqual({ wides: 3, noBalls: 1, byes: 0, legByes: 2 });
    expect(scorecard.bowlers[0]).toMatchObject({ runsConceded: 4, wides: 3, noBalls: 1 });
  });
});
