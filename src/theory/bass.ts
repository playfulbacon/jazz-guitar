/**
 * Walking bass line generation.
 *
 * Root on beat one, chord tones through the middle of the bar, and an approach tone into the
 * next chord's root on the last beat. Lines stay in the upright's comfortable register and
 * move mostly stepwise with occasional skips and octave jumps.
 */
import { type Chord } from './chords';
import { interval, transposeNote, pitchClass } from './notes';
import { type Rng, weighted, pick } from './random';

export interface BassSlot {
  chord: Chord;
  /** number of beats this chord lasts */
  beats: number;
}

export interface BassNote {
  /** offset in beats from the start of the slot; .5 denotes a swung upbeat */
  beat: number;
  midi: number;
  /** duration in beats */
  duration: number;
  /** 0..1 */
  velocity: number;
  /** what the note is doing, for debugging and tests */
  role: 'root' | 'chordTone' | 'scaleTone' | 'approach' | 'push';
}

export const BASS_LOW = 28; // E1
export const BASS_HIGH = 55; // G3

export type BassFeel = 'walking' | 'two';

function bassRootPc(chord: Chord): number {
  return pitchClass(chord.bass ?? chord.root);
}

/** Bring a pitch class into the bass range at the octave closest to `near`. */
function nearest(pc: number, near: number): number {
  let best = -1;
  let bestDist = Infinity;
  for (let m = BASS_LOW; m <= BASS_HIGH; m++) {
    if (m % 12 !== ((pc % 12) + 12) % 12) continue;
    const d = Math.abs(m - near);
    if (d < bestDist) {
      bestDist = d;
      best = m;
    }
  }
  return best;
}

function clampRange(m: number): number {
  while (m < BASS_LOW) m += 12;
  while (m > BASS_HIGH) m -= 12;
  return m;
}

function chordPcs(chord: Chord): { interval: string; pc: number }[] {
  return chord.quality.intervals.map((name) => ({ interval: name, pc: pitchClass(transposeNote(chord.root, interval(name))) }));
}

/** Scale (mixolydian / dorian / ionian-ish) tones for stepwise motion, as pitch classes. */
function scalePcs(chord: Chord): number[] {
  const root = pitchClass(chord.root);
  const f = chord.quality.family;
  const steps =
    f === 'major' ? [0, 2, 4, 5, 7, 9, 11]
    : f === 'minor' ? [0, 2, 3, 5, 7, 9, 10]
    : f === 'dominant' || f === 'sus' ? [0, 2, 4, 5, 7, 9, 10]
    : f === 'halfdim' ? [0, 2, 3, 5, 6, 8, 10]
    : f === 'dim' ? [0, 2, 3, 5, 6, 8, 9, 11]
    : [0, 2, 4, 6, 8, 10];
  return steps.map((s) => (root + s) % 12);
}

/**
 * Generate a bass line for one slot (a chord lasting `beats` beats), aiming at the next slot's
 * root. Returns notes relative to the slot start.
 */
export function bassLineForSlot(slot: BassSlot, next: BassSlot | undefined, prevMidi: number | undefined, rng: Rng, feel: BassFeel = 'walking'): BassNote[] {
  const rootPc = bassRootPc(slot.chord);
  const near = prevMidi ?? 40;
  const root = nearest(rootPc, near);
  const notes: BassNote[] = [];
  const nextRootPc = next ? bassRootPc(next.chord) : rootPc;
  const beats = Math.max(1, Math.round(slot.beats));

  const vel = () => 0.75 + rng() * 0.2;

  if (feel === 'two' || beats < 2) {
    // Two feel: root on 1, fifth (or approach) on 3. Handles ballads and short slots.
    notes.push({ beat: 0, midi: root, duration: beats >= 2 ? 2 : beats, velocity: vel(), role: 'root' });
    if (beats >= 3) {
      const third = beats >= 4 ? 2 : beats - 1;
      const targetNext = nearest(nextRootPc, root);
      const useApproach = next && pitchClass(next.chord.root) !== rootPc && rng() < 0.5;
      const fifth = clampRange(nearest((rootPc + 7) % 12, root - 3));
      const m = useApproach ? approachTone(targetNext, rng, root) : fifth;
      notes.push({ beat: third, midi: m, duration: beats - third, velocity: vel() * 0.9, role: useApproach ? 'approach' : 'chordTone' });
    }
    return notes;
  }

  // Walking: beat 1 root (occasionally an octave jump if we have been sitting low/high)
  notes.push({ beat: 0, midi: root, duration: 1, velocity: vel(), role: 'root' });

  const tones = chordPcs(slot.chord);
  const scale = scalePcs(slot.chord);
  const targetRoot = nearest(nextRootPc, root);
  const lastBeat = beats - 1;

  let current = root;
  for (let b = 1; b < lastBeat; b++) {
    let candidate: number;
    let role: BassNote['role'] = 'chordTone';
    if (b === 1) {
      // second beat: 3rd or 5th, mostly stepping up from the root
      const choice = weighted(rng, [
        { value: '3', weight: 3 },
        { value: '5', weight: 3 },
        { value: 'scale', weight: 2 },
      ]);
      if (choice === 'scale') {
        candidate = stepFrom(current, scale, 1, rng);
        role = 'scaleTone';
      } else {
        const name = choice === '3' ? thirdName(slot.chord) : fifthName(slot.chord);
        const pc = tones.find((t) => t.interval === name)?.pc ?? tones[1]?.pc ?? rootPc;
        candidate = nearestDirectional(pc, current, current < 44 ? 1 : -1);
      }
    } else {
      // beats 3 (and beyond in long slots): chord/scale tone that steps toward the target
      const dir = targetRoot > current ? 1 : -1;
      const r = rng();
      if (r < 0.55) {
        candidate = stepFrom(current, scale, dir, rng);
        role = 'scaleTone';
      } else if (r < 0.85) {
        const pcs = tones.map((t) => t.pc);
        candidate = nearestDirectional(pick(rng, pcs), current, dir);
      } else {
        candidate = clampRange(root + (root < 42 ? 12 : -12));
        role = 'root';
      }
    }
    candidate = clampRange(candidate);
    notes.push({ beat: b, midi: candidate, duration: 1, velocity: vel() * 0.92, role });
    current = candidate;
  }

  // last beat: approach tone into the next root (or back into our own root when static)
  const approachTarget = nearest(nextRootPc, current);
  const app = approachTone(approachTarget, rng, current);
  notes.push({ beat: lastBeat, midi: clampRange(app), duration: 1, velocity: vel() * 0.95, role: 'approach' });

  // occasional rhythmic push: a short ghost note on the "and" of the last beat
  if (rng() < 0.18 && beats >= 4) {
    notes.push({ beat: lastBeat + 0.5, midi: clampRange(approachTarget), duration: 0.4, velocity: 0.45, role: 'push' });
  }
  return notes;
}

function thirdName(chord: Chord): string {
  return chord.quality.intervals.find((i) => i === '3' || i === 'b3' || i === '4' || i === '2') ?? '5';
}
function fifthName(chord: Chord): string {
  return chord.quality.intervals.find((i) => i === '5' || i === 'b5' || i === '#5') ?? 'R';
}

function nearestDirectional(pc: number, from: number, dir: number): number {
  // nearest instance of pc in the preferred direction, else the other direction
  for (let d = 1; d <= 12; d++) {
    const m = from + dir * d;
    if (((m % 12) + 12) % 12 === pc && m >= BASS_LOW && m <= BASS_HIGH) return m;
  }
  return clampRange(nearest(pc, from));
}

function stepFrom(from: number, scale: number[], dir: number, _rng: Rng): number {
  for (let d = 1; d <= 3; d++) {
    const m = from + dir * d;
    if (scale.includes(((m % 12) + 12) % 12)) return clampRange(m);
  }
  return clampRange(from + dir * 2);
}

/** Chromatic below/above, dominant (fifth above), or scale step into a target note. */
export function approachTone(target: number, rng: Rng, from: number): number {
  const kind = weighted(rng, [
    { value: 'chromBelow', weight: 4 },
    { value: 'chromAbove', weight: 3 },
    { value: 'dominant', weight: 3 },
    { value: 'stepBelow', weight: 2 },
  ]);
  let m: number;
  switch (kind) {
    case 'chromBelow':
      m = target - 1;
      break;
    case 'chromAbove':
      m = target + 1;
      break;
    case 'dominant':
      m = target + 7 > BASS_HIGH ? target - 5 : from > target ? target + 7 : target - 5;
      break;
    default:
      m = target - 2;
  }
  return clampRange(m);
}

/** Generate a full line for a sequence of slots (a chorus). */
export function walkingLine(slots: BassSlot[], rng: Rng, feel: BassFeel = 'walking'): BassNote[][] {
  const out: BassNote[][] = [];
  let prev: number | undefined;
  slots.forEach((slot, i) => {
    const notes = bassLineForSlot(slot, slots[i + 1] ?? slots[0], prev, rng, feel);
    prev = notes[notes.length - 1]?.midi;
    out.push(notes);
  });
  return out;
}
