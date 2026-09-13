/**
 * A chord-box style diagram (strings vertical, frets horizontal) rendered as SVG.
 */
import type { RealizedVoicing } from '../theory/voicings';
import { noteName } from '../theory/notes';
import { isGuideTone } from '../theory/chords';
import type { LabelMode } from '../store/settings';

interface Props {
  voicing: RealizedVoicing;
  labelMode?: LabelMode;
  width?: number;
  frets?: number;
}

export function Fretboard({ voicing, labelMode = 'interval', width = 150, frets = 5 }: Props) {
  // 1.6 gaps of gutter on the left so a two-digit fret number never collides with the diagram.
  const stringGap = width / 7.6;
  const left = stringGap * 1.6;
  const top = 34;
  const fretGap = stringGap * 1.35;
  const height = top + fretGap * frets + 16;
  const startFret = voicing.baseFret <= 1 ? 1 : voicing.baseFret;
  const showNut = startFret === 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="fretboard" role="img" aria-label={`${voicing.template.name} diagram`}>
      {/* strings */}
      {Array.from({ length: 6 }, (_, s) => (
        <line key={s} x1={left + s * stringGap} y1={top} x2={left + s * stringGap} y2={top + fretGap * frets} stroke="var(--line-strong)" strokeWidth={s < 2 ? 1.8 : 1.2} />
      ))}
      {/* frets */}
      {Array.from({ length: frets + 1 }, (_, f) => (
        <line key={f} x1={left} y1={top + f * fretGap} x2={left + 5 * stringGap} y2={top + f * fretGap} stroke={f === 0 && showNut ? 'var(--text)' : 'var(--line-strong)'} strokeWidth={f === 0 && showNut ? 4 : 1.2} />
      ))}
      {!showNut && (
        <text x={left - 7} y={top + fretGap * 0.6} fontSize={11} fill="var(--text-muted)" textAnchor="end" fontWeight={600}>
          {startFret}
        </text>
      )}
      {/* markers */}
      {voicing.frets.map((fret, s) => {
        const x = left + s * stringGap;
        if (fret === null) {
          return (
            <text key={s} x={x} y={top - 10} fontSize={11} fill="var(--text-dim)" textAnchor="middle">
              ×
            </text>
          );
        }
        const interval = voicing.intervals[s]!;
        const note = voicing.notes[s]!;
        const label = labelMode === 'interval' ? interval : noteName(note, { unicode: true });
        const isRoot = interval === 'R';
        const guide = isGuideTone(interval);
        const fill = isRoot ? 'var(--accent)' : guide ? 'var(--hot)' : 'var(--text-muted)';
        if (fret === 0) {
          return (
            <g key={s}>
              <circle cx={x} cy={top - 12} r={6} fill="none" stroke={fill} strokeWidth={1.8} />
              <text x={x} y={top + fretGap * frets + 12} fontSize={9} fill={fill} textAnchor="middle" fontWeight={600}>
                {label}
              </text>
            </g>
          );
        }
        const row = fret - startFret;
        const y = top + row * fretGap + fretGap / 2;
        return (
          <g key={s}>
            <circle cx={x} cy={y} r={stringGap * 0.42} fill={fill} />
            <text x={x} y={y + 3.5} fontSize={9.5} fill="#1a1408" textAnchor="middle" fontWeight={700}>
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
