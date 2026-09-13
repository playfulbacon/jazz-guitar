import { describe, it, expect } from 'vitest';
import { parseNote, noteName, transposeNote, interval, intervalBetween, pitchClass, simplifyNote, midi } from './notes';

describe('notes', () => {
  it('parses and prints notes', () => {
    expect(noteName(parseNote('Bb'))).toBe('Bb');
    expect(noteName(parseNote('F#'))).toBe('F#');
    expect(noteName(parseNote('Cbb'))).toBe('Cbb');
    expect(noteName(parseNote('e'))).toBe('E');
    expect(() => parseNote('H')).toThrow();
  });

  it('computes pitch classes', () => {
    expect(pitchClass(parseNote('C'))).toBe(0);
    expect(pitchClass(parseNote('Cb'))).toBe(11);
    expect(pitchClass(parseNote('B#'))).toBe(0);
    expect(pitchClass(parseNote('Ebb'))).toBe(2);
  });

  it('transposes with correct spelling', () => {
    // Bb up a whole step is C, not B#
    expect(noteName(transposeNote(parseNote('Bb'), interval('2')))).toBe('C');
    expect(noteName(transposeNote(parseNote('C'), interval('3')))).toBe('E');
    expect(noteName(transposeNote(parseNote('C'), interval('b3')))).toBe('Eb');
    expect(noteName(transposeNote(parseNote('E'), interval('3')))).toBe('G#');
    expect(noteName(transposeNote(parseNote('Gb'), interval('b7')))).toBe('Fb');
    expect(noteName(transposeNote(parseNote('F#'), interval('#5')))).toBe('C##');
    expect(noteName(transposeNote(parseNote('A'), interval('bb7')))).toBe('Gb');
    expect(noteName(transposeNote(parseNote('Bb'), interval('b9')))).toBe('Cb');
  });

  it('computes intervals between notes', () => {
    expect(intervalBetween(parseNote('C'), parseNote('G'))).toEqual({ steps: 4, semitones: 7 });
    expect(intervalBetween(parseNote('Bb'), parseNote('C'))).toEqual({ steps: 1, semitones: 2 });
    expect(intervalBetween(parseNote('G'), parseNote('Bb'))).toEqual({ steps: 2, semitones: 3 });
    expect(intervalBetween(parseNote('C'), parseNote('Cb'))).toEqual({ steps: 0, semitones: -1 });
  });

  it('round-trips transposition through intervalBetween', () => {
    const a = parseNote('Eb');
    const b = parseNote('F#');
    expect(noteName(transposeNote(a, intervalBetween(a, b)))).toBe('F#');
  });

  it('simplifies awkward spellings', () => {
    expect(noteName(simplifyNote(parseNote('B#')))).toBe('C');
    expect(noteName(simplifyNote(parseNote('Fb')))).toBe('E');
    expect(noteName(simplifyNote(parseNote('Bbb')))).toBe('A');
    expect(noteName(simplifyNote(parseNote('C##')))).toBe('D');
    expect(noteName(simplifyNote(parseNote('Ab')))).toBe('Ab');
    expect(noteName(simplifyNote(parseNote('G#')))).toBe('G#');
  });

  it('computes midi numbers', () => {
    expect(midi(parseNote('C'), 4)).toBe(60);
    expect(midi(parseNote('A'), 4)).toBe(69);
    expect(midi(parseNote('E'), 2)).toBe(40);
  });
});
