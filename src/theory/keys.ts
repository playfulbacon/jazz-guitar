/**
 * Keys, Roman numeral analysis, and cadence (ii–V–I) detection.
 */
import {
  type Note,
  type Interval,
  parseNote,
  noteName,
  transposeNote,
  intervalBetween,
  pitchClass,
  interval,
  LETTERS,
} from './notes';
import { type Chord } from './chords';

export type Mode = 'major' | 'minor';

export interface Key {
  tonic: Note;
  mode: Mode;
}

export function parseKey(text: string): Key {
  const m = /^([A-G](?:#|b)?)\s*(m|min|minor|-)?$/i.exec(text.trim());
  if (!m) throw new Error(`Cannot parse key: "${text}"`);
  const tonic = parseNote(m[1].charAt(0).toUpperCase() + m[1].slice(1));
  return { tonic, mode: m[2] ? 'minor' : 'major' };
}

export function keyName(key: Key, opts: { unicode?: boolean } = {}): string {
  return noteName(key.tonic, opts) + (key.mode === 'minor' ? 'm' : '');
}

/** Number of sharps (+) or flats (-) in the key signature. */
export function keySignature(key: Key): number {
  // Circle-of-fifths position relative to C major / A minor.
  const majorTonic = key.mode === 'major' ? key.tonic : transposeNote(key.tonic, interval('b3'));
  const letterFifths: Record<string, number> = { F: -1, C: 0, G: 1, D: 2, A: 3, E: 4, B: 5 };
  return letterFifths[majorTonic.letter] + majorTonic.accidental * 7;
}

/**
 * Pick the conventional spelling for a key: at most six accidentals, flats preferred on ties
 * (Gb over F#, Ebm over D#m), sharps for keys like F#m/C#m where the flat version would be absurd.
 */
export function normalizeKey(key: Key): Key {
  const sig = keySignature(key);
  if (Math.abs(sig) <= 5 || sig === -6) return key;
  const enharmonicTonic = respell(key.tonic);
  const alt: Key = { tonic: enharmonicTonic, mode: key.mode };
  const altSig = keySignature(alt);
  if (Math.abs(altSig) < Math.abs(sig) || (Math.abs(altSig) === 6 && altSig < 0)) return alt;
  return key;
}

function respell(n: Note): Note {
  const idx = LETTERS.indexOf(n.letter);
  const candidates: Note[] = [];
  for (const d of [-1, 1]) {
    const letter = LETTERS[(((idx + d) % 7) + 7) % 7];
    const natural = pitchClass({ letter, accidental: 0 });
    let accidental = ((pitchClass(n) - natural) % 12 + 12) % 12;
    if (accidental > 6) accidental -= 12;
    if (Math.abs(accidental) <= 1) candidates.push({ letter, accidental });
  }
  return candidates[0] ?? n;
}

/**
 * Transpose a key by a number of semitones and return the conventional spelling of the result
 * along with the exact interval (letter steps + semitones) that maps the old key to the new.
 */
export function transposeKey(key: Key, semitones: number): { key: Key; interval: Interval } {
  const norm = ((semitones % 12) + 12) % 12;
  if (norm === 0) return { key, interval: { steps: 0, semitones: 0 } };
  // Provisional spelling: use the diatonic step count implied by the semitones.
  const stepsBySemitone = [0, 1, 1, 2, 2, 3, 3, 4, 5, 5, 6, 6];
  const provisional = transposeNote(key.tonic, { steps: stepsBySemitone[norm], semitones: norm });
  const target = normalizeKey({ tonic: provisional, mode: key.mode });
  return { key: target, interval: intervalBetween(key.tonic, target.tonic) };
}

/** Relative major of a minor key (or the key itself if major). */
export function relativeMajor(key: Key): Key {
  return key.mode === 'major' ? key : { tonic: transposeNote(key.tonic, interval('b3')), mode: 'major' };
}

export function relativeMinor(key: Key): Key {
  return key.mode === 'minor' ? key : { tonic: transposeNote(key.tonic, interval('6')), mode: 'minor' };
}

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11];

export interface RomanNumeral {
  /** e.g. "bVII" (degree with accidental, upper case) */
  degree: string;
  /** e.g. "bVII7", "iiø7", "Imaj7" */
  text: string;
  /** letter-step distance 0..6 from the tonic */
  step: number;
  /** chromatic alteration relative to the major scale degree, -2..2 */
  alteration: number;
}

/**
 * Roman numeral of a chord relative to a key. Numerals are always measured against the
 * parallel MAJOR scale (the common jazz convention), so in C minor Ab maj7 is bVImaj7 and
 * Bb7 is bVII7, while G7 stays V7.
 */
export function romanNumeral(chord: Chord, key: Key): RomanNumeral {
  const iv = intervalBetween(key.tonic, chord.root);
  const step = iv.steps;
  let alteration = iv.semitones - MAJOR_SCALE_SEMITONES[step];
  if (alteration > 6) alteration -= 12;
  if (alteration < -6) alteration += 12;
  const accidental = alteration < 0 ? 'b'.repeat(-alteration) : '#'.repeat(alteration);
  const lower = chord.quality.family === 'minor' || chord.quality.family === 'halfdim' || chord.quality.family === 'dim';
  const numeral = lower ? ROMAN[step].toLowerCase() : ROMAN[step];
  const degree = accidental + ROMAN[step];
  return { degree, text: accidental + numeral + chord.quality.roman, step, alteration };
}

export type CadenceType = 'major251' | 'minor251' | 'ii-V' | 'V-I' | 'secondary';

export interface Cadence {
  type: CadenceType;
  /** inclusive index range into the analysed chord list */
  start: number;
  end: number;
  /** roman numeral of the target chord, e.g. "I", "vi", "IV" */
  target: string;
  /** human readable description */
  label: string;
}

export interface AnalyzedChord {
  chord: Chord;
  numeral: RomanNumeral;
  /** secondary-dominant style label, e.g. "V7/ii", when applicable */
  functionLabel?: string;
}

function isMinorType(c: Chord) {
  return c.quality.family === 'minor';
}
function isMajorType(c: Chord) {
  return c.quality.family === 'major';
}
function isDominant(c: Chord) {
  return c.quality.family === 'dominant' || c.quality.id === '7sus4' || c.quality.id === '9sus4';
}
function isHalfDim(c: Chord) {
  return c.quality.family === 'halfdim';
}
/** true when b's root is a perfect fourth above a's root (i.e. a resolves down a fifth to b) */
function resolvesTo(a: Chord, b: Chord): boolean {
  return (pitchClass(a.root) + 5) % 12 === pitchClass(b.root);
}

/**
 * Analyse a list of chords in a key: roman numerals, ii–V–I units, and secondary dominants.
 * Consecutive identical chords are treated as one for cadence purposes but keep their indexes.
 */
export function analyzeProgression(chords: Chord[], key: Key): { chords: AnalyzedChord[]; cadences: Cadence[] } {
  const analyzed: AnalyzedChord[] = chords.map((chord) => ({ chord, numeral: romanNumeral(chord, key) }));
  // Collapse repeated chords into "slots" so ii | ii | V | I is still one cadence.
  const slots: { chordIndex: number; last: number }[] = [];
  chords.forEach((c, i) => {
    const prev = slots[slots.length - 1];
    if (prev && sameChord(chords[prev.chordIndex], c)) prev.last = i;
    else slots.push({ chordIndex: i, last: i });
  });

  const cadences: Cadence[] = [];
  const claimed = new Set<number>();
  const tonicPc = pitchClass(key.tonic);

  for (let s = 0; s < slots.length; s++) {
    const a = chords[slots[s].chordIndex];
    const b = slots[s + 1] ? chords[slots[s + 1].chordIndex] : undefined;
    const c = slots[s + 2] ? chords[slots[s + 2].chordIndex] : undefined;
    if (claimed.has(s)) continue;

    // Full ii–V–I
    if (b && c && (isMinorType(a) || isHalfDim(a)) && isDominant(b) && resolvesTo(a, b) && resolvesTo(b, c)) {
      const minor = isHalfDim(a) || isMinorType(c);
      const major = isMajorType(c);
      if (major || minor) {
        const target = romanNumeral(c, key).degree;
        const targetText = pitchClass(c.root) === tonicPc ? (key.mode === 'minor' ? 'i' : 'I') : romanLabelFor(c, key);
        cadences.push({
          type: minor ? 'minor251' : 'major251',
          start: slots[s].chordIndex,
          end: slots[s + 2].last,
          target,
          label: `${minor ? 'minor' : 'major'} ii–V–${minor ? 'i' : 'I'}${pitchClass(c.root) === tonicPc ? '' : ' of ' + targetText}`,
        });
        claimed.add(s);
        claimed.add(s + 1);
        continue;
      }
    }
    // ii–V without resolution
    if (b && (isMinorType(a) || isHalfDim(a)) && isDominant(b) && resolvesTo(a, b)) {
      const expected = transposeNote(b.root, interval('4'));
      cadences.push({
        type: 'ii-V',
        start: slots[s].chordIndex,
        end: slots[s + 1].last,
        target: noteName(expected),
        label: `ii–V (toward ${noteName(expected, { unicode: true })})`,
      });
      claimed.add(s);
      claimed.add(s + 1);
      continue;
    }
    // V–I resolution (no ii)
    if (b && isDominant(a) && resolvesTo(a, b) && (isMajorType(b) || isMinorType(b))) {
      const isPrimary = pitchClass(b.root) === tonicPc;
      cadences.push({
        type: isPrimary ? 'V-I' : 'secondary',
        start: slots[s].chordIndex,
        end: slots[s + 1].last,
        target: romanNumeral(b, key).degree,
        label: isPrimary ? 'V–I' : `V7/${romanLabelFor(b, key)} → ${romanLabelFor(b, key)}`,
      });
      claimed.add(s);
      continue;
    }
  }

  // Secondary-dominant function labels on the chords themselves.
  chords.forEach((c, i) => {
    if (!isDominant(c)) return;
    const nextIdx = nextDifferentChord(chords, i);
    if (nextIdx === -1) return;
    const next = chords[nextIdx];
    if (resolvesTo(c, next) && pitchClass(next.root) !== tonicPc && (isMajorType(next) || isMinorType(next) || isDominant(next) || isHalfDim(next))) {
      analyzed[i].functionLabel = `V7/${romanLabelFor(next, key)}`;
    }
  });

  return { chords: analyzed, cadences };
}

function romanLabelFor(c: Chord, key: Key): string {
  const rn = romanNumeral(c, key);
  const lower = c.quality.family === 'minor' || c.quality.family === 'halfdim' || c.quality.family === 'dim';
  const acc = rn.alteration < 0 ? 'b'.repeat(-rn.alteration) : '#'.repeat(rn.alteration);
  return acc + (lower ? ROMAN[rn.step].toLowerCase() : ROMAN[rn.step]);
}

function nextDifferentChord(chords: Chord[], i: number): number {
  for (let j = i + 1; j < chords.length; j++) if (!sameChord(chords[i], chords[j])) return j;
  return -1;
}

export function sameChord(a: Chord, b: Chord): boolean {
  return pitchClass(a.root) === pitchClass(b.root) && a.quality.id === b.quality.id;
}

/** All twelve keys of a mode in chart-friendly spelling. */
export function allKeys(mode: Mode): Key[] {
  const roots = mode === 'major'
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  return roots.map((r) => ({ tonic: parseNote(r), mode }));
}

/** Format a roman numeral with unicode accidentals for display. */
export function formatNumeral(text: string): string {
  return text.replace(/b(?=[IViv])/g, '♭').replace(/#(?=[IViv])/g, '♯').replace(/b(?=\d)/g, '♭').replace(/#(?=\d)/g, '♯');
}
