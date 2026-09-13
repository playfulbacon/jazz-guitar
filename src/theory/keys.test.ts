import { describe, it, expect } from 'vitest';
import { parseKey, keyName, transposeKey, romanNumeral, analyzeProgression, keySignature, normalizeKey } from './keys';
import { parseChord } from './chords';
import { parseNote } from './notes';

const rn = (symbol: string, key: string) => romanNumeral(parseChord(symbol), parseKey(key)).text;

describe('keys', () => {
  it('parses keys', () => {
    expect(parseKey('Gm')).toEqual({ tonic: parseNote('G'), mode: 'minor' });
    expect(parseKey('Bb').mode).toBe('major');
    expect(keyName(parseKey('F#m'))).toBe('F#m');
  });

  it('knows key signatures', () => {
    expect(keySignature(parseKey('C'))).toBe(0);
    expect(keySignature(parseKey('Bb'))).toBe(-2);
    expect(keySignature(parseKey('E'))).toBe(4);
    expect(keySignature(parseKey('Gm'))).toBe(-2);
    expect(keySignature(parseKey('F#m'))).toBe(3);
    expect(keySignature(parseKey('C#'))).toBe(7);
  });

  it('normalizes absurd keys', () => {
    expect(keyName(normalizeKey(parseKey('C#')))).toBe('Db');
    expect(keyName(normalizeKey(parseKey('F#')))).toBe('Gb');
    expect(keyName(normalizeKey(parseKey('D#m')))).toBe('Ebm');
    expect(keyName(normalizeKey(parseKey('Gbm')))).toBe('F#m');
    expect(keyName(normalizeKey(parseKey('Cb')))).toBe('B');
    expect(keyName(normalizeKey(parseKey('Bb')))).toBe('Bb');
  });

  it('transposes keys to conventional spellings', () => {
    expect(keyName(transposeKey(parseKey('C'), 1).key)).toBe('Db');
    expect(keyName(transposeKey(parseKey('C'), 6).key)).toBe('Gb');
    expect(keyName(transposeKey(parseKey('F'), 6).key)).toBe('B');
    expect(keyName(transposeKey(parseKey('Gm'), 11).key)).toBe('F#m');
    expect(keyName(transposeKey(parseKey('Gm'), 1).key)).toBe('G#m');
    expect(keyName(transposeKey(parseKey('Eb'), 2).key)).toBe('F');
    expect(keyName(transposeKey(parseKey('Bb'), 2).key)).toBe('C');
    expect(keyName(transposeKey(parseKey('Am'), 3).key)).toBe('Cm');
    expect(keyName(transposeKey(parseKey('Am'), 6).key)).toBe('Ebm');
  });

  it('produces roman numerals relative to the parallel major', () => {
    expect(rn('Dm7', 'C')).toBe('ii7');
    expect(rn('G7', 'C')).toBe('V7');
    expect(rn('Cmaj7', 'C')).toBe('Imaj7');
    expect(rn('Bm7b5', 'C')).toBe('viiø7');
    expect(rn('Ebmaj7', 'Gm')).toBe('bVImaj7');
    expect(rn('F7', 'Gm')).toBe('bVII7');
    expect(rn('Gm6', 'Gm')).toBe('i6');
    expect(rn('Am7b5', 'Gm')).toBe('iiø7');
    expect(rn('D7', 'Gm')).toBe('V7');
    expect(rn('Bdim7', 'F')).toBe('#iv°7');
    expect(rn('Abm7', 'C')).toBe('bvi7');
    expect(rn('Db7', 'C')).toBe('bII7');
    expect(rn('Ebdim7', 'C')).toBe('biii°7');
  });

  it('detects major and minor ii–V–Is', () => {
    const chords = ['Cm7', 'F7', 'Bbmaj7', 'Ebmaj7', 'Am7b5', 'D7', 'Gm6'].map(parseChord);
    const { cadences } = analyzeProgression(chords, parseKey('Gm'));
    expect(cadences.map((c) => [c.type, c.start, c.end])).toEqual([
      ['major251', 0, 2],
      ['minor251', 4, 6],
    ]);
    expect(cadences[0].label).toContain('of bIII');
    expect(cadences[1].label).toBe('minor ii–V–i');
  });

  it('collapses repeated chords when detecting cadences', () => {
    const chords = ['Dm7', 'Dm7', 'G7', 'G7', 'Cmaj7', 'Cmaj7'].map(parseChord);
    const { cadences } = analyzeProgression(chords, parseKey('C'));
    expect(cadences).toHaveLength(1);
    expect(cadences[0]).toMatchObject({ type: 'major251', start: 0, end: 5 });
  });

  it('flags secondary dominants', () => {
    const chords = ['C6', 'E7', 'Am7', 'D7', 'G7', 'Cmaj7'].map(parseChord);
    const { chords: analyzed, cadences } = analyzeProgression(chords, parseKey('C'));
    expect(analyzed[1].functionLabel).toBe('V7/vi');
    expect(analyzed[3].functionLabel).toBe('V7/V');
    expect(analyzed[4].functionLabel).toBeUndefined();
    expect(cadences.find((c) => c.type === 'secondary' && c.start === 1)).toBeTruthy();
    expect(cadences.find((c) => c.type === 'V-I' && c.start === 4)).toBeTruthy();
  });

  it('detects an unresolved ii–V', () => {
    const chords = ['Dm7', 'G7', 'Em7', 'A7'].map(parseChord);
    const { cadences } = analyzeProgression(chords, parseKey('C'));
    expect(cadences[0]).toMatchObject({ type: 'ii-V', start: 0, end: 1, target: 'C' });
    expect(cadences[1]).toMatchObject({ type: 'ii-V', start: 2, end: 3, target: 'D' });
  });
});
