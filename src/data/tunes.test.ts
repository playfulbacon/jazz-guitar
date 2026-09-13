import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { type Tune, chartBars, expandForm, transposeTune, chartChords } from '../theory/tune';
import { parseKey, analyzeProgression } from '../theory/keys';
import { parseChord } from '../theory/chords';

const dir = join(__dirname, 'tunes');
const tunes: Tune[] = readdirSync(dir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));

describe('tune data', () => {
  it('has ten tunes with unique ids matching file names', () => {
    expect(tunes.length).toBe(10);
    const ids = new Set(tunes.map((t) => t.id));
    expect(ids.size).toBe(10);
    for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
      const tune = JSON.parse(readFileSync(join(dir, f), 'utf8')) as Tune;
      expect(f).toBe(tune.id + '.json');
    }
  });

  it('every chord parses, every bar has four beats, and keys are valid', () => {
    for (const tune of tunes) {
      expect(() => parseKey(tune.defaultKey), tune.id).not.toThrow();
      expect(['swing', 'bossa', 'ballad']).toContain(tune.style);
      expect(tune.defaultTempo).toBeGreaterThan(40);
      for (const bar of chartBars(tune)) {
        expect(bar.totalBeats, `${tune.id} bar ${bar.id}`).toBe(4);
        for (const c of bar.chords) expect(() => parseChord(c.symbol), `${tune.id}: ${c.symbol}`).not.toThrow();
      }
    }
  });

  it('forms unroll to sensible lengths', () => {
    const lengths = Object.fromEntries(tunes.map((t) => [t.id, expandForm(t).length]));
    expect(lengths['f-blues']).toBe(12);
    expect(lengths['blue-bossa']).toBe(16);
    expect(lengths['summertime']).toBe(16);
    expect(lengths['autumn-leaves']).toBe(32);
    expect(lengths['satin-doll']).toBe(32);
    expect(lengths['take-the-a-train']).toBe(32);
    expect(lengths['paper-moon']).toBe(32);
    expect(lengths['fly-me-to-the-moon']).toBe(32);
    expect(lengths['all-of-me']).toBe(32);
    expect(lengths['there-will-never-be-another-you']).toBe(32);
  });

  it('transposes to every key without producing unparseable symbols', () => {
    for (const tune of tunes) {
      for (let s = 0; s < 12; s++) {
        const t = transposeTune(tune, s);
        expect(() => chartBars(t), `${tune.id} +${s}`).not.toThrow();
        expect(() => parseKey(t.defaultKey)).not.toThrow();
        expect(expandForm(t).length).toBe(expandForm(tune).length);
      }
    }
  });

  it('analysis finds ii–V–Is in the tunes that teach them', () => {
    const leaves = tunes.find((t) => t.id === 'autumn-leaves')!;
    const { cadences } = analyzeProgression(chartChords(leaves).map((c) => c.chord), parseKey(leaves.defaultKey));
    expect(cadences.filter((c) => c.type === 'major251').length).toBeGreaterThanOrEqual(2);
    expect(cadences.filter((c) => c.type === 'minor251').length).toBeGreaterThanOrEqual(2);
  });

  it('learning metadata is complete', () => {
    for (const tune of tunes) {
      expect(tune.learning?.why, tune.id).toBeTruthy();
      expect(tune.learning?.milestones?.length, tune.id).toBeGreaterThanOrEqual(3);
      expect(tune.analysis?.notes, tune.id).toBeTruthy();
    }
  });
});
