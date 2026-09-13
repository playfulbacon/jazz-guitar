import { describe, it, expect } from 'vitest';
import { parseChord, chordTones, displaySymbol, chordSymbol, QUALITIES } from './chords';
import { noteName } from './notes';

const spell = (symbol: string) => chordTones(parseChord(symbol)).map((t) => noteName(t.note)).join(' ');

describe('chords', () => {
  it('parses a variety of symbols', () => {
    expect(parseChord('Cmaj7').quality.id).toBe('maj7');
    expect(parseChord('CΔ7').quality.id).toBe('maj7');
    expect(parseChord('Am7b5').quality.id).toBe('m7b5');
    expect(parseChord('Aø7').quality.id).toBe('m7b5');
    expect(parseChord('G7alt').quality.id).toBe('7alt');
    expect(parseChord('Bbdim7').quality.id).toBe('dim7');
    expect(parseChord('F#-7').quality.id).toBe('m7');
    expect(parseChord('C6/9').quality.id).toBe('69');
    expect(parseChord('C').quality.id).toBe('maj');
    expect(parseChord('Dm(maj7)').quality.id).toBe('mMaj7');
    expect(parseChord('G7sus').quality.id).toBe('7sus4');
    expect(() => parseChord('Cwhatever')).toThrow();
  });

  it('parses slash chords', () => {
    const c = parseChord('C/E');
    expect(noteName(c.root)).toBe('C');
    expect(noteName(c.bass!)).toBe('E');
    expect(chordSymbol(c.root, c.quality, c.bass)).toBe('C/E');
  });

  it('spells chord tones correctly', () => {
    expect(spell('Cmaj7')).toBe('C E G B');
    expect(spell('Bbmaj7')).toBe('Bb D F A');
    expect(spell('F#m7b5')).toBe('F# A C E');
    expect(spell('Ebm7')).toBe('Eb Gb Bb Db');
    expect(spell('Bdim7')).toBe('B D F Ab');
    expect(spell('G7b9')).toBe('G B D F Ab');
    expect(spell('E7#9')).toBe('E G# B D F##');
    expect(spell('Gm6')).toBe('G Bb D E');
    expect(spell('C7alt')).toBe('C E Bb Db D# G#');
    expect(spell('Dbmaj7#11')).toBe('Db F Ab C Eb G');
  });

  it('prints display symbols with unicode accidentals', () => {
    expect(displaySymbol(parseChord('Bbm7b5'))).toBe('B♭m7♭5');
    expect(displaySymbol(parseChord('F#7#9'))).toBe('F♯7♯9');
    expect(displaySymbol(parseChord('C/E'))).toBe('C/E');
  });

  it('every quality has a root and a voicing fallback chain that starts with itself', () => {
    for (const q of Object.values(QUALITIES)) {
      expect(q.intervals[0]).toBe('R');
      expect(q.voicingFallback[0]).toBe(q.id);
    }
  });
});
