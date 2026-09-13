import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { QUALITIES, parseChord, displaySymbol, chordSymbol, chordTones } from '../theory/chords';
import { CHROMATIC_ROOTS, parseNote, noteName } from '../theory/notes';
import { realizeVoicing, voicingMidiNotes, type VoicingLevel } from '../theory/voicings';
import { VOICING_TEMPLATES } from '../audio/comper';
import { Fretboard } from '../components/Fretboard';
import { FretboardStrip } from '../components/FretboardStrip';
import { useSettings } from '../store/settings';
import { engine } from '../audio/engine';
import qualityCards from '../data/qualities.json';

const GROUPS: { title: string; ids: string[] }[] = [
  { title: 'Major', ids: ['maj7', '6', '69', 'maj9', 'maj7#11', 'maj13', 'maj'] },
  { title: 'Minor', ids: ['m7', 'm6', 'm69', 'm9', 'm11', 'mMaj7', 'mMaj9', 'm'] },
  { title: 'Dominant', ids: ['7', '9', '13', '7b9', '7#9', '7#5', '7b5', '7#11', '7b13', '7alt', '7sus4', '9sus4'] },
  { title: 'Diminished & other', ids: ['m7b5', 'm11b5', 'dim7', 'dim', 'aug', 'sus4', 'sus2'] },
];

const LEVELS: { id: VoicingLevel | 'all'; label: string; blurb: string }[] = [
  { id: 'shell', label: 'Shells', blurb: 'Root, 3rd and 7th. Everything you need to define the chord.' },
  { id: 'drop2', label: 'Drop 2 / Drop 3', blurb: 'Four-note voicings on adjacent string sets, in inversions.' },
  { id: 'extended', label: 'Extended', blurb: '9ths, 13ths and alterations replacing the root or 5th.' },
  { id: 'all', label: 'All', blurb: 'The whole ladder.' },
];

type Card = { title: string; formula: string; sound: string; function: string; listen: string };

export function ChordsPage() {
  // The chart player links here with ?root=Bb&q=maj7 to open a specific chord.
  const [params] = useSearchParams();
  const paramQuality = params.get('q');
  const paramRoot = params.get('root');
  const [quality, setQuality] = useState(() => (paramQuality && QUALITIES[paramQuality] ? paramQuality : 'maj7'));
  const [rootName, setRootName] = useState(() => (paramRoot && CHROMATIC_ROOTS.includes(paramRoot) ? paramRoot : 'C'));
  useEffect(() => {
    if (paramQuality && QUALITIES[paramQuality]) setQuality(paramQuality);
    if (paramRoot && CHROMATIC_ROOTS.includes(paramRoot)) setRootName(paramRoot);
  }, [paramQuality, paramRoot]);
  const [level, setLevel] = useState<VoicingLevel | 'all'>('all');
  const { labelMode, set, compInstrument } = useSettings();
  const root = useMemo(() => parseNote(rootName), [rootName]);
  const q = QUALITIES[quality];
  const chord = useMemo(() => parseChord(chordSymbol(root, q)), [root, q]);
  const templates = useMemo(() => VOICING_TEMPLATES.filter((t) => t.quality === quality && (level === 'all' || t.level === level)), [quality, level]);
  const card = (qualityCards.cards as Record<string, Card>)[quality];
  const [ring, setRing] = useState<number[]>([]);

  const hear = (midis: number[]) => {
    setRing(midis);
    void engine.audition(midis, compInstrument);
    window.setTimeout(() => setRing((r) => (r === midis ? [] : r)), 1600);
  };

  return (
    <main className="page page-wide">
      <div className="page-header">
        <div>
          <div className="eyebrow">Chord library</div>
          <h1>Voicings</h1>
          <p className="lede">Pick a quality and a root. Tap any diagram to hear it. Shapes are movable: the same grip works for all twelve roots.</p>
        </div>
      </div>
      <div className="chords-layout">
        <aside className="quality-list" aria-label="Chord qualities">
          {GROUPS.map((g) => (
            <div key={g.title} style={{ display: 'contents' }}>
              <div className="group label">{g.title}</div>
              {g.ids.map((id) => {
                const count = VOICING_TEMPLATES.filter((t) => t.quality === id).length;
                return (
                  <button key={id} className={id === quality ? 'active' : ''} onClick={() => setQuality(id)}>
                    <span className="chord-symbol">{displaySymbol(parseChord('C' + QUALITIES[id].display)).replace(/^C/, 'C')}</span>
                    <span className="dim small">{count}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>
        <section className="stack">
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div className="label">Root</div>
                <div className="root-picker" role="radiogroup" aria-label="Root">
                  {CHROMATIC_ROOTS.map((r) => (
                    <button key={r} className={r === rootName ? 'active' : ''} onClick={() => setRootName(r)} role="radio" aria-checked={r === rootName}>
                      {noteName(parseNote(r), { unicode: true })}
                    </button>
                  ))}
                </div>
              </div>
              <div className="row">
                <div className="field">
                  <label>Labels</label>
                  <div className="seg">
                    <button className={labelMode === 'interval' ? 'active' : ''} onClick={() => set({ labelMode: 'interval' })}>Intervals</button>
                    <button className={labelMode === 'note' ? 'active' : ''} onClick={() => set({ labelMode: 'note' })}>Notes</button>
                  </div>
                </div>
                <div className="field">
                  <label>Sound</label>
                  <div className="seg">
                    <button className={compInstrument === 'guitar' ? 'active' : ''} onClick={() => set({ compInstrument: 'guitar' })}>Guitar</button>
                    <button className={compInstrument === 'piano' ? 'active' : ''} onClick={() => set({ compInstrument: 'piano' })}>Piano</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="row" style={{ alignItems: 'baseline' }}>
              <h2 style={{ margin: 0, fontSize: '2rem' }} className="chord-symbol">{displaySymbol(chord)}</h2>
              <span className="muted">{card?.title}</span>
              <span className="spacer" />
              <span className="muted small">{chordTones(chord).map((t) => noteName(t.note, { unicode: true })).join(' · ')}</span>
            </div>
            {card && (
              <dl className="theory-card" style={{ marginTop: '0.75rem' }}>
                <div>
                  <dt>Formula</dt>
                  <dd className="formula">{card.formula}</dd>
                  <dt>Sound</dt>
                  <dd>{card.sound}</dd>
                </div>
                <div>
                  <dt>Function</dt>
                  <dd>{card.function}</dd>
                  <dt>Hear it in</dt>
                  <dd className="muted">{card.listen}</dd>
                </div>
              </dl>
            )}
          </div>

          <div className="row">
            <div className="seg" role="tablist" aria-label="Complexity level">
              {LEVELS.map((l) => (
                <button key={l.id} className={level === l.id ? 'active' : ''} onClick={() => setLevel(l.id)} role="tab" aria-selected={level === l.id}>
                  {l.label}
                </button>
              ))}
            </div>
            <span className="muted small">{LEVELS.find((l) => l.id === level)?.blurb}</span>
          </div>

          {templates.length === 0 ? (
            <div className="card muted">No {LEVELS.find((l) => l.id === level)?.label.toLowerCase()} shapes for this quality yet. The comper falls back to {q.voicingFallback.slice(1).join(', ') || 'shells'}.</div>
          ) : (
            <div className="voicing-grid">
              {templates.map((t) => {
                const v = realizeVoicing(t, root, 6);
                const midis = voicingMidiNotes(v);
                return (
                  <div className="voicing-card" key={t.id} onClick={() => hear(midis)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && hear(midis)} title="Tap to hear">
                    <span className={'pill ' + (t.level === 'shell' ? 'pill-accent' : t.level === 'drop2' ? 'pill-cool' : 'pill-purple')}>{t.level === 'drop2' ? 'four-note' : t.level}</span>
                    <Fretboard voicing={v} labelMode={labelMode} />
                    <div className="name">{t.name}</div>
                    {t.tip && <div className="tip">{t.tip}</div>}
                  </div>
                );
              })}
            </div>
          )}

          <FretboardStrip chord={chord} labelMode={labelMode} ring={ring} />
        </section>
      </div>
    </main>
  );
}
