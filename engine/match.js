import { createBall, isLegalBall } from './ball.js';
import { isAllOut, isInningsOver, summarizeInnings } from './innings.js';
import { nextBatters } from './strike.js';

function assertPositiveInteger(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
}

function validateOpeningBatters(openingBatters, battingOrder) {
  const { striker, nonStriker } = openingBatters ?? {};
  if (!striker || !nonStriker || striker === nonStriker) {
    throw new Error('Opening batters must be two different player IDs');
  }
  if (!battingOrder.includes(striker) || !battingOrder.includes(nonStriker)) {
    throw new Error('Opening batters must belong to the batting team');
  }
}

function createInnings({ battingTeamId, bowlingTeamId, battingOrder, openingBatters, ballsPerOver }) {
  validateOpeningBatters(openingBatters, battingOrder);
  const used = new Set([openingBatters.striker, openingBatters.nonStriker]);
  return {
    battingTeamId,
    bowlingTeamId,
    battingOrder: [...battingOrder],
    openingBatters: { ...openingBatters },
    batters: { ...openingBatters },
    yetToBat: battingOrder.filter((playerId) => !used.has(playerId)),
    ballsPerOver,
    events: [],
    status: 'in_progress',
  };
}

function inningsSummary(innings) {
  return summarizeInnings(innings.events.map((event) => event.ball), innings.ballsPerOver);
}

function isComplete(innings, maxOvers, maxWickets) {
  return (
    isInningsOver(innings.events.map((event) => event.ball), maxOvers, innings.ballsPerOver) ||
    isAllOut(innings.events.map((event) => event.ball), maxWickets)
  );
}

function withResult(match, result) {
  return { ...match, status: 'completed', result };
}

function ensureTeam(team) {
  if (!team || typeof team.id !== 'string' || !team.id || !Array.isArray(team.playerIds)) {
    throw new Error('Each team must have a non-empty id and a playerIds array');
  }
  if (team.playerIds.length < 2 || team.playerIds.some((id) => typeof id !== 'string' || !id)) {
    throw new Error('Each team must have at least two player IDs');
  }
  if (new Set(team.playerIds).size !== team.playerIds.length) {
    throw new Error(`Team ${team.id} contains duplicate player IDs`);
  }
}

export function createMatch({
  teams,
  battingFirstTeamId,
  openingBatters,
  overs,
  ballsPerOver = 6,
  maxOversPerBowler = Math.ceil(overs / 5),
}) {
  if (!Array.isArray(teams) || teams.length !== 2) {
    throw new Error('A match requires exactly two teams');
  }
  teams.forEach(ensureTeam);
  if (teams[0].id === teams[1].id) throw new Error('Team IDs must be different');
  if (new Set(teams.flatMap((team) => team.playerIds)).size !== teams[0].playerIds.length + teams[1].playerIds.length) {
    throw new Error('A player cannot belong to both teams in a match');
  }
  assertPositiveInteger(overs, 'overs');
  assertPositiveInteger(ballsPerOver, 'ballsPerOver');
  assertPositiveInteger(maxOversPerBowler, 'maxOversPerBowler');
  if (maxOversPerBowler > overs) {
    throw new Error('maxOversPerBowler cannot exceed the match overs');
  }
  const battingTeam = teams.find((team) => team.id === battingFirstTeamId);
  if (!battingTeam) throw new Error('battingFirstTeamId must match one of the team IDs');
  const bowlingTeam = teams.find((team) => team.id !== battingFirstTeamId);
  return {
    teams: teams.map((team) => ({ id: team.id, playerIds: [...team.playerIds] })),
    overs,
    ballsPerOver,
    maxOversPerBowler,
    status: 'in_progress',
    result: null,
    innings: [
      createInnings({
        battingTeamId: battingTeam.id,
        bowlingTeamId: bowlingTeam.id,
        battingOrder: battingTeam.playerIds,
        openingBatters,
        ballsPerOver,
      }),
    ],
  };
}

export function startSecondInnings(match, openingBatters) {
  if (match.status !== 'innings_break' || match.innings.length !== 1) {
    throw new Error('The first innings must be complete before starting the second innings');
  }
  const first = match.innings[0];
  const battingTeam = match.teams.find((team) => team.id === first.bowlingTeamId);
  const second = createInnings({
    battingTeamId: first.bowlingTeamId,
    bowlingTeamId: first.battingTeamId,
    battingOrder: battingTeam.playerIds,
    openingBatters,
    ballsPerOver: match.ballsPerOver,
  });
  return { ...match, status: 'in_progress', innings: [...match.innings, second] };
}

function currentOverNumber(innings) {
  return Math.floor(inningsSummary(innings).legalBalls / innings.ballsPerOver);
}

function bowlerForOver(innings, overNumber) {
  let legalBalls = 0;
  for (const event of innings.events) {
    if (Math.floor(legalBalls / innings.ballsPerOver) === overNumber) return event.bowlerId;
    if (isLegalBall(event.ball)) legalBalls += 1;
  }
  return null;
}

function matchResult(match, secondInnings) {
  const first = inningsSummary(match.innings[0]);
  const second = inningsSummary(secondInnings);
  if (second.runs === first.runs) {
    return { winnerTeamId: null, outcome: 'tie', margin: null };
  }
  if (second.runs > first.runs) {
    return {
      winnerTeamId: secondInnings.battingTeamId,
      outcome: 'won',
      margin: { type: 'wickets', value: secondInnings.battingOrder.length - 1 - second.wickets },
    };
  }
  return {
    winnerTeamId: match.innings[0].battingTeamId,
    outcome: 'won',
    margin: { type: 'runs', value: first.runs - second.runs },
  };
}

export function recordBall(match, inputBall, bowlerId) {
  if (match.status !== 'in_progress') throw new Error('The match is not accepting deliveries');
  if (typeof bowlerId !== 'string' || !bowlerId) throw new Error('bowlerId is required');
  const innings = match.innings[match.innings.length - 1];
  const bowlingTeam = match.teams.find((team) => team.id === innings.bowlingTeamId);
  if (!bowlingTeam.playerIds.includes(bowlerId)) throw new Error('The bowler must belong to the bowling team');
  const maxWickets = innings.battingOrder.length - 1;
  if (isComplete(innings, match.overs, maxWickets)) throw new Error('The innings is already complete');

  const ball = createBall(inputBall);
  const overNumber = currentOverNumber(innings);
  const currentBowler = bowlerForOver(innings, overNumber);
  if (currentBowler && currentBowler !== bowlerId) {
    throw new Error('The bowler cannot change before the over is complete');
  }
  if (!currentBowler && overNumber > 0) {
    const previousBowler = bowlerForOver(innings, overNumber - 1);
    if (previousBowler === bowlerId) throw new Error('A bowler cannot bowl consecutive overs');
  }
  const bowlerLegalBalls = innings.events.reduce(
    (count, event) => count + (event.bowlerId === bowlerId && isLegalBall(event.ball) ? 1 : 0),
    0
  );
  if (
    !currentBowler &&
    bowlerLegalBalls >= match.maxOversPerBowler * match.ballsPerOver
  ) {
    throw new Error('The bowler has reached the maximum overs allowed');
  }

  const event = {
    ball,
    bowlerId,
    striker: innings.batters.striker,
    nonStriker: innings.batters.nonStriker,
  };
  const incomingBatter = ball.wicket ? innings.yetToBat[0] ?? null : null;
  const batters = nextBatters(
    innings.batters,
    ball,
    inningsSummary(innings).legalBalls,
    innings.ballsPerOver,
    incomingBatter
  );
  const updatedInnings = {
    ...innings,
    events: [...innings.events, event],
    batters,
    yetToBat: ball.wicket ? innings.yetToBat.slice(1) : innings.yetToBat,
  };
  const updatedMatch = {
    ...match,
    innings: [...match.innings.slice(0, -1), updatedInnings],
  };
  const summary = inningsSummary(updatedInnings);
  const target = match.innings.length === 2 ? inningsSummary(match.innings[0]).runs + 1 : null;

  if (target !== null && summary.runs >= target) {
    const completeInnings = { ...updatedInnings, status: 'complete' };
    const completeMatch = {
      ...updatedMatch,
      innings: [...updatedMatch.innings.slice(0, -1), completeInnings],
    };
    return withResult(completeMatch, matchResult(completeMatch, completeInnings));
  }
  if (isComplete(updatedInnings, match.overs, maxWickets)) {
    const completeInnings = { ...updatedInnings, status: 'complete' };
    const completeMatch = {
      ...updatedMatch,
      innings: [...updatedMatch.innings.slice(0, -1), completeInnings],
    };
    if (match.innings.length === 1) return { ...completeMatch, status: 'innings_break' };
    return withResult(completeMatch, matchResult(completeMatch, completeInnings));
  }
  return updatedMatch;
}

export function undoLastBall(match) {
  if (match.innings.length === 0) throw new Error('There is no innings to undo');
  const index = match.innings.length - 1;
  const innings = match.innings[index];
  if (innings.events.length === 0) throw new Error('There is no delivery to undo');
  const events = innings.events.slice(0, -1);
  let batters = { ...innings.openingBatters };
  let yetToBat = innings.battingOrder.filter(
    (playerId) => playerId !== innings.openingBatters.striker && playerId !== innings.openingBatters.nonStriker
  );
  let legalBalls = 0;
  for (const event of events) {
    const incoming = event.ball.wicket ? yetToBat[0] ?? null : null;
    batters = nextBatters(batters, event.ball, legalBalls, innings.ballsPerOver, incoming);
    if (event.ball.wicket) yetToBat = yetToBat.slice(1);
    if (isLegalBall(event.ball)) legalBalls += 1;
  }
  const restored = { ...innings, events, batters, yetToBat, status: 'in_progress' };
  const remaining = [...match.innings.slice(0, index), restored];
  if (index === 1) {
    const first = remaining[0];
    const firstComplete = isComplete(first, match.overs, first.battingOrder.length - 1);
    if (!firstComplete) throw new Error('Cannot undo across an innings boundary');
    return { ...match, status: 'in_progress', result: null, innings: remaining };
  }
  return { ...match, status: 'in_progress', result: null, innings: remaining };
}

export function summarizeMatch(match) {
  return {
    status: match.status,
    target: match.innings.length === 2 ? inningsSummary(match.innings[0]).runs + 1 : null,
    innings: match.innings.map((innings) => ({
      battingTeamId: innings.battingTeamId,
      bowlingTeamId: innings.bowlingTeamId,
      ...inningsSummary(innings),
      complete: innings.status === 'complete' || isComplete(innings, match.overs, innings.battingOrder.length - 1),
    })),
    result: match.result,
  };
}
