import { describe, expect, it } from 'vitest';
import { createBall } from './ball.js';
import { createMatch, recordBall, startSecondInnings, summarizeMatch, undoLastBall } from './match.js';

const teams = [
  { id: 'A', playerIds: ['A1', 'A2'] },
  { id: 'B', playerIds: ['B1', 'B2'] },
];
const opening = { striker: 'A1', nonStriker: 'A2' };
const ball = (runsOffBat = 0) => createBall({ runsOffBat });
const record = (match, scored = 0, bowler = 'B1') => recordBall(match, ball(scored), bowler);

function completedFirstInnings() {
  let match = createMatch({ teams, battingFirstTeamId: 'A', openingBatters: opening, overs: 1 });
  for (let i = 0; i < 6; i += 1) match = record(match);
  return match;
}

describe('match flow', () => {
  it('plays two innings and determines a successful chase', () => {
    const first = completedFirstInnings();
    expect(first.status).toBe('innings_break');

    let match = startSecondInnings(first, { striker: 'B1', nonStriker: 'B2' });
    expect(match.status).toBe('in_progress');
    match = record(match, 1, 'A1');

    expect(match.status).toBe('completed');
    expect(match.result).toEqual({
      winnerTeamId: 'B',
      outcome: 'won',
      margin: { type: 'wickets', value: 1 },
    });
    expect(summarizeMatch(match).target).toBe(1);
  });

  it('returns a tie when both teams finish on the same score', () => {
    let match = createMatch({
      teams,
      battingFirstTeamId: 'A',
      openingBatters: opening,
      overs: 1,
    });
    match = record(match, 1);
    for (let i = 1; i < 6; i += 1) match = record(match);
    match = startSecondInnings(match, { striker: 'B1', nonStriker: 'B2' });
    match = record(match, 1, 'A1');
    for (let i = 1; i < 6; i += 1) match = record(match, 0, 'A1');

    expect(match.status).toBe('completed');
    expect(match.result).toEqual({ winnerTeamId: null, outcome: 'tie', margin: null });
  });

  it('supports undoing the last delivery without mutating the prior match', () => {
    const initial = createMatch({ teams, battingFirstTeamId: 'A', openingBatters: opening, overs: 1 });
    const scored = record(initial, 4);
    const undone = undoLastBall(scored);

    expect(scored.innings[0].events).toHaveLength(1);
    expect(undone.innings[0].events).toHaveLength(0);
    expect(undone.innings[0].batters).toEqual(opening);
  });

  it('rejects a bowler change within an over and consecutive overs by one bowler', () => {
    let match = createMatch({ teams, battingFirstTeamId: 'A', openingBatters: opening, overs: 2 });
    match = recordBall(match, ball(), 'B1');
    expect(() => recordBall(match, ball(), 'B2')).toThrow(/over is complete/);

    for (let i = 1; i < 6; i += 1) match = record(match);
    expect(() => record(match, 0, 'B1')).toThrow(/consecutive overs/);
    expect(record(match, 0, 'B2').innings[0].events).toHaveLength(7);
  });

  it('enforces the configured per-bowler over quota', () => {
    let match = createMatch({
      teams,
      battingFirstTeamId: 'A',
      openingBatters: opening,
      overs: 3,
      maxOversPerBowler: 1,
    });
    for (let i = 0; i < 6; i += 1) match = record(match, 0, 'B1');
    for (let i = 0; i < 6; i += 1) match = record(match, 0, 'B2');
    expect(() => record(match, 0, 'B1')).toThrow(/maximum overs/);
  });

  it('rejects an innings setup with invalid opening batters', () => {
    expect(() =>
      createMatch({ teams, battingFirstTeamId: 'A', openingBatters: { striker: 'A1', nonStriker: 'B1' }, overs: 1 })
    ).toThrow(/batting team/);
  });
});
