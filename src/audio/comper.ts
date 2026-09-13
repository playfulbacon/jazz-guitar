/**
 * Voicing selection for the comp instrument: picks grips at the requested complexity level,
 * keeps the hand in one area of the neck, and rotates between available shapes instead of
 * hammering the same one.
 */
import voicingData from '../data/voicings.json';
import { type Chord, QUALITIES } from '../theory/chords';
import { type VoicingTemplate, type VoicingLevel, type RealizedVoicing, realizeVoicing, voicingMidiNotes } from '../theory/voicings';
import { type Rng } from '../theory/random';

export const VOICING_TEMPLATES = voicingData.voicings as VoicingTemplate[];

const LEVEL_RANK: Record<VoicingLevel, number> = { shell: 0, drop2: 1, extended: 2 };

/** Templates usable for a chord at a level, following the quality's fallback chain. */
export function templatesFor(chord: Chord, level: VoicingLevel): VoicingTemplate[] {
  const maxRank = LEVEL_RANK[level];
  const chain = chord.quality.voicingFallback;
  for (const qualityId of chain) {
    const q = QUALITIES[qualityId];
    if (!q) continue;
    const candidates = VOICING_TEMPLATES.filter((t) => t.quality === qualityId && LEVEL_RANK[t.level] <= maxRank);
    if (!candidates.length) continue;
    // prefer the richest available tier at this level, but keep simpler ones as alternates
    const best = Math.max(...candidates.map((t) => LEVEL_RANK[t.level]));
    const preferred = candidates.filter((t) => LEVEL_RANK[t.level] === best);
    const others = candidates.filter((t) => LEVEL_RANK[t.level] !== best);
    return [...preferred, ...others];
  }
  // last resort: shells of the nearest family
  const family = chord.quality.family;
  const fallbackQuality = family === 'minor' ? 'm7' : family === 'dominant' || family === 'sus' ? '7' : family === 'halfdim' ? 'm7b5' : family === 'dim' ? 'dim7' : 'maj7';
  return VOICING_TEMPLATES.filter((t) => t.quality === fallbackQuality && t.level === 'shell');
}

export interface ComperState {
  lastTemplateId?: string;
  lastBaseFret: number;
  lastChordKey?: string;
}

export function initialComperState(): ComperState {
  return { lastBaseFret: 5 };
}

/**
 * Choose and realize a voicing for a chord. Scores candidates by distance from the previous
 * grip, penalizes repeating the same grip on the same chord, and adds a little randomness.
 */
export function chooseVoicing(chord: Chord, level: VoicingLevel, state: ComperState, rng: Rng): RealizedVoicing {
  const templates = templatesFor(chord, level);
  const chordKey = chord.symbol;
  let best: { v: RealizedVoicing; score: number } | null = null;
  for (const t of templates) {
    let v: RealizedVoicing;
    try {
      v = realizeVoicing(t, chord.root, state.lastBaseFret);
    } catch {
      continue;
    }
    const midis = voicingMidiNotes(v);
    const low = Math.min(...midis);
    const high = Math.max(...midis);
    let score = Math.abs(v.baseFret - state.lastBaseFret) * 1.0;
    if (v.baseFret > 12) score += (v.baseFret - 12) * 1.5;
    if (v.baseFret < 1) score += 2;
    if (low < 43) score += (43 - low) * 0.5; // keep comping out of the bass register
    if (high > 79) score += (high - 79) * 0.5;
    if (t.id === state.lastTemplateId && chordKey === state.lastChordKey) score += 4;
    const preferredTier = templates[0].level;
    if (t.level !== preferredTier) score += 1.5;
    score += rng() * 3;
    if (!best || score < best.score) best = { v, score };
  }
  if (!best) throw new Error(`No voicing for ${chord.symbol}`);
  state.lastTemplateId = best.v.template.id;
  state.lastBaseFret = best.v.baseFret;
  state.lastChordKey = chordKey;
  return best.v;
}
