/**
 * Note and interval math with correct enharmonic spelling.
 *
 * Notes are represented by a letter plus an accidental offset, never by a bare
 * pitch class, so that transposing Bb up a whole step yields C (not B#).
 */

export type Letter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export interface Note {
  letter: Letter;
  /** -2 = double flat, -1 = flat, 0 = natural, 1 = sharp, 2 = double sharp */
  accidental: number;
}

/** A directed interval: how many letter steps and how many semitones it spans. */
export interface Interval {
  steps: number;
  semitones: number;
}

export const LETTERS: Letter[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const LETTER_PC: Record<Letter, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Interval names used throughout chord formulas and voicing templates. */
export const INTERVALS: Record<string, Interval> = {
  R: { steps: 0, semitones: 0 },
  '1': { steps: 0, semitones: 0 },
  b2: { steps: 1, semitones: 1 },
  b9: { steps: 1, semitones: 1 },
  '2': { steps: 1, semitones: 2 },
  '9': { steps: 1, semitones: 2 },
  '#2': { steps: 1, semitones: 3 },
  '#9': { steps: 1, semitones: 3 },
  b3: { steps: 2, semitones: 3 },
  '3': { steps: 2, semitones: 4 },
  '4': { steps: 3, semitones: 5 },
  '11': { steps: 3, semitones: 5 },
  '#4': { steps: 3, semitones: 6 },
  '#11': { steps: 3, semitones: 6 },
  b5: { steps: 4, semitones: 6 },
  '5': { steps: 4, semitones: 7 },
  '#5': { steps: 4, semitones: 8 },
  b6: { steps: 5, semitones: 8 },
  b13: { steps: 5, semitones: 8 },
  '6': { steps: 5, semitones: 9 },
  '13': { steps: 5, semitones: 9 },
  bb7: { steps: 6, semitones: 9 },
  b7: { steps: 6, semitones: 10 },
  '7': { steps: 6, semitones: 11 },
};

export function interval(name: string): Interval {
  const iv = INTERVALS[name];
  if (!iv) throw new Error(`Unknown interval: ${name}`);
  return iv;
}

const NOTE_RE = /^([A-Ga-g])(#{1,2}|b{1,2}|x|♭|♯)?$/;

export function parseNote(input: string): Note {
  const m = NOTE_RE.exec(input.trim());
  if (!m) throw new Error(`Cannot parse note: "${input}"`);
  const letter = m[1].toUpperCase() as Letter;
  const acc = m[2] ?? '';
  let accidental = 0;
  if (acc === '#' || acc === '♯') accidental = 1;
  else if (acc === '##' || acc === 'x') accidental = 2;
  else if (acc === 'b' || acc === '♭') accidental = -1;
  else if (acc === 'bb') accidental = -2;
  return { letter, accidental };
}

export function isNoteName(input: string): boolean {
  return NOTE_RE.test(input.trim());
}

export function noteName(n: Note, opts: { unicode?: boolean } = {}): string {
  const { unicode = false } = opts;
  const flat = unicode ? '♭' : 'b';
  const sharp = unicode ? '♯' : '#';
  let acc = '';
  if (n.accidental === -2) acc = flat + flat;
  else if (n.accidental === -1) acc = flat;
  else if (n.accidental === 1) acc = sharp;
  else if (n.accidental === 2) acc = sharp + sharp;
  return n.letter + acc;
}

export function pitchClass(n: Note): number {
  return (((LETTER_PC[n.letter] + n.accidental) % 12) + 12) % 12;
}

export function notesEqual(a: Note, b: Note): boolean {
  return a.letter === b.letter && a.accidental === b.accidental;
}

export function enharmonic(a: Note, b: Note): boolean {
  return pitchClass(a) === pitchClass(b);
}

/** Transpose a note by an interval, keeping the spelling implied by the interval. */
export function transposeNote(n: Note, iv: Interval): Note {
  const idx = LETTERS.indexOf(n.letter);
  const letter = LETTERS[(((idx + iv.steps) % 7) + 7) % 7];
  const targetPc = (((pitchClass(n) + iv.semitones) % 12) + 12) % 12;
  const natural = LETTER_PC[letter];
  // accidental in range -6..5
  let accidental = ((((targetPc - natural) % 12) + 12) % 12);
  if (accidental > 6) accidental -= 12;
  return { letter, accidental };
}

/** The ascending interval from a to b (steps 0..6, semitones 0..11, coherent with the letters). */
export function intervalBetween(a: Note, b: Note): Interval {
  const steps = (((LETTERS.indexOf(b.letter) - LETTERS.indexOf(a.letter)) % 7) + 7) % 7;
  let semitones = (((pitchClass(b) - pitchClass(a)) % 12) + 12) % 12;
  // A 0-step interval should never be near 12 semitones (e.g. C -> Cb is -1, not 11).
  if (steps === 0 && semitones > 6) semitones -= 12;
  return { steps, semitones };
}

/** Invert an ascending interval into its descending counterpart (steps and semitones negated). */
export function invertInterval(iv: Interval): Interval {
  return { steps: -iv.steps, semitones: -iv.semitones };
}

/**
 * Respell awkward notes to their simplest enharmonic: double accidentals become
 * naturals or single accidentals, and B#/E#/Cb/Fb become C/F/B/E.
 * The `preferFlats` flag decides the spelling for black keys when a respelling is needed.
 */
export function simplifyNote(n: Note, preferFlats = true): Note {
  if (n.accidental >= -1 && n.accidental <= 1) {
    const awkward =
      (n.letter === 'B' && n.accidental === 1) ||
      (n.letter === 'E' && n.accidental === 1) ||
      (n.letter === 'C' && n.accidental === -1) ||
      (n.letter === 'F' && n.accidental === -1);
    if (!awkward) return n;
  }
  return spellPitchClass(pitchClass(n), preferFlats);
}

const FLAT_SPELLINGS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const SHARP_SPELLINGS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function spellPitchClass(pc: number, preferFlats = true): Note {
  const norm = ((pc % 12) + 12) % 12;
  return parseNote((preferFlats ? FLAT_SPELLINGS : SHARP_SPELLINGS)[norm]);
}

/** The twelve chromatic roots in the spelling players expect on chord charts. */
export const CHROMATIC_ROOTS: string[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

/** MIDI number of a note in a given octave (scientific pitch: C4 = 60). */
export function midi(n: Note, octave: number): number {
  return 12 * (octave + 1) + LETTER_PC[n.letter] + n.accidental;
}

export function midiToFrequency(m: number): number {
  return 440 * Math.pow(2, (m - 69) / 12);
}

/** Name of a MIDI note using flats (e.g. 61 -> "Db4"). */
export function midiName(m: number, preferFlats = true): string {
  const octave = Math.floor(m / 12) - 1;
  return noteName(spellPitchClass(m % 12, preferFlats)) + octave;
}
