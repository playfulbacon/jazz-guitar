/**
 * The chord-tone spotlight: a horizontal neck with every instance of the sounding chord's
 * tones lit up, 3rds and 7ths hottest.
 */
import { useMemo } from 'react';
import type { Chord } from '../theory/chords';
import { chordToneMap, isGuideTone, displaySymbol } from '../theory/chords';
import { noteName } from '../theory/notes';
import { TUNING_MIDI, TUNING_NAMES } from '../theory/voicings';
import type { LabelMode } from '../store/settings';

interface Props {
  chord: Chord | null;
  labelMode?: LabelMode;
  frets?: number;
  /** highlight these midi notes (e.g. the voicing being played) with a ring */
  ring?: number[];
  /** true when the strip is showing a chord the user picked rather than the sounding one */
  pinned?: boolean;
  onUnpin?: () => void;
}

export function FretboardStrip({ chord, labelMode = 'interval', frets = 15, ring, pinned, onUnpin }: Props) {
  const tones = useMemo(() => (chord ? chordToneMap(chord) : null), [chord]);
  const width = 1000;
  const leftPad = 34;
  const rightPad = 10;
  const fretW = (width - leftPad - rightPad) / (frets + 1);
  const stringGap = 22;
  const top = 18;
  const height = top + stringGap * 5 + 30;
  const ringSet = new Set(ring ?? []);

  return (
    <div className="spotlight">
      <div className="spotlight-head">
        <span className="label">Chord tones</span>
        <span className="now">{chord ? displaySymbol(chord) : '—'}</span>
        {pinned && (
          <button className="btn btn-sm" onClick={onUnpin} title="Follow playback again">
            pinned ×
          </button>
        )}
        {chord && (
          <span className="muted small">
            {chord.quality.intervals.join(' · ')}
          </span>
        )}
        <span className="spotlight-legend">
          <span><i style={{ background: 'var(--accent)' }} />root</span>
          <span><i style={{ background: 'var(--hot)' }} />3rd / 7th</span>
          <span><i style={{ background: 'var(--text-muted)' }} />other tones</span>
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" style={{ display: 'block' }} role="img" aria-label="Fretboard chord tone spotlight">
        {/* neck */}
        <rect x={leftPad + fretW} y={top - 6} width={fretW * frets} height={stringGap * 5 + 12} fill="var(--bg-elev-2)" rx={4} />
        {/* nut */}
        <rect x={leftPad + fretW - 3} y={top - 6} width={4} height={stringGap * 5 + 12} fill="var(--text)" />
        {/* fret wires */}
        {Array.from({ length: frets }, (_, f) => (
          <line key={f} x1={leftPad + fretW * (f + 2)} y1={top - 6} x2={leftPad + fretW * (f + 2)} y2={top + stringGap * 5 + 6} stroke="var(--line-strong)" strokeWidth={1.5} />
        ))}
        {/* inlays */}
        {[3, 5, 7, 9, 12, 15].filter((f) => f <= frets).map((f) => {
          const x = leftPad + fretW * (f + 0.5);
          const y = top + stringGap * 2.5;
          return f === 12 ? (
            <g key={f}>
              <circle cx={x} cy={y - stringGap * 1.2} r={4} fill="var(--line-strong)" />
              <circle cx={x} cy={y + stringGap * 1.2} r={4} fill="var(--line-strong)" />
            </g>
          ) : (
            <circle key={f} cx={x} cy={y} r={4} fill="var(--line-strong)" />
          );
        })}
        {/* strings, high E on top */}
        {Array.from({ length: 6 }, (_, i) => {
          const stringIndex = 5 - i; // 0 = low E
          const y = top + i * stringGap;
          return (
            <g key={i}>
              <line x1={leftPad + fretW - 3} y1={y} x2={width - rightPad} y2={y} stroke="var(--text-dim)" strokeWidth={0.8 + stringIndex * 0.35} />
              <text x={leftPad - 8} y={y + 4} fontSize={12} fill="var(--text-dim)" textAnchor="end" fontWeight={600}>
                {TUNING_NAMES[stringIndex]}
              </text>
            </g>
          );
        })}
        {/* fret numbers */}
        {Array.from({ length: frets + 1 }, (_, f) => (
          <text key={f} x={leftPad + fretW * (f + 0.5)} y={height - 8} fontSize={11} fill="var(--text-dim)" textAnchor="middle">
            {f}
          </text>
        ))}
        {/* dots */}
        {tones &&
          Array.from({ length: 6 }, (_, i) => {
            const stringIndex = 5 - i;
            const y = top + i * stringGap;
            return Array.from({ length: frets + 1 }, (_, f) => {
              const midi = TUNING_MIDI[stringIndex] + f;
              const tone = tones.get(midi % 12);
              if (!tone) return null;
              const x = leftPad + fretW * (f + 0.5);
              const root = tone.interval === 'R';
              const guide = isGuideTone(tone.interval);
              const fill = root ? 'var(--accent)' : guide ? 'var(--hot)' : 'var(--text-muted)';
              const r = root || guide ? 9.5 : 7.5;
              const label = labelMode === 'interval' ? tone.interval : noteName(tone.note, { unicode: true });
              return (
                <g key={`${i}-${f}`}>
                  {ringSet.has(midi) && <circle cx={x} cy={y} r={r + 4} fill="none" stroke="var(--text)" strokeWidth={2} />}
                  <circle cx={x} cy={y} r={r} fill={fill} opacity={root || guide ? 1 : 0.75} />
                  <text x={x} y={y + 3.5} fontSize={root || guide ? 9.5 : 8} fill="#1a1408" textAnchor="middle" fontWeight={700}>
                    {label}
                  </text>
                </g>
              );
            });
          })}
      </svg>
    </div>
  );
}
