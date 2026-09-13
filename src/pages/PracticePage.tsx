import { Link } from 'react-router-dom';

export function PracticePage() {
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Practice</div>
          <h1>Practice tools</h1>
          <p className="lede">Short, focused drills with the trio behind you.</p>
        </div>
      </div>
      <div className="card-grid">
        <Link className="card" to="/practice/gym">
          <h2>ii–V–I Gym</h2>
          <p className="muted">Random-key major and minor ii–V–Is. Listen first, then reveal the chords. Pick the keys, the tempo and the mix.</p>
        </Link>
        <Link className="card" to="/practice/metronome">
          <h2>Metronome</h2>
          <p className="muted">A plain click or a swinging ride with the hi-hat on 2 and 4.</p>
        </Link>
        <div className="card" style={{ opacity: 0.6 }}>
          <h2>Ear trainer</h2>
          <p className="muted">Identify chord qualities and cadence types by ear. Coming in v2.</p>
        </div>
      </div>
    </main>
  );
}
