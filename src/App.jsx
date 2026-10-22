import { useEffect, useMemo, useState } from 'react';
import {
  createBall,
  createMatch,
  recordBall,
  startSecondInnings,
  summarizeMatch,
  summarizeScorecard,
  undoLastBall,
} from '../engine/index.js';

const DEFAULT_NAMES = 'Aarav, Kabir, Dev, Ishaan, Arjun, Rohan, Vihaan, Aditya, Reyansh, Kunal, Manav';
const WICKET_TYPES = [
  ['bowled', 'Bowled'],
  ['caught', 'Caught'],
  ['lbw', 'LBW'],
  ['stumped', 'Stumped'],
  ['runout', 'Run out'],
  ['hitwicket', 'Hit wicket'],
];

function makeTeam(id, name, playerText) {
  const players = playerText.split(',').map((player) => player.trim()).filter(Boolean);
  return {
    id,
    name: name.trim(),
    playerIds: players.map((_, index) => `${id}-p${index + 1}`),
    players: Object.fromEntries(players.map((player, index) => [`${id}-p${index + 1}`, player])),
  };
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Setup({ onStart }) {
  const [teamA, setTeamA] = useState('Harbour Hawks');
  const [teamB, setTeamB] = useState('Valley Vipers');
  const [playersA, setPlayersA] = useState(DEFAULT_NAMES);
  const [playersB, setPlayersB] = useState('Ayaan, Siddharth, Vivaan, Rudra, Dhruv, Parth, Yuvraj, Neil, Om, Shaurya, Aryan');
  const [overs, setOvers] = useState('10');
  const [battingFirst, setBattingFirst] = useState('A');
  const [striker, setStriker] = useState('A-p1');
  const [nonStriker, setNonStriker] = useState('A-p2');
  const [bowler, setBowler] = useState('B-p1');
  const [error, setError] = useState('');

  const a = useMemo(() => makeTeam('A', teamA, playersA), [teamA, playersA]);
  const b = useMemo(() => makeTeam('B', teamB, playersB), [teamB, playersB]);
  const battingTeam = battingFirst === 'A' ? a : b;
  const bowlingTeam = battingFirst === 'A' ? b : a;
  const playerNames = { ...a.players, ...b.players };

  useEffect(() => {
    if (!battingTeam.playerIds.includes(striker)) setStriker(battingTeam.playerIds[0] ?? '');
    if (!battingTeam.playerIds.includes(nonStriker) || nonStriker === striker) {
      setNonStriker(battingTeam.playerIds.find((id) => id !== striker) ?? '');
    }
    if (!bowlingTeam.playerIds.includes(bowler)) setBowler(bowlingTeam.playerIds[0] ?? '');
  }, [battingTeam, bowlingTeam, striker, nonStriker, bowler]);

  function start(event) {
    event.preventDefault();
    try {
      if (!a.name || !b.name) throw new Error('Enter a name for both teams.');
      if (a.playerIds.length < 2 || b.playerIds.length < 2) throw new Error('Add at least two players to each team.');
      if (striker === nonStriker) throw new Error('Choose two different opening batters.');
      const match = createMatch({
        teams: [
          { id: a.id, playerIds: a.playerIds },
          { id: b.id, playerIds: b.playerIds },
        ],
        battingFirstTeamId: battingFirst,
        openingBatters: { striker, nonStriker },
        overs: Number(overs),
      });
      onStart({
        match,
        teamNames: { A: a.name, B: b.name },
        playerNames,
        firstBowler: bowler,
      });
    } catch (cause) {
      setError(cause.message);
    }
  }

  const battingPlayers = battingTeam.playerIds.map((id) => [id, battingTeam.players[id]]);
  const bowlingPlayers = bowlingTeam.playerIds.map((id) => [id, bowlingTeam.players[id]]);

  return (
    <main className="setup-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Boundary home">
          <span className="brand-mark">B</span> boundary<span className="brand-dot">.</span>
        </a>
        <span className="topbar-note">THE GAME, IN YOUR HANDS</span>
      </header>
      <section className="setup-layout">
        <div className="setup-copy">
          <span className="eyebrow"><span className="live-dot" /> MATCH CENTRE</span>
          <h1>Every ball<br />tells a story.</h1>
          <p>Set up your game and keep every run, wicket, and over right where it belongs.</p>
          <div className="feature-note"><span>01</span><div><b>Made for the boundary</b><small>Fast, clear, ball-by-ball scoring.</small></div></div>
          <div className="feature-note"><span>02</span><div><b>Your score stays yours</b><small>This demo keeps the match in memory.</small></div></div>
        </div>

        <form className="setup-card" onSubmit={start}>
          <div className="card-heading">
            <div><span className="eyebrow">NEW GAME</span><h2>Set up your match</h2></div>
            <span className="step-pill">01 / 01</span>
          </div>
          <div className="teams-grid">
            <div className="team-setup">
              <div className="team-label"><i className="team-dot team-a" /> TEAM A</div>
              <Field label="Team name"><input value={teamA} onChange={(event) => setTeamA(event.target.value)} required /></Field>
              <Field label="Players — comma separated"><textarea rows="3" value={playersA} onChange={(event) => setPlayersA(event.target.value)} /></Field>
            </div>
            <div className="team-setup">
              <div className="team-label"><i className="team-dot team-b" /> TEAM B</div>
              <Field label="Team name"><input value={teamB} onChange={(event) => setTeamB(event.target.value)} required /></Field>
              <Field label="Players — comma separated"><textarea rows="3" value={playersB} onChange={(event) => setPlayersB(event.target.value)} /></Field>
            </div>
          </div>
          <div className="form-divider" />
          <div className="form-grid">
            <Field label="Match overs"><input type="number" min="1" max="50" value={overs} onChange={(event) => setOvers(event.target.value)} required /></Field>
            <Field label="Batting first"><select value={battingFirst} onChange={(event) => setBattingFirst(event.target.value)}><option value="A">{a.name || 'Team A'}</option><option value="B">{b.name || 'Team B'}</option></select></Field>
          </div>
          <div className="form-grid">
            <Field label="Opening striker"><select value={striker} onChange={(event) => setStriker(event.target.value)}>{battingPlayers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
            <Field label="Non-striker"><select value={nonStriker} onChange={(event) => setNonStriker(event.target.value)}>{battingPlayers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
          </div>
          <Field label="Opening bowler"><select value={bowler} onChange={(event) => setBowler(event.target.value)}>{bowlingPlayers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></Field>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="primary-button start-button" type="submit">Start scoring <span>↗</span></button>
          <p className="privacy-note">No account needed · Match data is not saved yet</p>
        </form>
      </section>
      <footer className="page-footer"><span>BOUNDARY SCORER</span><span>BUILT FOR THE LOVE OF THE GAME</span></footer>
    </main>
  );
}

function Scoreboard({ match, teamNames, playerNames, firstBowler, onBall, onUndo, onStartSecond }) {
  const summary = summarizeMatch(match);
  const innings = match.innings.at(-1);
  const inningsScore = summary.innings.at(-1);
  const firstInnings = match.innings[0];
  const firstScore = summary.innings[0];
  const scorecard = summarizeScorecard(innings, match.ballsPerOver);
  const battingTeamName = teamNames[innings.battingTeamId];
  const bowlingTeam = match.teams.find((team) => team.id === innings.bowlingTeamId);
  const currentBowlerId = innings.events.at(-1)?.bowlerId;
  const [selectedBowler, setSelectedBowler] = useState(
    currentBowlerId ?? (match.innings.length === 1 ? firstBowler : bowlingTeam.playerIds[0]),
  );
  const [wicketType, setWicketType] = useState('bowled');
  const [playerOut, setPlayerOut] = useState(innings.batters.striker ?? '');
  const [selectedExtra, setSelectedExtra] = useState(null);
  const [extraRuns, setExtraRuns] = useState('0');
  const [noBallRunType, setNoBallRunType] = useState('bat');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [secondStriker, setSecondStriker] = useState('');
  const [secondNonStriker, setSecondNonStriker] = useState('');

  const currentLegal = inningsScore.legalBalls;
  const overStartIndex = (() => {
    let legal = 0;
    for (let index = 0; index < innings.events.length; index += 1) {
      if (legal === Math.floor(currentLegal / match.ballsPerOver) * match.ballsPerOver) return index;
      if (innings.events[index].ball.extra !== 'wide' && innings.events[index].ball.extra !== 'noball') legal += 1;
    }
    return innings.events.length;
  })();
  const lastOverEvents = innings.events.slice(overStartIndex);
  const facing = innings.batters.striker;
  const target = summary.target;
  const needed = target === null ? null : Math.max(0, target - inningsScore.runs);
  const ballsLeft = target === null ? null : Math.max(0, match.overs * match.ballsPerOver - currentLegal);
  const currentOverBowler = innings.events.slice(overStartIndex).find((event) => event.bowlerId)?.bowlerId;
  const bowlerLocked = Boolean(currentOverBowler);
  const bowlerOptions = bowlingTeam.playerIds.map((id) => ({ id, name: playerNames[id] }));

  function submitBall(input) {
    try {
      const result = onBall(input, selectedBowler);
      setError('');
      setSuccess(result.status === 'innings_break' ? 'Innings complete. Set up the chase below.' : '');
      if (input.wicket) setPlayerOut(result.innings.at(-1).batters.striker ?? result.innings.at(-1).batters.nonStriker ?? '');
    } catch (cause) {
      setError(cause.message);
      setSuccess('');
    }
  }

  function submitExtra() {
    const runs = Number(extraRuns);
    if (!Number.isInteger(runs) || runs < 0) {
      setError('Enter a whole number of runs, zero or more.');
      return;
    }

    if (selectedExtra === 'wide') {
      submitBall({ extra: 'wide', extraRuns: runs + 1 });
    } else if (selectedExtra === 'bye' || selectedExtra === 'legbye') {
      submitBall({ extra: selectedExtra, extraRuns: runs });
    } else if (selectedExtra === 'noball' && noBallRunType === 'bat') {
      submitBall({ extra: 'noball', runsOffBat: runs });
    } else if (selectedExtra === 'noball') {
      submitBall({
        extra: 'noball',
        extraRuns: runs + 1,
        noBallExtra: runs > 0 ? noBallRunType : null,
      });
    }
    setSelectedExtra(null);
    setExtraRuns('0');
  }

  const isFirstBreak = match.status === 'innings_break';
  const secondBattingTeam = match.teams.find((team) => team.id === firstInnings.bowlingTeamId);
  const canStartSecond = isFirstBreak && secondBattingTeam.playerIds.length >= 2;

  return (
    <main className="match-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Boundary home"><span className="brand-mark">B</span> boundary<span className="brand-dot">.</span></a>
        <div className="match-status"><span className="live-dot" />{match.status === 'completed' ? 'MATCH COMPLETE' : isFirstBreak ? 'INNINGS BREAK' : 'LIVE SCORING'}</div>
        <button className="text-button" type="button" onClick={onUndo} disabled={!innings.events.length}>↶ <span>Undo last ball</span></button>
      </header>

      <div className="match-content">
        <div className="match-heading">
          <div><span className="eyebrow">LIMITED OVERS · {match.overs} OVERS</span><h1>{teamNames.A}<span className="versus"> vs </span>{teamNames.B}</h1></div>
          <span className="innings-badge">INNINGS {match.innings.length} OF 2</span>
        </div>

        <section className="score-hero">
          <div className="score-main">
            <div className="score-team-label"><i className={`team-dot ${innings.battingTeamId === 'A' ? 'team-a' : 'team-b'}`} /> {battingTeamName} <span>· BATTING</span></div>
            <div className="runs-display">{inningsScore.runs}<span>/{inningsScore.wickets}</span></div>
            <div className="score-subline">{inningsScore.overs} <span>overs</span><i /> CRR <b>{inningsScore.runRate.toFixed(2)}</b></div>
          </div>
          <div className="score-stats">
            <div className="stat-box"><span>RUN RATE</span><b>{inningsScore.runRate.toFixed(2)}</b></div>
            <div className="stat-box"><span>EXTRAS</span><b>{scorecard.totalExtras}</b></div>
            {target !== null && <div className="stat-box chase-stat"><span>NEED {needed} FROM {ballsLeft}</span><b>TARGET {target}</b></div>}
          </div>
          {match.status === 'completed' && <div className="result-banner">{match.result.outcome === 'tie' ? 'Match tied' : `${teamNames[match.result.winnerTeamId]} won by ${match.result.margin.value} ${match.result.margin.type}`}</div>}
        </section>

        <section className="scorecard-card">
          <div className="section-heading"><div><span className="eyebrow">THE SCORECARD</span><h2>Batting</h2></div><span className="table-note">RUNS · BALLS · BOUNDARIES</span></div>
          <div className="table-wrap">
            <table><thead><tr><th>BATTER</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
              <tbody>{scorecard.batters.filter((batter) => batter.ballsFaced || innings.batters.striker === batter.playerId || innings.batters.nonStriker === batter.playerId || batter.dismissal).map((batter) => (
                <tr key={batter.playerId} className={batter.playerId === facing ? 'on-strike' : ''}><td><strong>{playerNames[batter.playerId]}{batter.playerId === facing && <span className="strike-star"> *</span>}</strong><small>{batter.dismissal ? `${batter.dismissal.type}${batter.dismissal.bowlerId ? ` b ${playerNames[batter.dismissal.bowlerId]}` : ''}` : 'not out'}</small></td><td>{batter.runs}</td><td>{batter.ballsFaced}</td><td>{batter.fours}</td><td>{batter.sixes}</td><td>{batter.strikeRate.toFixed(1)}</td></tr>
              ))}</tbody>
            </table>
          </div>
          <div className="extras-line"><span>Extras</span><b>{scorecard.totalExtras}</b><small>(wd {scorecard.extras.wides}, nb {scorecard.extras.noBalls}, b {scorecard.extras.byes}, lb {scorecard.extras.legByes})</small><strong>Total</strong><b>{inningsScore.runs}/{inningsScore.wickets}</b></div>
        </section>

        <section className="scorecard-card bowling-card">
          <div className="section-heading"><div><span className="eyebrow">THE SCORECARD</span><h2>Bowling</h2></div><span className="table-note">OVERS · MAIDENS · RUNS · WICKETS</span></div>
          <div className="table-wrap">
            <table><thead><tr><th>BOWLER</th><th>O</th><th>M</th><th>R</th><th>W</th><th>ECON</th></tr></thead>
              <tbody>{scorecard.bowlers.length ? scorecard.bowlers.map((bowler) => (
                <tr key={bowler.playerId}><td><strong>{playerNames[bowler.playerId]}</strong></td><td>{bowler.overs}</td><td>{bowler.maidens}</td><td>{bowler.runsConceded}</td><td>{bowler.wickets}</td><td>{bowler.economy.toFixed(1)}</td></tr>
              )) : <tr><td className="empty-bowling" colSpan="6">Bowling figures will appear after the first delivery.</td></tr>}</tbody>
            </table>
          </div>
        </section>

        <div className="details-grid">
          <section className="detail-card">
            <div className="section-heading compact-heading"><div><span className="eyebrow">THIS OVER</span><h2>Over {Math.floor(currentLegal / match.ballsPerOver) + 1}</h2></div><span className="over-total">{scorecard.currentOverRuns} runs</span></div>
            <div className="ball-track">{lastOverEvents.length ? lastOverEvents.map((event, index) => <span className={`ball-chip ${event.ball.wicket ? 'wicket-chip' : ''}`} key={`${event.bowlerId}-${index}`}>{event.ball.wicket ? 'W' : event.ball.extra === 'wide' ? 'wd' : event.ball.extra === 'noball' ? 'nb' : event.ball.runsOffBat + event.ball.extraRuns}</span>) : <span className="empty-over">No deliveries yet</span>}</div>
            <div className="current-bowler"><span>Bowling</span><strong>{playerNames[currentOverBowler ?? selectedBowler] ?? 'Choose a bowler below'}</strong></div>
          </section>
          <section className="detail-card">
            <div className="section-heading compact-heading"><div><span className="eyebrow">CHASE WATCH</span><h2>{target ? `${needed} to win` : 'First innings'}</h2></div></div>
            {target !== null ? <div className="chase-details"><div><b>{ballsLeft}</b><span>balls left</span></div><div><b>{(needed / Math.max(1, ballsLeft / match.ballsPerOver)).toFixed(2)}</b><span>required rate</span></div></div> : <p className="muted-copy">Set a target in the second innings. The match result updates automatically.</p>}
            {firstScore && match.innings.length === 2 && <div className="first-innings-line"><span>1st innings · {teamNames[firstInnings.battingTeamId]}</span><b>{firstScore.runs}/{firstScore.wickets}</b></div>}
          </section>
        </div>

        {isFirstBreak && canStartSecond && (
          <section className="next-innings-card">
            <div><span className="eyebrow">INNINGS COMPLETE</span><h2>{teamNames[firstInnings.battingTeamId]} made {firstScore.runs}/{firstScore.wickets}</h2><p>{teamNames[secondBattingTeam.id]} need {firstScore.runs + 1} runs to win.</p></div>
            <div className="next-innings-controls">
              <Field label="Opening striker"><select value={secondStriker || secondBattingTeam.playerIds[0]} onChange={(event) => setSecondStriker(event.target.value)}>{secondBattingTeam.playerIds.map((id) => <option key={id} value={id}>{playerNames[id]}</option>)}</select></Field>
              <Field label="Non-striker"><select value={secondNonStriker || secondBattingTeam.playerIds[1]} onChange={(event) => setSecondNonStriker(event.target.value)}>{secondBattingTeam.playerIds.map((id) => <option key={id} value={id}>{playerNames[id]}</option>)}</select></Field>
              <button className="primary-button" onClick={() => {
                try {
                  const strikerId = secondStriker || secondBattingTeam.playerIds[0];
                  const nonStrikerId = secondNonStriker || secondBattingTeam.playerIds.find((id) => id !== strikerId);
                  onStartSecond({ striker: strikerId, nonStriker: nonStrikerId });
                  setSelectedBowler('');
                  setError('');
                } catch (cause) { setError(cause.message); }
              }}>Start second innings <span>↗</span></button>
            </div>
          </section>
        )}

        {match.status === 'in_progress' && (
          <section className="scoring-panel">
            <div className="scoring-panel-heading"><div><span className="eyebrow">QUICK SCORING</span><h2>Record the next ball</h2></div><span className="input-hint">Choose a bowler, then tap the outcome</span></div>
            <div className="bowler-select-row">
              <Field label="Bowler for this over"><select value={selectedBowler} onChange={(event) => setSelectedBowler(event.target.value)} disabled={bowlerLocked}>{bowlerOptions.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}</select></Field>
              {bowlerLocked && <span className="locked-note">Bowler set for this over</span>}
            </div>
            <div className="run-buttons">
              {[0, 1, 2, 3, 4, 6].map((runs) => <button key={runs} className={runs === 4 || runs === 6 ? 'run-button boundary-button' : 'run-button'} onClick={() => submitBall({ runsOffBat: runs })} disabled={!selectedBowler}>{runs === 0 ? '•' : runs}{runs === 0 && <small>DOT</small>}</button>)}
            </div>
            <div className="extra-buttons">
              <button className={selectedExtra === 'wide' ? 'extra-active' : ''} onClick={() => { setSelectedExtra('wide'); setExtraRuns('0'); }} disabled={!selectedBowler}><b>WD</b> Wide</button>
              <button className={selectedExtra === 'noball' ? 'extra-active' : ''} onClick={() => { setSelectedExtra('noball'); setExtraRuns('0'); setNoBallRunType('bat'); }} disabled={!selectedBowler}><b>NB</b> No ball</button>
              <button className={selectedExtra === 'bye' ? 'extra-active' : ''} onClick={() => { setSelectedExtra('bye'); setExtraRuns('0'); }} disabled={!selectedBowler}><b>B</b> Bye</button>
              <button className={selectedExtra === 'legbye' ? 'extra-active' : ''} onClick={() => { setSelectedExtra('legbye'); setExtraRuns('0'); }} disabled={!selectedBowler}><b>LB</b> Leg bye</button>
              {selectedExtra && (
                <div className="extra-entry">
                  <div className="extra-entry-heading">
                    <div>
                      <span className="eyebrow">DELIVERY DETAILS</span>
                      <strong>{selectedExtra === 'noball' ? 'No-ball runs' : selectedExtra === 'wide' ? 'Wide runs' : selectedExtra === 'bye' ? 'Bye runs' : 'Leg-bye runs'}</strong>
                    </div>
                    <button className="cancel-extra" type="button" onClick={() => setSelectedExtra(null)}>Cancel</button>
                  </div>
                  {selectedExtra === 'noball' && (
                    <Field label="Runs scored as">
                      <select value={noBallRunType} onChange={(event) => setNoBallRunType(event.target.value)}>
                        <option value="bat">Off the bat</option>
                        <option value="bye">Byes</option>
                        <option value="legbye">Leg-byes</option>
                      </select>
                    </Field>
                  )}
                  <div className="extra-run-input-row">
                    <Field label={selectedExtra === 'wide' ? 'Runs completed (wide penalty is added automatically)' : 'Runs scored on this delivery'}>
                      <input type="number" min="0" step="1" inputMode="numeric" value={extraRuns} onChange={(event) => setExtraRuns(event.target.value)} />
                    </Field>
                    <button className="primary-button" type="button" onClick={submitExtra}>Add delivery <span>↗</span></button>
                  </div>
                  {selectedExtra === 'noball' && <small className="extra-help">The 1-run no-ball penalty is added automatically. Enter only the runs scored from the bat or byes/leg-byes.</small>}
                  {selectedExtra === 'wide' && <small className="extra-help">The 1-run wide penalty is added automatically. Enter only the additional runs completed.</small>}
                </div>
              )}
              <div className="wicket-controls">
                <select value={wicketType} onChange={(event) => setWicketType(event.target.value)} aria-label="Wicket type"><option value="" disabled>Wicket type</option>{WICKET_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
                <select value={playerOut} onChange={(event) => setPlayerOut(event.target.value)} aria-label="Dismissed batter">{[innings.batters.striker, innings.batters.nonStriker].filter(Boolean).map((id) => <option key={id} value={id}>{playerNames[id]}</option>)}</select>
                <button className="wicket-button" onClick={() => submitBall({ wicket: { type: wicketType, playerOut } })} disabled={!selectedBowler || !playerOut}>WICKET</button>
              </div>
            </div>
            {error && <p className="form-error scoring-message" role="alert">{error}</p>}
            {success && <p className="success-message" role="status">{success}</p>}
          </section>
        )}

        {match.status === 'completed' && <section className="completed-card"><span className="eyebrow">THAT'S THE GAME</span><h2>{match.result.outcome === 'tie' ? 'It’s a tie.' : `${teamNames[match.result.winnerTeamId]} take the win.`}</h2><p>Final scorecards are shown above. Start a new match to play again.</p><button className="secondary-button" onClick={() => window.location.reload()}>New match</button></section>}

        <section className="innings-summary">
          <span className="eyebrow">INNINGS SUMMARY</span>
          <div className="innings-summary-grid">{summary.innings.map((entry, index) => <div className="innings-summary-item" key={entry.battingTeamId}><span>{index === 0 ? '1ST' : '2ND'} INNINGS · {teamNames[entry.battingTeamId]}</span><strong>{entry.runs}/{entry.wickets}</strong><small>{entry.overs} overs{entry.complete ? ' · complete' : ''}</small></div>)}</div>
        </section>
        <div className="app-footer"><span>BOUNDARY SCORER</span><span>SCORING ENGINE · IN-MEMORY DEMO</span></div>
      </div>
    </main>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [match, setMatch] = useState(null);
  const [firstBowler, setFirstBowler] = useState('');

  function startMatch(data) {
    setSession({ teamNames: data.teamNames, playerNames: data.playerNames });
    setFirstBowler(data.firstBowler);
    setMatch(data.match);
  }

  if (!match) return <Setup onStart={startMatch} />;

  function addBall(input, selectedBowler) {
    const innings = match.innings.at(-1);
    const updated = recordBall(match, createBall(input), selectedBowler);
    setMatch(updated);
    return updated;
  }

  return (
    <Scoreboard
      key={match.innings.length}
      match={match}
      teamNames={session.teamNames}
      playerNames={session.playerNames}
      firstBowler={firstBowler}
      onBall={addBall}
      onUndo={() => setMatch((current) => undoLastBall(current))}
      onStartSecond={(openingBatters) => setMatch((current) => startSecondInnings(current, openingBatters))}
    />
  );
}
