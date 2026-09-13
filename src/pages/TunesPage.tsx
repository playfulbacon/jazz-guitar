import { Link } from 'react-router-dom';
import { TUNES } from '../data/tunes';
import { playedLength } from '../theory/tune';
import { useProgress } from '../store/progress';
import { keyName, parseKey } from '../theory/keys';

export function TunesPage() {
  const milestones = useProgress((s) => s.milestones);
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Repertoire</div>
          <h1>Tunes</h1>
          <p className="lede">Ten standards in a learning order. Each opens in the chart player with a virtual trio; the learn page has the analysis, drills and milestones.</p>
        </div>
      </div>
      <div className="card-grid">
        {TUNES.map((t, i) => {
          const done = Object.values(milestones[t.id] ?? {}).filter(Boolean).length;
          const total = t.learning?.milestones?.length ?? 0;
          return (
            <div className="tune-card" key={t.id}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="pill pill-accent">#{i + 1}</span>
                <span className="pill">{t.style}</span>
              </div>
              <h3>{t.title}</h3>
              <div className="meta">
                <span>{keyName(parseKey(t.defaultKey), { unicode: true })}</span>
                <span>{t.form}</span>
                <span>{playedLength(t)} bars</span>
                <span>♩ = {t.defaultTempo}</span>
              </div>
              <p className="why">{t.learning?.why}</p>
              {total > 0 && (
                <div>
                  <div className="progress-bar"><div style={{ width: `${(done / total) * 100}%` }} /></div>
                  <span className="dim small">{done}/{total} milestones</span>
                </div>
              )}
              <div className="actions">
                <Link className="btn btn-primary" to={`/tunes/${t.id}`}>▶ Play</Link>
                <Link className="btn" to={`/tunes/${t.id}/learn`}>Learn</Link>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
