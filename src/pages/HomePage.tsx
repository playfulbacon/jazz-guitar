import { Link } from 'react-router-dom';
import { TUNES } from '../data/tunes';

export function HomePage() {
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Practice room</div>
          <h1>Jazz Guitar Trainer</h1>
          <p className="lede">
            Chord voicings from shells to drop-2s, playable chord charts with a virtual trio to solo and comp over, and a roadmap
            that teaches function, not just grips.
          </p>
        </div>
      </div>
      <div className="card-grid">
        <Link className="card" to="/chords">
          <div className="eyebrow">Chords</div>
          <h2>Chord Library</h2>
          <p className="muted">Every quality on a complexity ladder, with diagrams you can tap to hear.</p>
        </Link>
        <Link className="card" to="/tunes">
          <div className="eyebrow">Tunes</div>
          <h2>Chart Player</h2>
          <p className="muted">{TUNES.length} standards with walking bass, brushes and comping at any tempo or key. Loop a section, watch the chord tones light up.</p>
        </Link>
        <Link className="card" to="/practice">
          <div className="eyebrow">Practice</div>
          <h2>ii–V–I Gym &amp; Metronome</h2>
          <p className="muted">Random-key cadences to train your ears and hands, plus a swing click.</p>
        </Link>
        <Link className="card" to="/learn">
          <div className="eyebrow">Learn</div>
          <h2>Roadmap, Listening, Progress</h2>
          <p className="muted">A phased curriculum, the records that matter, and a practice log that lives in your browser.</p>
        </Link>
      </div>
      <p className="dim small" style={{ marginTop: '1.5rem' }}>
        Everything runs in your browser. Progress is stored locally and can be exported as JSON. Chord progressions only: no melodies or lyrics.
      </p>
    </main>
  );
}
