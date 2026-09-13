/**
 * Chord symbol parsing, chord qualities, and chord spelling.
 */
import { type Note, interval, parseNote, transposeNote, noteName, pitchClass } from './notes';

export type ChordFamily = 'major' | 'minor' | 'dominant' | 'halfdim' | 'dim' | 'sus' | 'aug';

export interface ChordQuality {
  /** canonical id, e.g. "m7b5" */
  id: string;
  /** how the symbol is written on charts, e.g. "m7b5" */
  display: string;
  family: ChordFamily;
  /** interval names from the root, low to high in close position */
  intervals: string[];
  /** suffix used for roman numerals, e.g. "ø7" */
  roman: string;
  /** which voicing sets to try, in order, when the comper needs a grip */
  voicingFallback: string[];
}

const Q = (
  id: string,
  display: string,
  family: ChordFamily,
  intervals: string[],
  roman: string,
  voicingFallback: string[] = [],
): ChordQuality => ({ id, display, family, intervals, roman, voicingFallback: [id, ...voicingFallback] });

export const QUALITIES: Record<string, ChordQuality> = {
  maj: Q('maj', '', 'major', ['R', '3', '5'], '', ['6', 'maj7']),
  '6': Q('6', '6', 'major', ['R', '3', '5', '6'], '6', ['maj7']),
  '69': Q('69', '6/9', 'major', ['R', '3', '5', '6', '9'], '6/9', ['6', 'maj7']),
  maj7: Q('maj7', 'maj7', 'major', ['R', '3', '5', '7'], 'maj7', ['6']),
  maj9: Q('maj9', 'maj9', 'major', ['R', '3', '5', '7', '9'], 'maj9', ['maj7', '6']),
  'maj7#11': Q('maj7#11', 'maj7#11', 'major', ['R', '3', '5', '7', '9', '#11'], 'maj7#11', ['maj7', '6']),
  maj13: Q('maj13', 'maj13', 'major', ['R', '3', '5', '7', '9', '13'], 'maj13', ['maj9', 'maj7', '6']),
  m: Q('m', 'm', 'minor', ['R', 'b3', '5'], '', ['m7', 'm6']),
  m6: Q('m6', 'm6', 'minor', ['R', 'b3', '5', '6'], '6', ['m7']),
  m69: Q('m69', 'm6/9', 'minor', ['R', 'b3', '5', '6', '9'], '6/9', ['m6', 'm7']),
  m7: Q('m7', 'm7', 'minor', ['R', 'b3', '5', 'b7'], '7', ['m6']),
  m9: Q('m9', 'm9', 'minor', ['R', 'b3', '5', 'b7', '9'], '9', ['m7']),
  m11: Q('m11', 'm11', 'minor', ['R', 'b3', '5', 'b7', '9', '11'], '11', ['m9', 'm7']),
  mMaj7: Q('mMaj7', 'm(maj7)', 'minor', ['R', 'b3', '5', '7'], 'm(maj7)', ['m6', 'm7']),
  mMaj9: Q('mMaj9', 'm(maj9)', 'minor', ['R', 'b3', '5', '7', '9'], 'm(maj9)', ['mMaj7', 'm6']),
  '7': Q('7', '7', 'dominant', ['R', '3', '5', 'b7'], '7'),
  '9': Q('9', '9', 'dominant', ['R', '3', '5', 'b7', '9'], '9', ['7']),
  '13': Q('13', '13', 'dominant', ['R', '3', '5', 'b7', '9', '13'], '13', ['9', '7']),
  '7b9': Q('7b9', '7b9', 'dominant', ['R', '3', '5', 'b7', 'b9'], '7b9', ['7']),
  '7#9': Q('7#9', '7#9', 'dominant', ['R', '3', '5', 'b7', '#9'], '7#9', ['7']),
  '7#5': Q('7#5', '7#5', 'dominant', ['R', '3', '#5', 'b7'], '7#5', ['7']),
  '7b5': Q('7b5', '7b5', 'dominant', ['R', '3', 'b5', 'b7'], '7b5', ['7#11', '7']),
  '7#11': Q('7#11', '7#11', 'dominant', ['R', '3', '5', 'b7', '9', '#11'], '7#11', ['7']),
  '7b13': Q('7b13', '7b13', 'dominant', ['R', '3', '5', 'b7', 'b13'], '7b13', ['7#5', '7']),
  '7alt': Q('7alt', '7alt', 'dominant', ['R', '3', 'b7', 'b9', '#9', '#5'], '7alt', ['7#5', '7b9', '7']),
  '7sus4': Q('7sus4', '7sus4', 'sus', ['R', '4', '5', 'b7'], '7sus4', ['sus4', '7']),
  '9sus4': Q('9sus4', '9sus4', 'sus', ['R', '4', '5', 'b7', '9'], '9sus4', ['7sus4', '7']),
  sus4: Q('sus4', 'sus4', 'sus', ['R', '4', '5'], 'sus4', ['7sus4']),
  sus2: Q('sus2', 'sus2', 'sus', ['R', '2', '5'], 'sus2', ['sus4']),
  m7b5: Q('m7b5', 'm7b5', 'halfdim', ['R', 'b3', 'b5', 'b7'], 'ø7'),
  m11b5: Q('m11b5', 'm11b5', 'halfdim', ['R', 'b3', 'b5', 'b7', '11'], 'ø11', ['m7b5']),
  dim: Q('dim', 'dim', 'dim', ['R', 'b3', 'b5'], '°', ['dim7']),
  dim7: Q('dim7', 'dim7', 'dim', ['R', 'b3', 'b5', 'bb7'], '°7'),
  aug: Q('aug', '+', 'aug', ['R', '3', '#5'], '+', ['7#5']),
};

/** Alternate spellings accepted by the parser, mapped to canonical ids. */
const ALIASES: Record<string, string> = {
  '': 'maj', maj: 'maj', M: 'maj', major: 'maj',
  '6': '6', maj6: '6', M6: '6',
  '69': '69', '6/9': '69', '6add9': '69',
  maj7: 'maj7', M7: 'maj7', ma7: 'maj7', 'Δ': 'maj7', 'Δ7': 'maj7', '∆': 'maj7', '∆7': 'maj7', j7: 'maj7',
  maj9: 'maj9', M9: 'maj9', 'Δ9': 'maj9',
  'maj7#11': 'maj7#11', 'M7#11': 'maj7#11', 'Δ7#11': 'maj7#11', 'maj7(#11)': 'maj7#11',
  maj13: 'maj13', M13: 'maj13',
  m: 'm', min: 'm', '-': 'm', mi: 'm',
  m6: 'm6', min6: 'm6', '-6': 'm6', mi6: 'm6',
  'm6/9': 'm69', m69: 'm69', '-6/9': 'm69',
  m7: 'm7', min7: 'm7', '-7': 'm7', mi7: 'm7',
  m9: 'm9', min9: 'm9', '-9': 'm9',
  m11: 'm11', min11: 'm11', '-11': 'm11',
  mMaj7: 'mMaj7', 'm(maj7)': 'mMaj7', mM7: 'mMaj7', minMaj7: 'mMaj7', 'mΔ7': 'mMaj7', '-Δ7': 'mMaj7', 'm∆7': 'mMaj7', '-maj7': 'mMaj7',
  mMaj9: 'mMaj9', 'm(maj9)': 'mMaj9', mM9: 'mMaj9', minMaj9: 'mMaj9',
  m11b5: 'm11b5', 'ø11': 'm11b5', 'm11(b5)': 'm11b5',
  '7': '7', dom7: '7',
  '9': '9', '13': '13',
  '7b9': '7b9', '7(b9)': '7b9', '7-9': '7b9',
  '7#9': '7#9', '7(#9)': '7#9', '7+9': '7#9',
  '7#5': '7#5', '7+5': '7#5', '7+': '7#5', aug7: '7#5', '+7': '7#5',
  '7b5': '7b5', '7-5': '7b5',
  '7#11': '7#11', '7(#11)': '7#11', '9#11': '7#11',
  '7b13': '7b13', '7(b13)': '7b13',
  '7alt': '7alt', alt: '7alt', '7#5#9': '7alt', '7b9#5': '7alt', '7#9#5': '7alt', '7b9b13': '7alt',
  '7sus4': '7sus4', '7sus': '7sus4', sus7: '7sus4',
  '9sus4': '9sus4', '9sus': '9sus4',
  sus4: 'sus4', sus: 'sus4', sus2: 'sus2',
  m7b5: 'm7b5', 'm7(b5)': 'm7b5', 'ø': 'm7b5', 'ø7': 'm7b5', '-7b5': 'm7b5', min7b5: 'm7b5', 'Ø': 'm7b5', 'Ø7': 'm7b5',
  dim: 'dim', o: 'dim', '°': 'dim',
  dim7: 'dim7', o7: 'dim7', '°7': 'dim7',
  aug: 'aug', '+': 'aug',
};

export interface Chord {
  root: Note;
  quality: ChordQuality;
  /** bass note for slash chords, if different from the root */
  bass?: Note;
  /** the symbol as written */
  symbol: string;
}

// Quality is non-greedy so "C6/9" keeps its slash as part of the quality while "C/E" reads a bass note.
const SYMBOL_RE = /^([A-G](?:#|b|♯|♭)?)(.*?)(?:\/([A-G](?:#|b|♯|♭)?))?$/;

export function parseChord(symbol: string): Chord {
  const trimmed = symbol.trim();
  const m = SYMBOL_RE.exec(trimmed);
  if (!m) throw new Error(`Cannot parse chord symbol: "${symbol}"`);
  const root = parseNote(m[1]);
  const qualityText = m[2].trim();
  const id = ALIASES[qualityText];
  if (!id) throw new Error(`Unknown chord quality "${qualityText}" in "${symbol}"`);
  const chord: Chord = { root, quality: QUALITIES[id], symbol: trimmed };
  if (m[3]) chord.bass = parseNote(m[3]);
  return chord;
}

export function isChordSymbol(symbol: string): boolean {
  try {
    parseChord(symbol);
    return true;
  } catch {
    return false;
  }
}

/** Build a symbol string from root + quality (+ optional bass). */
export function chordSymbol(root: Note, quality: ChordQuality, bass?: Note): string {
  const base = noteName(root) + quality.display;
  return bass ? `${base}/${noteName(bass)}` : base;
}

/** Spell every chord tone as a properly spelled note. */
export function chordTones(chord: Chord): { interval: string; note: Note }[] {
  return chord.quality.intervals.map((name) => ({ interval: name, note: transposeNote(chord.root, interval(name)) }));
}

/** Map of pitch class -> interval name for the chord (used by the fretboard spotlight). */
export function chordToneMap(chord: Chord): Map<number, { interval: string; note: Note }> {
  const map = new Map<number, { interval: string; note: Note }>();
  for (const t of chordTones(chord)) map.set(pitchClass(t.note), t);
  return map;
}

/** Guide tones (3rd and 7th, or their substitutes) are what define the sound. */
export function isGuideTone(intervalName: string): boolean {
  return ['3', 'b3', '7', 'b7', 'bb7', '4', '6'].includes(intervalName);
}

/** Pretty-print a chord symbol with unicode flats/sharps and nicer quality text. */
export function displaySymbol(chord: Chord, opts: { unicode?: boolean } = {}): string {
  const unicode = opts.unicode ?? true;
  const rootText = noteName(chord.root, { unicode });
  let q = chord.quality.display;
  if (unicode) q = q.replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
  const bass = chord.bass ? '/' + noteName(chord.bass, { unicode }) : '';
  return rootText + q + bass;
}

export const QUALITY_IDS = Object.keys(QUALITIES);
