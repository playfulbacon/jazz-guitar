/**
 * The chord inspector shown when a chord on the chart is tapped: what the chord is,
 * what it is doing in the key, how it is spelled, and where to grab it on the neck.
 */
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { chordTones, chordSymbol, displaySymbol, isGuideTone, QUALITIES } from '../theory/chords';
import { formatNumeral } from '../theory/keys';
import { noteName, pitchClass, simplifyNote, CHROMATIC_ROOTS } from '../theory/notes';
import { realizeVoicing, voicingMidiNotes, type VoicingLevel, type VoicingTemplate } from '../theory/voicings';
import { VOICING_TEMPLATES, templatesFor } from '../audio/comper';
import { Fretboard } from './Fretboard';
import type { ChordSelection } from './ChartGrid';
import type { LabelMode } from '../store/settings';
import qualityCards from '../data/qualities.json';

type Level = VoicingLevel | 'all';

const LEVELS: { id: Level; label: string }[] = [
  { id: 'shell', label: 'Shells' },
  { id: 'drop2', label: 'Drop 2' },
  { id: 'extended', label: 'Ext' },
  { id: 'all', label: 'All' },
];

const RANK: Record<VoicingLevel, number> = { shell: 0, drop2: 1, extended: 2 };

/**
 * Richer chords you can play in place of this one. A plain V7 has no "extended" grips of its
 * own, but 9, 13, 7b9 and the altered shapes all work over it, so the panel offers them and
 * labels each with the chord it actually spells.
 */
const SUBSTITUTES: Record<string, string[]> = {
  maj: ['maj7', '6', '69', 'maj9'],
  maj7: ['maj9', 'maj13', 'maj7#11', '69'],
  '6': ['69', 'maj9', 'maj7'],
  '69': ['6', 'maj9'],
  maj9: ['maj7', 'maj13', '69'],
  maj13: ['maj9', 'maj7'],
  'maj7#11': ['maj7', 'maj9'],
  m: ['m7', 'm6', 'm9'],
  m7: ['m9', 'm11'],
  m9: ['m7', 'm11'],
  m11: ['m9', 'm7'],
  m6: ['m69', 'mMaj7'],
  m69: ['m6'],
  mMaj7: ['mMaj9', 'm6'],
  mMaj9: ['mMaj7'],
  '7': ['9', '13', '7b9', '7#9', '7#5', '7#11', '7alt'],
  '9': ['13', '7#11', '7'],
  '13': ['9', '7'],
  '7b9': ['7alt', '7#9', '7#5', '7'],
  '7#9': ['7alt', '7b9', '7'],
  '7#5': ['7alt', '7b13', '7'],
  '7b5': ['7#11', '7'],
  '7#11': ['9', '13', '7'],
  '7b13': ['7#5', '7'],
  '7alt': ['7#5', '7b9', '7#9'],
  '7sus4': ['9sus4'],
  '9sus4': ['7sus4'],
  m7b5: ['m11b5'],
  m11b5: ['m7b5'],
};

/**
 * Shapes to show for a chord at a level: the chord's own quality when it has shapes there,
 * otherwise the next quality in its fallback chain (so C7alt still shows something at "Shells").
 */
function panelTemplates(selection: ChordSelection, level: Level): VoicingTemplate[] {
  const id = selection.chord.quality.id;
  const own = VOICING_TEMPLATES.filter((t) => t.quality === id);
  const subs = (SUBSTITUTES[id] ?? []).flatMap((q) => VOICING_TEMPLATES.filter((t) => t.quality === q && t.level === 'extended'));

  if (level === 'all') {
    // A ladder, not just the first six shapes: a couple of shells, some four-note grips, some colour.
    const all = [...own, ...subs];
    if (all.length) {
      const take = (lvl: VoicingLevel, n: number) => all.filter((t) => t.level === lvl).slice(0, n);
      const spread = [...take('shell', 2), ...take('drop2', 3), ...take('extended', 3)];
      return spread.length ? spread : sortLadder(all);
    }
  } else if (level === 'extended') {
    const ext = [...own.filter((t) => t.level === 'extended'), ...subs];
    if (ext.length) return sortLadder(ext);
  } else {
    const exact = own.filter((t) => t.level === level);
    if (exact.length) return sortLadder(exact);
  }

  // Qualities with no shapes of their own (or none at this level) borrow from their fallback chain.
  for (const qualityId of selection.chord.quality.voicingFallback.slice(1)) {
    const picked = VOICING_TEMPLATES.filter((t) => t.quality === qualityId && (level === 'all' || t.level === level));
    if (picked.length) return sortLadder(picked);
  }
  return templatesFor(selection.chord, level === 'all' ? 'extended' : level);
}

function sortLadder(templates: VoicingTemplate[]): VoicingTemplate[] {
  return [...templates].sort((a, b) => RANK[a.level] - RANK[b.level]);
}

interface Props {
  selection: ChordSelection;
  labelMode: LabelMode;
  onAudition: (midis: number[]) => void;
  onClose: () => void;
}

export function ChordPanel({ selection, labelMode, onAudition, onClose }: Props) {
  const { chord } = selection;
  const [level, setLevel] = useState<Level>('all');
  const templates = useMemo(() => panelTemplates(selection, level).slice(0, 8), [selection, level]);
  const tones = useMemo(() => chordTones(chord), [chord]);
  const card = (qualityCards.cards as Record<string, { title: string; sound: string; function: string } | undefined>)[chord.quality.id];
  const rootParam = useMemo(() => {
    const spelled = noteName(simplifyNote(chord.root, true));
    return CHROMATIC_ROOTS.includes(spelled) ? spelled : CHROMATIC_ROOTS[pitchClass(chord.root)];
  }, [chord]);

  return (
    <section className="chord-panel" aria-label={`Chord ${chord.symbol}`}>
      <div className="chord-panel-head">
        <div>
          <div className="row" style={{ gap: '0.5rem', alignItems: 'baseline' }}>
            <span className="chord-panel-symbol chord-symbol">{displaySymbol(chord)}</span>
            {selection.numeral && <span className="pill pill-accent">{formatNumeral(selection.numeral)}</span>}
          </div>
          <div className="small muted">
            bar {selection.chartId + 1}
            {card ? ` · ${card.title}` : ''}
          </div>
        </div>
        <button className="btn btn-sm" onClick={onClose} aria-label="Close chord panel" title="Close">
          ×
        </button>
      </div>

      {(selection.functionLabel || selection.cadence) && (
        <div className="row" style={{ gap: '0.4rem' }}>
          {selection.functionLabel && <span className="pill pill-purple">{formatNumeral(selection.functionLabel)}</span>}
          {selection.cadence && <span className="pill pill-cool">{selection.cadence}</span>}
        </div>
      )}

      <div className="chord-panel-tones">
        {tones.map((t) => (
          <span key={t.interval} className={'tone' + (t.interval === 'R' ? ' root' : isGuideTone(t.interval) ? ' guide' : '')}>
            <b>{noteName(t.note, { unicode: true })}</b>
            <i>{t.interval}</i>
          </span>
        ))}
      </div>

      {card && <p className="small muted" style={{ margin: '0.2rem 0 0' }}>{card.sound}</p>}

      <div className="row" style={{ justifyContent: 'space-between' }}>
        <div className="seg">
          {LEVELS.map((l) => (
            <button key={l.id} className={level === l.id ? 'active' : ''} onClick={() => setLevel(l.id)}>
              {l.label}
            </button>
          ))}
        </div>
        <span className="dim small">tap to hear</span>
      </div>

      {templates.length === 0 ? (
        <p className="muted small">No shapes at this level.</p>
      ) : (
        <div className="chord-panel-grid">
          {templates.map((t) => {
            const v = realizeVoicing(t, chord.root, 6);
            const midis = voicingMidiNotes(v);
            const substitute = t.quality !== chord.quality.id ? chordSymbol(chord.root, QUALITIES[t.quality]) : null;
            return (
              <button type="button" className="voicing-card" key={t.id} onClick={() => onAudition(midis)} title={`${substitute ?? displaySymbol(chord)} — ${t.name}`}>
                {substitute && <span className="sub chord-symbol">{substitute}</span>}
                <Fretboard voicing={v} labelMode={labelMode} width={126} />
                <div className="name small">{t.name}</div>
              </button>
            );
          })}
        </div>
      )}

      <Link className="btn btn-sm" to={`/chords?root=${encodeURIComponent(rootParam)}&q=${encodeURIComponent(chord.quality.id)}`}>
        Open in chord library →
      </Link>
    </section>
  );
}
