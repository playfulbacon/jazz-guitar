import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTune } from '../data/tunes';
import { chartChords } from '../theory/tune';
import { analyzeProgression, parseKey, keyName, formatNumeral } from '../theory/keys';
import { displaySymbol } from '../theory/chords';
import { useProgress } from '../store/progress';
import curriculum from '../data/curriculum.json';

export function TuneLearnPage() {
  const { id } = useParams();
  const tune = findTune(id);
  const { milestones, toggleMilestone } = useProgress();
  const analysis = useMemo(() => {
    if (!tune) return null;
    const chords = chartChords(tune);
    return analyzeProgression(chords.map((c) => c.chord), parseKey(tune.defaultKey));
  }, [tune]);
  if (!tune || !analysis) {
    return (
      <main className="page">
        <h1>Tune not found</h1>
        <Link to="/tunes">Back to tunes</Link>
      </main>
    );
  }
  const done = milestones[tune.id] ?? {};
  const lessons = curriculum.phases.flatMap((p) => p.lessons.filter((l) => (l as { tunes?: string[] }).tunes?.includes(tune.id)).map((l) => ({ ...l, phase: p.title })));
  const cadenceCounts = analysis.cadences.reduce<Record<string, number>>((acc, c) => ((acc[c.type] = (acc[c.type] ?? 0) + 1), acc), {});
  const uniqueChords = Array.from(new Map(analysis.chords.map((c) => [c.chord.symbol, c])).values());

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn a tune</div>
          <h1>{tune.title}</h1>
          <p className="lede">{tune.learning?.why}</p>
        </div>
        <span className="spacer" />
        <Link className="btn btn-primary" to={`/tunes/${tune.id}`}>▶ Open in player</Link>
      </div>

      <div className="card-grid" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <h2>Analysis</h2>
            <div className="row small muted" style={{ marginBottom: '0.6rem' }}>
              <span>Key: <b>{keyName(parseKey(tune.defaultKey), { unicode: true })}</b></span>
              {tune.analysis?.keyPairs && <span>Key centres: <b>{tune.analysis.keyPairs.join(', ')}</b></span>}
              <span>Form: <b>{tune.form}</b></span>
            </div>
            <p>{tune.analysis?.notes}</p>
            <div className="row">
              {cadenceCounts.major251 && <span className="pill pill-green">{cadenceCounts.major251} major ii–V–I</span>}
              {cadenceCounts.minor251 && <span className="pill pill-cool">{cadenceCounts.minor251} minor ii–V–i</span>}
              {cadenceCounts['ii-V'] && <span className="pill pill-accent">{cadenceCounts['ii-V']} unresolved ii–V</span>}
              {cadenceCounts.secondary && <span className="pill pill-purple">{cadenceCounts.secondary} secondary dominant</span>}
            </div>
          </div>
          <div className="card">
            <h3>Chords in this tune</h3>
            <div className="row">
              {uniqueChords.map((c) => (
                <span key={c.chord.symbol} className="pill" title={c.functionLabel ?? ''}>
                  <span className="chord-symbol">{displaySymbol(c.chord)}</span> <span className="dim">{formatNumeral(c.numeral.text)}{c.functionLabel ? ` · ${formatNumeral(c.functionLabel)}` : ''}</span>
                </span>
              ))}
            </div>
          </div>
          {tune.learning?.concepts && (
            <div className="card">
              <h3>What it teaches</h3>
              <ul className="bullets">
                {tune.learning.concepts.map((c) => <li key={c}>{c}</li>)}
              </ul>
            </div>
          )}
          {lessons.length > 0 && (
            <div className="card">
              <h3>Related lessons</h3>
              <ul className="bullets">
                {lessons.map((l) => (
                  <li key={l.id}><Link to={`/learn#${l.id}`}>{l.title}</Link> <span className="dim small">· {l.phase}</span></li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <div className="stack">
          {tune.learning?.milestones && (
            <div className="card">
              <h2>Milestones</h2>
              <ul className="checklist">
                {tune.learning.milestones.map((m, i) => (
                  <li key={i}>
                    <input type="checkbox" id={`ms-${i}`} checked={!!done[i]} onChange={() => toggleMilestone(tune.id, i)} />
                    <label htmlFor={`ms-${i}`} className={done[i] ? 'done' : ''}>{m}</label>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {tune.learning?.drills && (
            <div className="card">
              <h3>Suggested drills</h3>
              <ol className="bullets">
                {tune.learning.drills.map((d) => <li key={d}>{d}</li>)}
              </ol>
            </div>
          )}
          {tune.learning?.listen && (
            <div className="card">
              <h3>Listen</h3>
              <ul className="bullets">
                {tune.learning.listen.map((l) => (
                  <li key={l}>
                    {l}{' '}
                    <a className="dim small" href={`https://www.youtube.com/results?search_query=${encodeURIComponent(l + ' ' + tune.title)}`} target="_blank" rel="noreferrer">search ↗</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
