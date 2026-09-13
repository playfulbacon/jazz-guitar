import { describe, it, expect } from 'vitest';
import { chartBars, expandForm, transposeTune, transposeSymbol, type Tune } from './tune';
import { intervalBetween, parseNote } from './notes';

const tune: Tune = {
  id: 'test',
  title: 'Test',
  defaultKey: 'Gm',
  form: 'AAB',
  style: 'swing',
  defaultTempo: 120,
  sections: [
    {
      label: 'A',
      repeat: 2,
      bars: [
        { chords: [{ symbol: 'Cm7', beats: 4 }] },
        { chords: [{ symbol: 'F7', beats: 4 }] },
        { chords: [{ symbol: 'Bbmaj7', beats: 4 }], ending: 1 },
        { chords: [{ symbol: 'Ebmaj7', beats: 2 }, { symbol: 'D7', beats: 2 }], ending: 2 },
      ],
    },
    { label: 'B', bars: [{ chords: [{ symbol: 'Gm6', beats: 4 }] }] },
  ],
};

describe('tune form', () => {
  it('lays out chart bars with repeat and ending markers', () => {
    const bars = chartBars(tune);
    expect(bars).toHaveLength(5);
    expect(bars[0].repeatOpen).toBe(true);
    expect(bars[2].repeatClose).toBe(true);
    expect(bars[2].ending).toBe(1);
    expect(bars[3].ending).toBe(2);
    expect(bars[4].isSectionStart).toBe(true);
  });

  it('unrolls repeats with first and second endings', () => {
    const play = expandForm(tune);
    expect(play.map((b) => b.chartId)).toEqual([0, 1, 2, 0, 1, 3, 4]);
    expect(play[2].sectionEnd).toBe(true);
    expect(play[5].sectionEnd).toBe(true);
    expect(play[6].formEnd).toBe(true);
    expect(play[5].chords.map((c) => c.symbol)).toEqual(['Ebmaj7', 'D7']);
  });

  it('transposes tunes with sensible key spelling', () => {
    const up2 = transposeTune(tune, 2);
    expect(up2.defaultKey).toBe('Am');
    expect(up2.sections[0].bars.map((b) => b.chords.map((c) => c.symbol).join(' '))).toEqual(['Dm7', 'G7', 'Cmaj7', 'Fmaj7 E7']);
    const down1 = transposeTune(tune, 11);
    expect(down1.defaultKey).toBe('F#m');
    expect(down1.sections[0].bars[0].chords[0].symbol).toBe('Bm7');
    expect(down1.sections[0].bars[2].chords[0].symbol).toBe('Amaj7');
    expect(down1.sections[0].bars[3].chords[0].symbol).toBe('Dmaj7');
    const up6 = transposeTune(tune, 6);
    expect(up6.defaultKey).toBe('C#m');
    expect(up6.sections[0].bars[1].chords[0].symbol).toBe('B7');
    expect(up6.sections[0].bars[3].chords.map((c) => c.symbol)).toEqual(['Amaj7', 'G#7']);
  });

  it('returns the same tune for a zero transposition', () => {
    expect(transposeTune(tune, 0)).toBe(tune);
    expect(transposeTune(tune, 12)).toBe(tune);
  });

  it('avoids double accidentals in transposed symbols', () => {
    const iv = intervalBetween(parseNote('C'), parseNote('Db'));
    expect(transposeSymbol('Ab7', iv)).toBe('A7');
    expect(transposeSymbol('Ebdim7', iv)).toBe('Edim7');
    expect(transposeSymbol('C/E', iv)).toBe('Db/F');
  });
});
