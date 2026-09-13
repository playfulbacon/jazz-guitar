import { describe, it, expect } from 'vitest';
import { bassLineForSlot, walkingLine, BASS_LOW, BASS_HIGH, type BassSlot } from './bass';
import { parseChord } from './chords';
import { seededRng } from './random';
import { pitchClass } from './notes';

const slot = (symbol: string, beats = 4): BassSlot => ({ chord: parseChord(symbol), beats });

describe('walking bass', () => {
  it('always plays the root on beat one and stays in range', () => {
    const rng = seededRng(1);
    for (let i = 0; i < 200; i++) {
      const notes = bassLineForSlot(slot('Dm7'), slot('G7'), 40 + (i % 12), rng);
      expect(notes[0].beat).toBe(0);
      expect(notes[0].midi % 12).toBe(pitchClass(parseChord('Dm7').root));
      for (const n of notes) {
        expect(n.midi).toBeGreaterThanOrEqual(BASS_LOW);
        expect(n.midi).toBeLessThanOrEqual(BASS_HIGH);
      }
    }
  });

  it('plays four notes per bar (plus optional push) and ends with an approach tone', () => {
    const rng = seededRng(7);
    for (let i = 0; i < 100; i++) {
      const notes = bassLineForSlot(slot('Cm7'), slot('F7'), 43, rng);
      const onBeats = notes.filter((n) => Number.isInteger(n.beat));
      expect(onBeats.map((n) => n.beat)).toEqual([0, 1, 2, 3]);
      const approach = onBeats[3];
      expect(approach.role).toBe('approach');
      const targetPc = pitchClass(parseChord('F7').root);
      const dist = ((approach.midi - targetPc) % 12 + 12) % 12;
      // chromatic below/above, whole step below, or a fifth away
      expect([1, 11, 10, 7, 5]).toContain(dist);
    }
  });

  it('handles two-beat slots with root then approach or chord tone', () => {
    const rng = seededRng(3);
    const notes = bassLineForSlot(slot('Dm7', 2), slot('G7', 2), 38, rng);
    expect(notes.length).toBe(2);
    expect(notes[0].role).toBe('root');
    expect(notes[1].role).toBe('approach');
  });

  it('uses slash bass notes', () => {
    const rng = seededRng(5);
    const notes = bassLineForSlot(slot('C/E'), slot('F6'), 40, rng);
    expect(notes[0].midi % 12).toBe(4);
  });

  it('two feel plays half notes', () => {
    const rng = seededRng(9);
    const notes = bassLineForSlot(slot('Fmaj7'), slot('Bb7'), 41, rng, 'two');
    expect(notes.map((n) => n.beat)).toEqual([0, 2]);
    expect(notes[0].duration).toBe(2);
  });

  it('is deterministic for a given seed', () => {
    const slots = ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7'].map((s) => slot(s));
    const a = walkingLine(slots, seededRng(42));
    const b = walkingLine(slots, seededRng(42));
    expect(a).toEqual(b);
    expect(a).toHaveLength(4);
  });
});
