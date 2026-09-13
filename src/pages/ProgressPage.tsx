import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useProgress, totalMinutes } from '../store/progress';
import { TUNES } from '../data/tunes';
import { LearnNav } from './LearnPage';

export function ProgressPage() {
  const { milestones, log, addEntry, removeEntry, exportJson, importJson, toggleMilestone, reset } = useProgress();
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [minutes, setMinutes] = useState(30);
  const [focus, setFocus] = useState('');
  const [tuneId, setTuneId] = useState('');
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const totalMilestones = TUNES.reduce((s, t) => s + (t.learning?.milestones?.length ?? 0), 0);
  const doneMilestones = TUNES.reduce((s, t) => s + Object.values(milestones[t.id] ?? {}).filter(Boolean).length, 0);

  const download = () => {
    const blob = new Blob([exportJson()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jazz-guitar-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copy = async () => {
    await navigator.clipboard.writeText(exportJson());
    setMessage('Copied to clipboard.');
  };
  const doImport = () => {
    const r = importJson(importText);
    setMessage(r.ok ? 'Imported.' : `Import failed: ${r.error}`);
    if (r.ok) setImportText('');
  };
  const onFile = (file: File | undefined) => {
    if (!file) return;
    file.text().then((t) => setImportText(t));
  };

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn</div>
          <h1>Progress</h1>
          <p className="lede">Milestones per tune and a practice log. Everything lives in this browser; export it to keep a copy or move it to another device.</p>
        </div>
      </div>
      <LearnNav />
      <div className="card-grid" style={{ marginBottom: '1rem' }}>
        <div className="card"><div className="label">This week</div><div className="stat">{totalMinutes(log, 7)} min</div></div>
        <div className="card"><div className="label">Last 30 days</div><div className="stat">{totalMinutes(log, 30)} min</div></div>
        <div className="card"><div className="label">Sessions logged</div><div className="stat">{log.length}</div></div>
        <div className="card"><div className="label">Milestones</div><div className="stat">{doneMilestones} / {totalMilestones}</div></div>
      </div>

      <div className="card-grid" style={{ alignItems: 'start' }}>
        <div className="stack">
          <div className="card">
            <h2>Log a session</h2>
            <div className="stack" style={{ gap: '0.6rem' }}>
              <div className="row">
                <div className="field"><label>Date</label><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
                <div className="field"><label>Minutes</label><input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} style={{ width: 90 }} /></div>
                <div className="field">
                  <label>Tune</label>
                  <select value={tuneId} onChange={(e) => setTuneId(e.target.value)}>
                    <option value="">(none)</option>
                    {TUNES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>
              <div className="field"><label>Focus</label><input type="text" value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="e.g. drop-2 voicings on Autumn Leaves at 120" /></div>
              <div>
                <button className="btn btn-primary" onClick={() => { if (minutes > 0) { addEntry({ date, minutes, focus: focus.trim(), tuneId: tuneId || undefined }); setFocus(''); } }}>Add entry</button>
              </div>
            </div>
          </div>
          <div className="card">
            <h3>Practice log</h3>
            {log.length === 0 ? (
              <p className="muted">Nothing logged yet.</p>
            ) : (
              <table className="log-table">
                <thead><tr><th>Date</th><th>Min</th><th>Focus</th><th></th></tr></thead>
                <tbody>
                  {log.map((e) => (
                    <tr key={e.id}>
                      <td>{e.date}</td>
                      <td>{e.minutes}</td>
                      <td>{e.focus}{e.tuneId && <span className="dim"> · {TUNES.find((t) => t.id === e.tuneId)?.title}</span>}</td>
                      <td><button className="btn btn-sm" onClick={() => removeEntry(e.id)} aria-label="Delete entry">×</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="stack">
          <div className="card">
            <h2>Milestones</h2>
            {TUNES.map((t) => {
              const ms = t.learning?.milestones ?? [];
              const done = milestones[t.id] ?? {};
              const n = Object.values(done).filter(Boolean).length;
              return (
                <details className="details" key={t.id} style={{ marginBottom: '0.5rem' }}>
                  <summary>
                    <span>{t.title}</span>
                    <span className="pill" style={{ marginLeft: 'auto' }}>{n}/{ms.length}</span>
                  </summary>
                  <div className="details-body">
                    <ul className="checklist">
                      {ms.map((m, i) => (
                        <li key={i}>
                          <input type="checkbox" checked={!!done[i]} onChange={() => toggleMilestone(t.id, i)} />
                          <span className={done[i] ? 'done' : ''}>{m}</span>
                        </li>
                      ))}
                    </ul>
                    <Link className="btn btn-sm" to={`/tunes/${t.id}/learn`}>Open learn page</Link>
                  </div>
                </details>
              );
            })}
          </div>
          <div className="card">
            <h3>Export / import</h3>
            <div className="row">
              <button className="btn" onClick={download}>Download JSON</button>
              <button className="btn" onClick={copy}>Copy JSON</button>
              <label className="btn">
                Choose file…
                <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
            </div>
            <textarea rows={5} value={importText} onChange={(e) => setImportText(e.target.value)} placeholder="Paste exported JSON here to import" style={{ width: '100%', marginTop: '0.6rem' }} />
            <div className="row" style={{ marginTop: '0.5rem' }}>
              <button className="btn btn-primary" onClick={doImport} disabled={!importText.trim()}>Import (replaces current data)</button>
              <span className="spacer" />
              <button className="btn btn-danger btn-sm" onClick={() => { if (window.confirm('Erase all progress and the practice log?')) reset(); }}>Reset all</button>
            </div>
            {message && <p className="notice" style={{ marginTop: '0.6rem' }}>{message}</p>}
          </div>
        </div>
      </div>
    </main>
  );
}
