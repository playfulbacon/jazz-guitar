import { describe, it, expect } from 'vitest';
import data from '../data/voicings.json';
import { realizeByName, type VoicingTemplate, TUNING_MIDI } from './voicings';
import { parseChord, chordTones } from './chords';
import { pitchClass, CHROMATIC_ROOTS, parseNote } from './notes';
import { QUALITIES } from './chords';

const voicings = data.voicings as VoicingTemplate[];
const byId = (id: string) => voicings.find((v) => v.id === id)!;

describe('voicing templates', () => {
  it('reference shapes land on the expected frets', () => {
    // Cmaj7 shell, 6th string root: 8 x 9 9 x x
    expect(realizeByName(byId('maj7-shell-6'), 'C').frets).toEqual([8, null, 9, 9, null, null]);
    // G7 shell 6th string: 3 x 3 4 x x
    expect(realizeByName(byId('7-shell-6'), 'G').frets).toEqual([3, null, 3, 4, null, null]);
    // Dm7 shell 5th string: x 5 x 5 6 x
    expect(realizeByName(byId('m7-shell-5'), 'D').frets).toEqual([null, 5, null, 5, 6, null]);
    // Cmaj7 drop 2 strings 4-1 root position: x x 10 12 12 12
    expect(realizeByName(byId('maj7-drop2-4-root'), 'C', 10).frets).toEqual([null, null, 10, 12, 12, 12]);
    // Cmaj7 drop 2 4-1 1st inversion: x x 2 4 1 3
    expect(realizeByName(byId('maj7-drop2-4-1st'), 'C', 1).frets).toEqual([null, null, 2, 4, 1, 3]);
    // C9: x 3 2 3 3 x
    expect(realizeByName(byId('9-ext-5'), 'C', 3).frets).toEqual([null, 3, 2, 3, 3, null]);
    // C13: 8 x 8 9 10 x
    expect(realizeByName(byId('13-ext-6'), 'C').frets).toEqual([8, null, 8, 9, 10, null]);
    // Bdim7 5th string: x 2 3 1 3 x
    expect(realizeByName(byId('dim7-shell-5'), 'B', 2).frets).toEqual([null, 2, 3, 1, 3, null]);
    // Am7b5 shell+b5 6th string: 5 x 5 5 4 x
    expect(realizeByName(byId('m7b5-shell-6'), 'A').frets).toEqual([5, null, 5, 5, 4, null]);
  });

  it('every template realizes for all twelve roots with a playable span and correct pitch classes', () => {
    for (const v of voicings) {
      expect(QUALITIES[v.quality], `quality ${v.quality} of ${v.id}`).toBeTruthy();
      for (const rootName of CHROMATIC_ROOTS) {
        const r = realizeByName(v, rootName);
        expect(r.span, `${v.id} at ${rootName}`).toBeLessThanOrEqual(5);
        const chord = parseChord(rootName + QUALITIES[v.quality].display);
        const tonePcs = new Set(chordTones(chord).map((t) => pitchClass(t.note)));
        r.midi.forEach((m, s) => {
          if (m === null) return;
          expect(tonePcs.has(m % 12), `${v.id} string ${s} at ${rootName}`).toBe(true);
          expect(m).toBe(TUNING_MIDI[s] + (r.frets[s] as number));
        });
      }
    }
  });

  it('chooses the shape nearest the preferred fret', () => {
    const low = realizeByName(byId('maj7-shell-6'), 'E', 1);
    const high = realizeByName(byId('maj7-shell-6'), 'E', 11);
    expect(low.frets[0]).toBe(0);
    expect(high.frets[0]).toBe(12);
    expect(realizeByName(byId('7-shell-6'), 'F', 5).frets[0]).toBe(1);
    expect(parseNote('F').letter).toBe('F');
  });

  it('has shells and drop-2 shapes for the six core qualities', () => {
    for (const q of ['maj7', '6', 'm7', '7', 'm7b5', 'dim7']) {
      expect(voicings.filter((v) => v.quality === q && v.level === 'shell').length).toBeGreaterThanOrEqual(2);
      expect(voicings.filter((v) => v.quality === q && v.level === 'drop2').length).toBeGreaterThanOrEqual(2);
    }
  });
});
