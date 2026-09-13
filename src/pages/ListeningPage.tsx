import { Link } from 'react-router-dom';
import listening from '../data/listening.json';
import { findTune } from '../data/tunes';
import { LearnNav } from './LearnPage';

interface Album {
  id: string;
  artist: string;
  title: string;
  year: number;
  label?: string;
  why: string;
  context: string;
  tracks: string[];
  tunes?: string[];
}

export function ListeningPage() {
  const albums = listening.albums as Album[];
  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn</div>
          <h1>Listening list</h1>
          <p className="lede">Jazz is an aural tradition. These records are the syllabus; the app is just the practice room. Links open a search on a streaming service.</p>
        </div>
      </div>
      <LearnNav />
      <div className="stack">
        {albums.map((a) => (
          <div className="card album" key={a.id}>
            <div className="cover" aria-hidden>{a.artist.split(' ').map((w) => w[0]).join('').slice(0, 2)}</div>
            <div>
              <div className="row" style={{ alignItems: 'baseline' }}>
                <h2 style={{ margin: 0 }}>{a.title}</h2>
                <span className="muted">{a.artist} · {a.year}{a.label ? ` · ${a.label}` : ''}</span>
              </div>
              <p style={{ marginTop: '0.5rem' }}>{a.why}</p>
              <p className="muted small">{a.context}</p>
              <div className="row">
                {a.tracks.map((t) => <span className="pill" key={t}>{t}</span>)}
                {a.tunes?.map((id) => {
                  const t = findTune(id);
                  return t ? <Link key={id} className="pill pill-accent" to={`/tunes/${id}`}>▶ {t.title}</Link> : null;
                })}
              </div>
              <div className="row small" style={{ marginTop: '0.5rem' }}>
                <a href={`https://open.spotify.com/search/${encodeURIComponent(a.artist + ' ' + a.title)}`} target="_blank" rel="noreferrer">Spotify ↗</a>
                <a href={`https://music.apple.com/search?term=${encodeURIComponent(a.artist + ' ' + a.title)}`} target="_blank" rel="noreferrer">Apple Music ↗</a>
                <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(a.artist + ' ' + a.title + ' full album')}`} target="_blank" rel="noreferrer">YouTube ↗</a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
