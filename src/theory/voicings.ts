/**
 * Voicing templates and their realization on the fretboard.
 *
 * A template lists the chord interval sounding on each string (low E first) or "x" for a
 * muted string. Because a pitch class recurs every 12 frets, the fret for each string is
 * uniquely determined once we fix the root's fret and require all notes to sit within a
 * ±5-fret window of it. That keeps the data declarative and impossible to mis-fret.
 */
import { type Note, interval, transposeNote, pitchClass, midi, parseNote } from './notes';

export type VoicingLevel = 'shell' | 'drop2' | 'extended';

export interface VoicingTemplate {
  id: string;
  quality: string;
  level: VoicingLevel;
  name: string;
  /** interval per string, low E to high E; "x" = muted */
  strings: string[];
  /** short description for the chord library */
  tip?: string;
}

export interface RealizedVoicing {
  template: VoicingTemplate;
  root: Note;
  /** fret per string (low to high); null = muted; 0 = open */
  frets: (number | null)[];
  /** MIDI note per string, null = muted */
  midi: (number | null)[];
  /** spelled note per string */
  notes: (Note | null)[];
  intervals: (string | null)[];
  /** lowest fretted (non-open) fret, used to position the diagram window */
  baseFret: number;
  span: number;
  rootString: number;
}

/** Standard tuning, low to high, as MIDI numbers. */
export const TUNING_MIDI = [40, 45, 50, 55, 59, 64];
export const TUNING_NAMES = ['E', 'A', 'D', 'G', 'B', 'E'];

const WINDOW = 5;

/** Index (0 = low E) of the string carrying the root, i.e. the first "R" in the template. */
export function rootStringIndex(t: VoicingTemplate): number {
  const i = t.strings.indexOf('R');
  if (i === -1) throw new Error(`Voicing ${t.id} has no root`);
  return i;
}

/**
 * Realize a template for a given root. `preferFret` steers which octave of the shape is chosen:
 * we pick the root fret whose position is closest to it (subject to all frets being >= 0).
 */
export function realizeVoicing(t: VoicingTemplate, root: Note, preferFret = 5): RealizedVoicing {
  const rs = rootStringIndex(t);
  const rootPc = pitchClass(root);
  const base = (((rootPc - TUNING_MIDI[rs]) % 12) + 12) % 12; // 0..11
  const candidates = [base, base + 12, base + 24].map((rootFret) => build(t, root, rs, rootFret)).filter((v): v is RealizedVoicing => v !== null);
  if (!candidates.length) throw new Error(`Voicing ${t.id} cannot be realized for ${root.letter}`);
  candidates.sort((a, b) => Math.abs(a.baseFret - preferFret) - Math.abs(b.baseFret - preferFret) || a.baseFret - b.baseFret);
  return candidates[0];
}

function build(t: VoicingTemplate, root: Note, rs: number, rootFret: number): RealizedVoicing | null {
  const frets: (number | null)[] = [];
  const midis: (number | null)[] = [];
  const notes: (Note | null)[] = [];
  const intervals: (string | null)[] = [];
  for (let s = 0; s < 6; s++) {
    const name = t.strings[s];
    if (!name || name === 'x') {
      frets.push(null);
      midis.push(null);
      notes.push(null);
      intervals.push(null);
      continue;
    }
    const iv = interval(name);
    const note = transposeNote(root, iv);
    const pc = pitchClass(note);
    // the fret on this string closest to the root fret that sounds the pitch class
    const lo = (((pc - TUNING_MIDI[s]) % 12) + 12) % 12;
    let fret = lo;
    while (fret + 12 <= rootFret + WINDOW) {
      if (Math.abs(fret + 12 - rootFret) < Math.abs(fret - rootFret)) fret += 12;
      else break;
    }
    if (Math.abs(fret - rootFret) > WINDOW) return null;
    if (fret < 0) return null;
    frets.push(fret);
    midis.push(TUNING_MIDI[s] + fret);
    notes.push(note);
    intervals.push(name);
  }
  const fretted = frets.filter((f): f is number => f !== null && f > 0);
  const all = frets.filter((f): f is number => f !== null);
  if (!all.length) return null;
  if (Math.max(...all) > 19) return null;
  const baseFret = fretted.length ? Math.min(...fretted) : 0;
  const span = Math.max(...all) - Math.min(...fretted.length ? fretted : all);
  if (span > WINDOW) return null;
  return { template: t, root, frets, midi: midis, notes, intervals, baseFret, span, rootString: 6 - rs };
}

/** The sounding notes of a realized voicing, low to high. */
export function voicingMidiNotes(v: RealizedVoicing): number[] {
  return v.midi.filter((m): m is number => m !== null);
}

/** Convenience for tests and the chord library: realize by root name. */
export function realizeByName(t: VoicingTemplate, rootName: string, preferFret?: number): RealizedVoicing {
  return realizeVoicing(t, parseNote(rootName), preferFret);
}

export function lowestMidi(v: RealizedVoicing): number {
  return Math.min(...voicingMidiNotes(v));
}

/** Midi of a fret on a string index (0 = low E). */
export function fretMidi(stringIndex: number, fret: number): number {
  return TUNING_MIDI[stringIndex] + fret;
}

export { midi };
