/**
 * Tune schema, form expansion (repeats / endings), and transposition.
 */
import { type Chord, parseChord, chordSymbol } from './chords';
import { type Key, parseKey, transposeKey, keyName } from './keys';
import { type Interval, transposeNote, simplifyNote, noteName } from './notes';

export type Style = 'swing' | 'bossa' | 'ballad';

export interface TuneChord {
  symbol: string;
  beats: number;
}

export interface TuneBar {
  chords: TuneChord[];
  /** 1 or 2 when the bar belongs to a first/second ending of a repeated section */
  ending?: number;
}

export interface TuneSection {
  label: string;
  repeat?: number;
  bars: TuneBar[];
}

export interface Tune {
  id: string;
  title: string;
  composer?: string;
  defaultKey: string;
  form: string;
  style: Style;
  defaultTempo: number;
  sections: TuneSection[];
  analysis?: { keyPairs?: string[]; notes?: string };
  learning?: {
    phase?: number;
    order?: number;
    why?: string;
    concepts?: string[];
    drills?: string[];
    listen?: string[];
    milestones?: string[];
  };
}

/** A bar as laid out on the chart (one cell in the grid). */
export interface ChartBar {
  id: number;
  sectionIndex: number;
  sectionLabel: string;
  barIndexInSection: number;
  chords: { symbol: string; beats: number; chord: Chord }[];
  ending?: number;
  isSectionStart: boolean;
  isSectionEnd: boolean;
  repeatOpen: boolean;
  repeatClose: boolean;
  totalBeats: number;
}

/** A bar as it is played (after unrolling repeats and endings). */
export interface PlayBar {
  chartId: number;
  sectionLabel: string;
  chords: { symbol: string; beats: number; chord: Chord }[];
  totalBeats: number;
  /** true for the last bar of a section pass (drums play a fill) */
  sectionEnd: boolean;
  /** true for the last bar of the form */
  formEnd: boolean;
}

export function chartBars(tune: Tune): ChartBar[] {
  const out: ChartBar[] = [];
  let id = 0;
  tune.sections.forEach((section, sectionIndex) => {
    const repeat = section.repeat ?? 1;
    const hasEndings = section.bars.some((b) => b.ending !== undefined);
    const lastFirstEnding = hasEndings ? lastIndex(section.bars, (b) => b.ending === 1) : section.bars.length - 1;
    section.bars.forEach((bar, barIndex) => {
      const chords = bar.chords.map((c) => ({ ...c, chord: parseChord(c.symbol) }));
      out.push({
        id: id++,
        sectionIndex,
        sectionLabel: section.label,
        barIndexInSection: barIndex,
        chords,
        ending: bar.ending,
        isSectionStart: barIndex === 0,
        isSectionEnd: barIndex === section.bars.length - 1,
        repeatOpen: repeat > 1 && barIndex === 0,
        repeatClose: repeat > 1 && barIndex === lastFirstEnding,
        totalBeats: chords.reduce((s, c) => s + c.beats, 0),
      });
    });
  });
  return out;
}

function lastIndex<T>(arr: T[], pred: (t: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
  return -1;
}

/** Unroll the form into the order the bars are actually played. */
export function expandForm(tune: Tune): PlayBar[] {
  const chart = chartBars(tune);
  const out: PlayBar[] = [];
  tune.sections.forEach((section, sectionIndex) => {
    const repeat = section.repeat ?? 1;
    const cells = chart.filter((c) => c.sectionIndex === sectionIndex);
    for (let pass = 1; pass <= repeat; pass++) {
      const passBars = cells.filter((c) => c.ending === undefined || c.ending === pass);
      passBars.forEach((c, i) => {
        out.push({
          chartId: c.id,
          sectionLabel: c.sectionLabel,
          chords: c.chords,
          totalBeats: c.totalBeats,
          sectionEnd: i === passBars.length - 1,
          formEnd: false,
        });
      });
    }
  });
  if (out.length) out[out.length - 1].formEnd = true;
  return out;
}

/** Every chord of the tune in chart order (one entry per chord slot), with its chart bar id. */
export function chartChords(tune: Tune): { chartId: number; slot: number; chord: Chord }[] {
  const out: { chartId: number; slot: number; chord: Chord }[] = [];
  for (const bar of chartBars(tune)) bar.chords.forEach((c, slot) => out.push({ chartId: bar.id, slot, chord: c.chord }));
  return out;
}

export function tuneKey(tune: Tune): Key {
  return parseKey(tune.defaultKey);
}

/** Transpose a whole tune by a number of semitones with conventional key spelling. */
export function transposeTune(tune: Tune, semitones: number): Tune {
  const norm = ((semitones % 12) + 12) % 12;
  if (norm === 0) return tune;
  const from = parseKey(tune.defaultKey);
  const { key: to, interval } = transposeKey(from, norm);
  return {
    ...tune,
    defaultKey: keyName(to),
    sections: tune.sections.map((s) => ({
      ...s,
      bars: s.bars.map((b) => ({ ...b, chords: b.chords.map((c) => ({ ...c, symbol: transposeSymbol(c.symbol, interval) })) })),
    })),
    analysis: tune.analysis
      ? { ...tune.analysis, keyPairs: tune.analysis.keyPairs?.map((k) => keyName(transposeKey(parseKey(k), norm).key)) }
      : undefined,
  };
}

export function transposeSymbol(symbol: string, interval: Interval): string {
  const chord = parseChord(symbol);
  const root = simplifyNote(transposeNote(chord.root, interval), true);
  const bass = chord.bass ? simplifyNote(transposeNote(chord.bass, interval), true) : undefined;
  return chordSymbol(root, chord.quality, bass);
}

/** Total bars when played (repeats unrolled). */
export function playedLength(tune: Tune): number {
  return expandForm(tune).length;
}

/** Display key of a tune after transposing by n semitones. */
export function transposedKeyName(tune: Tune, semitones: number): string {
  return noteName(transposeKey(parseKey(tune.defaultKey), semitones).key.tonic) + (parseKey(tune.defaultKey).mode === 'minor' ? 'm' : '');
}
