import { useEffect } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import curriculum from '../data/curriculum.json';
import { useProgress } from '../store/progress';
import { findTune } from '../data/tunes';

interface Lesson {
  id: string;
  title: string;
  body: string[];
  bullets?: string[];
  drills?: string[];
  tunes?: string[];
}

export function LearnNav() {
  return (
    <div className="row" style={{ marginBottom: '1.25rem' }}>
      <div className="seg">
        <NavLink to="/learn" end className={({ isActive }) => (isActive ? 'active' : '')}>Roadmap</NavLink>
        <NavLink to="/learn/listening" className={({ isActive }) => (isActive ? 'active' : '')}>Listening</NavLink>
        <NavLink to="/learn/progress" className={({ isActive }) => (isActive ? 'active' : '')}>Progress</NavLink>
      </div>
    </div>
  );
}

export function LearnPage() {
  const { lessons, toggleLesson } = useProgress();
  const location = useLocation();
  useEffect(() => {
    const id = location.hash.replace('#', '');
    if (!id) return;
    const el = document.getElementById(id) as HTMLDetailsElement | null;
    if (el) {
      el.open = true;
      el.scrollIntoView({ block: 'start' });
    }
  }, [location.hash]);

  const total = curriculum.phases.reduce((s, p) => s + p.lessons.length, 0);
  const done = curriculum.phases.reduce((s, p) => s + p.lessons.filter((l) => lessons[l.id]).length, 0);

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Learn</div>
          <h1>Roadmap</h1>
          <p className="lede">Four phases, from harmony to playing with other people. Work through them in order, but dip ahead whenever a tune demands it.</p>
        </div>
        <span className="spacer" />
        <div style={{ minWidth: 180 }}>
          <div className="small muted">{done} of {total} lessons done</div>
          <div className="progress-bar"><div style={{ width: `${(done / total) * 100}%` }} /></div>
        </div>
      </div>
      <LearnNav />
      {curriculum.phases.map((phase, pi) => (
        <section className="phase" key={phase.id}>
          <div className="phase-head">
            <span className="num">{pi + 1}</span>
            <h2 style={{ margin: 0 }}>{phase.title}</h2>
            <span className="muted">{phase.summary}</span>
          </div>
          {(phase.lessons as Lesson[]).map((lesson) => (
            <details className="details lesson" key={lesson.id} id={lesson.id}>
              <summary>
                <input type="checkbox" checked={!!lessons[lesson.id]} onChange={() => toggleLesson(lesson.id)} onClick={(e) => e.stopPropagation()} aria-label={`Mark ${lesson.title} done`} style={{ accentColor: 'var(--accent)' }} />
                <span className={lessons[lesson.id] ? 'done muted' : ''}>{lesson.title}</span>
                {lesson.tunes && lesson.tunes.length > 0 && <span className="pill">{lesson.tunes.length} {lesson.tunes.length === 1 ? 'tune' : 'tunes'}</span>}
              </summary>
              <div className="details-body">
                {lesson.body.map((p, i) => <p key={i}>{p}</p>)}
                {lesson.bullets && lesson.bullets.length > 0 && (
                  <ul className="bullets">{lesson.bullets.map((b) => <li key={b}>{b}</li>)}</ul>
                )}
                {lesson.drills && lesson.drills.length > 0 && (
                  <>
                    <div className="label" style={{ marginTop: '0.5rem' }}>Drills</div>
                    <ol className="bullets">{lesson.drills.map((d) => <li key={d}>{d}</li>)}</ol>
                  </>
                )}
                {lesson.tunes && lesson.tunes.length > 0 && (
                  <div className="row">
                    {lesson.tunes.map((id) => {
                      const t = findTune(id);
                      return t ? <Link key={id} className="btn btn-sm" to={`/tunes/${id}`}>▶ {t.title}</Link> : null;
                    })}
                  </div>
                )}
              </div>
            </details>
          ))}
        </section>
      ))}
    </main>
  );
}
