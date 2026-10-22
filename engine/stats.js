import { ballRuns, isBowlerWicket, isLegalBall } from './ball.js';
import { formatOvers, summarizeInnings } from './innings.js';

function createBatter(playerId) {
  return {
    playerId,
    runs: 0,
    ballsFaced: 0,
    fours: 0,
    sixes: 0,
    dismissal: null,
    strikeRate: 0,
  };
}

function createBowler(playerId) {
  return {
    playerId,
    legalBalls: 0,
    overs: '0.0',
    runsConceded: 0,
    wickets: 0,
    maidens: 0,
    wides: 0,
    noBalls: 0,
    economy: 0,
  };
}

function runsConceded(ball) {
  if (ball.noBallExtra) return ball.runsOffBat + 1;
  return ballRuns(ball) - (ball.extra === 'bye' || ball.extra === 'legbye' ? ball.extraRuns : 0);
}

export function summarizeScorecard(innings, ballsPerOver = 6) {
  const summary = summarizeInnings(innings.events.map((event) => event.ball), ballsPerOver);
  const batters = Object.fromEntries(innings.battingOrder.map((id) => [id, createBatter(id)]));
  const bowlers = new Map();
  const extras = { wides: 0, noBalls: 0, byes: 0, legByes: 0 };
  const overs = [];
  let currentOver = null;
  let overLegalBalls = 0;
  let overRuns = 0;

  for (const event of innings.events) {
    const { ball, bowlerId, striker } = event;
    const batter = batters[striker];
    if (!batter) throw new Error(`Unknown striker in innings event: ${striker}`);

    batter.runs += ball.runsOffBat;
    if (ball.runsOffBat === 4) batter.fours += 1;
    if (ball.runsOffBat === 6) batter.sixes += 1;
    if (
      ball.extra !== 'wide' &&
      ball.extra !== 'bye' &&
      ball.extra !== 'legbye' &&
      !ball.noBallExtra
    ) {
      batter.ballsFaced += 1;
    }
    if (ball.wicket) {
      const dismissed = batters[ball.wicket.playerOut];
      if (!dismissed) throw new Error(`Unknown dismissed batter: ${ball.wicket.playerOut}`);
      dismissed.dismissal = {
        type: ball.wicket.type,
        bowlerId: isBowlerWicket(ball) ? bowlerId : null,
      };
    }

    if (!bowlers.has(bowlerId)) bowlers.set(bowlerId, createBowler(bowlerId));
    const bowler = bowlers.get(bowlerId);
    bowler.runsConceded += runsConceded(ball);
    if (isLegalBall(ball)) bowler.legalBalls += 1;
    if (ball.extra === 'wide') bowler.wides += ball.extraRuns;
    if (ball.extra === 'noball') bowler.noBalls += 1;
    if (isBowlerWicket(ball)) bowler.wickets += 1;

    if (ball.extra === 'wide') extras.wides += ball.extraRuns;
    if (ball.extra === 'noball') extras.noBalls += 1;
    if (ball.extra === 'bye') extras.byes += ball.extraRuns;
    if (ball.extra === 'legbye') extras.legByes += ball.extraRuns;
    if (ball.noBallExtra === 'bye') extras.byes += ball.extraRuns - 1;
    if (ball.noBallExtra === 'legbye') extras.legByes += ball.extraRuns - 1;

    if (currentOver === null) currentOver = { bowlerId, runs: 0 };
    if (currentOver.bowlerId !== bowlerId) {
      throw new Error('A bowling change occurred within an over');
    }
    currentOver.runs += runsConceded(ball);
    overLegalBalls += isLegalBall(ball) ? 1 : 0;
    overRuns += runsConceded(ball);
    if (overLegalBalls === ballsPerOver) {
      overs.push(currentOver);
      if (currentOver.runs === 0) bowler.maidens += 1;
      currentOver = null;
      overLegalBalls = 0;
      overRuns = 0;
    }
  }

  for (const batter of Object.values(batters)) {
    if (batter.ballsFaced > 0) batter.strikeRate = (batter.runs * 100) / batter.ballsFaced;
  }
  for (const bowler of bowlers.values()) {
    bowler.overs = formatOvers(bowler.legalBalls, ballsPerOver);
    if (bowler.legalBalls > 0) {
      bowler.economy = bowler.runsConceded / (bowler.legalBalls / ballsPerOver);
    }
  }

  return {
    ...summary,
    extras,
    totalExtras: extras.wides + extras.noBalls + extras.byes + extras.legByes,
    batters: Object.values(batters),
    bowlers: [...bowlers.values()],
    currentOverRuns: overRuns,
    currentOverLegalBalls: overLegalBalls,
    completedMaidens: overs.filter((over) => over.runs === 0).length,
  };
}
