/**
 * Rhythm vocab for the comper and the drummer. Offsets are in beats from the start of a
 * slot or bar; a fractional .5 marks an upbeat that is swung when the style swings.
 */
import type { Style } from '../theory/tune';
import type { DrumHit } from './instruments';
import { type Rng, weighted } from '../theory/random';

export interface CompHit {
  /** beats from the start of the slot */
  at: number;
  /** duration in beats */
  dur: number;
  /** accent multiplier */
  accent?: number;
  /** when true and the slot is the last in its bar, play the NEXT chord (anticipation) */
  anticipate?: boolean;
}

export interface CompPattern {
  id: string;
  /** slot length this pattern is written for */
  beats: number;
  hits: CompHit[];
  weight: number;
}

/** Swing comping: a pool of common rhythms for a four-beat slot. */
const SWING_4: CompPattern[] = [
  { id: 'charleston', beats: 4, weight: 5, hits: [{ at: 0, dur: 1.4 }, { at: 1.5, dur: 1.8, accent: 1.05 }] },
  { id: 'and-of-2-and-4', beats: 4, weight: 3, hits: [{ at: 1.5, dur: 1.4 }, { at: 3, dur: 0.8 }] },
  { id: 'two-and-four', beats: 4, weight: 3, hits: [{ at: 1, dur: 0.7, accent: 0.85 }, { at: 3, dur: 0.7, accent: 0.85 }] },
  { id: 'four-to-the-bar', beats: 4, weight: 2, hits: [{ at: 0, dur: 0.45, accent: 0.8 }, { at: 1, dur: 0.45, accent: 0.7 }, { at: 2, dur: 0.45, accent: 0.8 }, { at: 3, dur: 0.45, accent: 0.7 }] },
  { id: 'one-and-of-3', beats: 4, weight: 3, hits: [{ at: 0, dur: 2.3 }, { at: 2.5, dur: 1.4, accent: 1.05 }] },
  { id: 'and-of-1', beats: 4, weight: 2, hits: [{ at: 0.5, dur: 2.5, accent: 1.05 }] },
  { id: 'and-of-2-long', beats: 4, weight: 2, hits: [{ at: 1.5, dur: 2.4, accent: 1.05 }] },
  { id: 'charleston-anticipate', beats: 4, weight: 4, hits: [{ at: 0, dur: 1.3 }, { at: 1.5, dur: 1.6 }, { at: 3.5, dur: 0.5, accent: 1.1, anticipate: true }] },
  { id: 'two-and-anticipate', beats: 4, weight: 3, hits: [{ at: 1, dur: 0.8, accent: 0.85 }, { at: 2.5, dur: 0.9 }, { at: 3.5, dur: 0.5, accent: 1.1, anticipate: true }] },
  { id: 'rest-then-4', beats: 4, weight: 1, hits: [{ at: 3, dur: 0.9, accent: 0.9 }] },
];

const SWING_2: CompPattern[] = [
  { id: 'one', beats: 2, weight: 4, hits: [{ at: 0, dur: 1.4 }] },
  { id: 'and-of-1', beats: 2, weight: 3, hits: [{ at: 0.5, dur: 1.3, accent: 1.05 }] },
  { id: 'one-and-two', beats: 2, weight: 3, hits: [{ at: 0, dur: 0.6, accent: 0.85 }, { at: 1, dur: 0.6, accent: 0.85 }] },
  { id: 'and-of-2-anticipate', beats: 2, weight: 3, hits: [{ at: 0, dur: 1.2 }, { at: 1.5, dur: 0.5, accent: 1.1, anticipate: true }] },
  { id: 'two', beats: 2, weight: 2, hits: [{ at: 1, dur: 0.9, accent: 0.9 }] },
];

const BOSSA_4: CompPattern[] = [
  { id: 'bossa-a', beats: 4, weight: 3, hits: [{ at: 0.5, dur: 0.9 }, { at: 1.5, dur: 0.4, accent: 0.8 }, { at: 2.5, dur: 0.9 }, { at: 3.5, dur: 0.4, accent: 0.8, anticipate: true }] },
  { id: 'bossa-b', beats: 4, weight: 3, hits: [{ at: 0.5, dur: 0.9 }, { at: 2, dur: 0.5, accent: 0.8 }, { at: 3, dur: 0.9 }] },
  { id: 'bossa-c', beats: 4, weight: 2, hits: [{ at: 0, dur: 0.4, accent: 0.8 }, { at: 1.5, dur: 0.9 }, { at: 3, dur: 0.4, accent: 0.8 }, { at: 3.5, dur: 0.5, anticipate: true }] },
];
const BOSSA_2: CompPattern[] = [
  { id: 'bossa-2a', beats: 2, weight: 3, hits: [{ at: 0.5, dur: 0.9 }, { at: 1.5, dur: 0.4, accent: 0.8, anticipate: true }] },
  { id: 'bossa-2b', beats: 2, weight: 2, hits: [{ at: 0, dur: 0.4, accent: 0.8 }, { at: 1, dur: 0.9 }] },
];

const BALLAD_4: CompPattern[] = [
  { id: 'whole', beats: 4, weight: 3, hits: [{ at: 0, dur: 3.8 }] },
  { id: 'halves', beats: 4, weight: 3, hits: [{ at: 0, dur: 1.9 }, { at: 2, dur: 1.9, accent: 0.9 }] },
  { id: 'one-and-of-2', beats: 4, weight: 2, hits: [{ at: 0, dur: 1.4 }, { at: 1.5, dur: 2.4, accent: 0.9 }] },
];
const BALLAD_2: CompPattern[] = [
  { id: 'half', beats: 2, weight: 3, hits: [{ at: 0, dur: 1.9 }] },
  { id: 'and', beats: 2, weight: 1, hits: [{ at: 0.5, dur: 1.4 }] },
];

export function compPatternPool(style: Style, beats: number): CompPattern[] {
  const four = style === 'bossa' ? BOSSA_4 : style === 'ballad' ? BALLAD_4 : SWING_4;
  const two = style === 'bossa' ? BOSSA_2 : style === 'ballad' ? BALLAD_2 : SWING_2;
  if (beats >= 4) return four;
  if (beats >= 2) return two;
  return [{ id: 'single', beats: 1, weight: 1, hits: [{ at: 0, dur: 0.8 }] }];
}

/** Pick a pattern for a slot, avoiding the previous one when the pool allows it. */
export function chooseCompPattern(style: Style, beats: number, rng: Rng, previousId?: string): CompPattern {
  const pool = compPatternPool(style, beats);
  const filtered = pool.length > 1 ? pool.filter((p) => p.id !== previousId) : pool;
  const chosen = weighted(rng, filtered.map((p) => ({ value: p, weight: p.weight })));
  // patterns written for 4 beats are truncated for longer/shorter odd slots
  return chosen.beats === beats ? chosen : { ...chosen, hits: chosen.hits.filter((h) => h.at < beats) };
}

export interface DrumEvent {
  at: number;
  hit: DrumHit;
  velocity: number;
}

export interface DrumContext {
  /** index of this bar within the current playback (used for two-bar patterns) */
  barIndex: number;
  sectionStart: boolean;
  sectionEnd: boolean;
}

export function drumBar(style: Style, ctx: DrumContext, rng: Rng): DrumEvent[] {
  const ev: DrumEvent[] = [];
  const v = (base: number, spread = 0.1) => base + (rng() - 0.5) * spread;
  if (style === 'swing') {
    // ride: 1, 2, and-of-2, 3, 4, and-of-4 (upbeats are swung by the engine)
    ev.push({ at: 0, hit: ctx.sectionStart ? 'rideBell' : 'ride', velocity: v(ctx.sectionStart ? 0.95 : 0.85) });
    ev.push({ at: 1, hit: 'ride', velocity: v(0.6) });
    ev.push({ at: 1.5, hit: 'ride', velocity: v(0.45) });
    ev.push({ at: 2, hit: 'ride', velocity: v(0.85) });
    ev.push({ at: 3, hit: 'ride', velocity: v(0.6) });
    ev.push({ at: 3.5, hit: 'ride', velocity: v(0.45) });
    // hi-hat on 2 and 4
    ev.push({ at: 1, hit: 'hat', velocity: v(0.55) });
    ev.push({ at: 3, hit: 'hat', velocity: v(0.55) });
    // feathered bass drum
    for (let b = 0; b < 4; b++) ev.push({ at: b, hit: 'kick', velocity: v(0.22, 0.06) });
    // snare comping, sparse
    if (ctx.sectionEnd) {
      ev.push({ at: 2.5, hit: 'snare', velocity: v(0.4) });
      ev.push({ at: 3, hit: 'snare', velocity: v(0.5) });
      ev.push({ at: 3.5, hit: 'snare', velocity: v(0.55) });
      ev.push({ at: 3.5, hit: 'kick', velocity: v(0.4) });
    } else {
      const r = rng();
      if (r < 0.22) ev.push({ at: 1.5, hit: 'snare', velocity: v(0.3) });
      else if (r < 0.4) ev.push({ at: 3.5, hit: 'snare', velocity: v(0.32) });
      else if (r < 0.5) ev.push({ at: 2.5, hit: 'snare', velocity: v(0.28) });
    }
  } else if (style === 'bossa') {
    // straight eighths on the hat, bossa kick, two-bar rim clave
    for (let e = 0; e < 8; e++) ev.push({ at: e / 2, hit: e % 2 === 0 ? 'hat' : 'shaker', velocity: v(e % 2 === 0 ? 0.5 : 0.35, 0.08) });
    for (const at of [0, 1.5, 2, 3.5]) ev.push({ at, hit: 'kick', velocity: v(at === 0 || at === 2 ? 0.6 : 0.45) });
    const first = ctx.barIndex % 2 === 0;
    for (const at of first ? [0, 1.5, 3] : [1, 2]) ev.push({ at, hit: 'rim', velocity: v(0.5) });
    if (ctx.sectionEnd) ev.push({ at: 3.5, hit: 'snare', velocity: v(0.3) });
  } else {
    // ballad: brush swish on each beat, light hat on 2 and 4, ride on 1 and 3
    for (let b = 0; b < 4; b++) ev.push({ at: b, hit: 'brush', velocity: v(0.35, 0.06) });
    ev.push({ at: 1, hit: 'hat', velocity: v(0.35) });
    ev.push({ at: 3, hit: 'hat', velocity: v(0.35) });
    ev.push({ at: 0, hit: 'ride', velocity: v(0.4) });
    ev.push({ at: 2, hit: 'ride', velocity: v(0.32) });
    if (ctx.sectionEnd) ev.push({ at: 3.5, hit: 'snare', velocity: v(0.25) });
  }
  return ev;
}

/** Count-in: two bars of stick clicks with an accent on beat one. */
export function countInBar(): DrumEvent[] {
  return [
    { at: 0, hit: 'clickAccent', velocity: 0.9 },
    { at: 1, hit: 'click', velocity: 0.6 },
    { at: 2, hit: 'click', velocity: 0.7 },
    { at: 3, hit: 'click', velocity: 0.6 },
  ];
}

/** Swing ratio for upbeats: heavy at slow tempos, flattening out as the tempo climbs. */
export function swingRatio(style: Style, bpm: number): number {
  if (style === 'bossa') return 0.5;
  if (bpm <= 100) return 0.68;
  if (bpm >= 240) return 0.54;
  return 0.68 - ((bpm - 100) / 140) * 0.14;
}

/** Convert a beat offset (with .5 upbeats) to seconds using the swing ratio. */
export function offsetSeconds(at: number, secondsPerBeat: number, ratio: number): number {
  const whole = Math.floor(at);
  const frac = at - whole;
  const swungFrac = frac === 0 ? 0 : frac === 0.5 ? ratio : frac;
  return (whole + swungFrac) * secondsPerBeat;
}
