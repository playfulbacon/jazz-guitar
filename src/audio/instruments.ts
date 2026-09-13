/**
 * Synthesized trio instruments built with Tone.js.
 *
 * v1 uses synthesis only (a warm FM pluck for guitar, an FM electric-piano style comp,
 * a two-layer mono bass, and a small synthesized brush/ride kit) so the app ships with zero
 * sample payload and no licensing concerns. Each instrument is wrapped in a channel strip
 * (volume / mute / solo) and the interface is narrow enough that sampled instruments can
 * be dropped in later (see CREDITS.md).
 */
import type * as ToneTypes from 'tone';
import { midiToFrequency } from '../theory/notes';

type ToneModule = typeof ToneTypes;
// Tone.js is loaded on first use (a user gesture) so the initial page payload stays small.
let Tone: ToneModule;

export type InstrumentId = 'comp' | 'bass' | 'drums';
export type CompInstrument = 'guitar' | 'piano';
export type DrumHit = 'ride' | 'rideBell' | 'hat' | 'kick' | 'snare' | 'brush' | 'rim' | 'shaker' | 'click' | 'clickAccent';

export interface Trio {
  strum(midis: number[], time: number, velocity: number, duration: number, instrument: CompInstrument, spreadMs?: number): void;
  bassNote(midi: number, time: number, velocity: number, duration: number): void;
  drum(hit: DrumHit, time: number, velocity: number): void;
  channel(id: InstrumentId): ToneTypes.Channel;
  releaseAll(time?: number): void;
  dispose(): void;
}

let trio: Trio | null = null;
let starting: Promise<Trio> | null = null;

/** Must be called from a user gesture the first time (browser autoplay policy). */
export async function ensureAudio(): Promise<Trio> {
  if (trio) return trio;
  if (!starting) {
    starting = (async () => {
      Tone = await import('tone');
      await Tone.start();
      const ctx = Tone.getContext();
      ctx.lookAhead = 0.05;
      trio = buildTrio();
      return trio;
    })();
  }
  return starting;
}

export function getTrio(): Trio | null {
  return trio;
}

export function audioNow(): number {
  return Tone ? Tone.getContext().currentTime : 0;
}

function buildTrio(): Trio {
  const master = new Tone.Limiter(-1).toDestination();
  const compressor = new Tone.Compressor({ threshold: -18, ratio: 2.5, attack: 0.01, release: 0.2 }).connect(master);
  const reverb = new Tone.Reverb({ decay: 1.6, preDelay: 0.02, wet: 0.16 }).connect(compressor);

  const channels: Record<InstrumentId, ToneTypes.Channel> = {
    comp: new Tone.Channel({ volume: -6 }).connect(reverb),
    bass: new Tone.Channel({ volume: -4 }).connect(compressor),
    drums: new Tone.Channel({ volume: -8 }).connect(reverb),
  };

  // --- Comp guitar: FM pluck through a warm low-pass. ---
  const guitarFilter = new Tone.Filter({ frequency: 2400, type: 'lowpass', rolloff: -12, Q: 0.6 }).connect(channels.comp);
  const guitar = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 16,
    volume: -6,
    options: {
      harmonicity: 2,
      modulationIndex: 2.2,
      oscillator: { type: 'triangle' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.004, decay: 1.4, sustain: 0.08, release: 0.5 },
      modulationEnvelope: { attack: 0.002, decay: 0.25, sustain: 0.05, release: 0.3 },
    },
  }).connect(guitarFilter);

  // --- Comp piano: brighter FM with a faster modulation envelope. ---
  const pianoFilter = new Tone.Filter({ frequency: 5200, type: 'lowpass', rolloff: -12 }).connect(channels.comp);
  const piano = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 16,
    volume: -8,
    options: {
      harmonicity: 3.01,
      modulationIndex: 6,
      oscillator: { type: 'sine' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.003, decay: 1.8, sustain: 0.05, release: 0.8 },
      modulationEnvelope: { attack: 0.001, decay: 0.35, sustain: 0.02, release: 0.4 },
    },
  }).connect(pianoFilter);

  // --- Upright bass: a filtered triangle for the body plus a sine sub. ---
  const bassFilter = new Tone.Filter({ frequency: 900, type: 'lowpass', rolloff: -24, Q: 0.8 }).connect(channels.bass);
  const bassBody = new Tone.MonoSynth({
    volume: -4,
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.008, decay: 0.35, sustain: 0.45, release: 0.25 },
    filter: { type: 'lowpass', Q: 1.2, rolloff: -12 },
    filterEnvelope: { attack: 0.005, decay: 0.22, sustain: 0.15, release: 0.3, baseFrequency: 160, octaves: 2.4 },
  }).connect(bassFilter);
  const bassSub = new Tone.MonoSynth({
    volume: -9,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 0.3, sustain: 0.6, release: 0.2 },
    filter: { type: 'lowpass', Q: 0.5 },
    filterEnvelope: { attack: 0.01, decay: 0.1, sustain: 1, release: 0.2, baseFrequency: 300, octaves: 0 },
  }).connect(channels.bass);
  // fingertip thump on each note
  const bassThump = new Tone.NoiseSynth({ volume: -22, noise: { type: 'brown' }, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } }).connect(bassFilter);

  // --- Drums ---
  const ride = new Tone.MetalSynth({
    volume: -16,
    envelope: { attack: 0.001, decay: 1.1, release: 0.3 },
    harmonicity: 5.1,
    modulationIndex: 18,
    resonance: 3200,
    octaves: 1.1,
  }).connect(channels.drums);
  ride.frequency.value = 320;
  const rideBell = new Tone.MetalSynth({
    volume: -14,
    envelope: { attack: 0.001, decay: 0.7, release: 0.2 },
    harmonicity: 3.3,
    modulationIndex: 12,
    resonance: 5200,
    octaves: 0.6,
  }).connect(channels.drums);
  rideBell.frequency.value = 620;
  const hatFilter = new Tone.Filter({ frequency: 7000, type: 'highpass' }).connect(channels.drums);
  const hat = new Tone.NoiseSynth({ volume: -14, noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.06, sustain: 0 } }).connect(hatFilter);
  const kick = new Tone.MembraneSynth({ volume: -10, pitchDecay: 0.04, octaves: 5, envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 } }).connect(channels.drums);
  const snareFilter = new Tone.Filter({ frequency: 1800, type: 'bandpass', Q: 0.7 }).connect(channels.drums);
  const snare = new Tone.NoiseSynth({ volume: -12, noise: { type: 'pink' }, envelope: { attack: 0.004, decay: 0.16, sustain: 0 } }).connect(snareFilter);
  const brushFilter = new Tone.Filter({ frequency: 2600, type: 'bandpass', Q: 0.5 }).connect(channels.drums);
  const brush = new Tone.NoiseSynth({ volume: -18, noise: { type: 'pink' }, envelope: { attack: 0.14, decay: 0.28, sustain: 0 } }).connect(brushFilter);
  const rim = new Tone.MembraneSynth({ volume: -12, pitchDecay: 0.005, octaves: 1.5, envelope: { attack: 0.001, decay: 0.045, sustain: 0 } }).connect(channels.drums);
  const shakerFilter = new Tone.Filter({ frequency: 6000, type: 'bandpass', Q: 1 }).connect(channels.drums);
  const shaker = new Tone.NoiseSynth({ volume: -18, noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.07, sustain: 0 } }).connect(shakerFilter);
  const click = new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.002, octaves: 1, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } }).connect(channels.drums);

  const strum: Trio['strum'] = (midis, time, velocity, duration, instrument, spreadMs = 14) => {
    const synth = instrument === 'piano' ? piano : guitar;
    const spread = (instrument === 'piano' ? 4 : spreadMs) / 1000;
    midis.forEach((m, i) => {
      const t = time + i * spread;
      const v = Math.min(1, Math.max(0.05, velocity * (0.9 + Math.random() * 0.2) * (i === midis.length - 1 ? 1.05 : 1)));
      synth.triggerAttackRelease(midiToFrequency(m), Math.max(0.05, duration), t, v);
    });
  };

  const bassNote: Trio['bassNote'] = (m, time, velocity, duration) => {
    const f = midiToFrequency(m);
    const d = Math.max(0.08, duration);
    bassBody.triggerAttackRelease(f, d, time, velocity);
    bassSub.triggerAttackRelease(f, d, time, velocity * 0.9);
    bassThump.triggerAttackRelease(0.03, time, velocity * 0.8);
  };

  const drum: Trio['drum'] = (hit, time, velocity) => {
    const v = Math.min(1, Math.max(0.02, velocity));
    switch (hit) {
      case 'ride':
        ride.triggerAttackRelease(320, 0.4, time, v);
        break;
      case 'rideBell':
        rideBell.triggerAttackRelease(620, 0.3, time, v);
        break;
      case 'hat':
        hat.triggerAttackRelease(0.05, time, v);
        break;
      case 'kick':
        kick.triggerAttackRelease('F1', 0.2, time, v);
        break;
      case 'snare':
        snare.triggerAttackRelease(0.12, time, v);
        break;
      case 'brush':
        brush.triggerAttackRelease(0.3, time, v);
        break;
      case 'rim':
        rim.triggerAttackRelease('A5', 0.04, time, v);
        break;
      case 'shaker':
        shaker.triggerAttackRelease(0.06, time, v);
        break;
      case 'click':
        click.triggerAttackRelease('A5', 0.03, time, v);
        break;
      case 'clickAccent':
        click.triggerAttackRelease('E6', 0.03, time, v);
        break;
    }
  };

  const nodes: { dispose(): void }[] = [
    guitar, piano, guitarFilter, pianoFilter, bassBody, bassSub, bassThump, bassFilter, ride, rideBell, hat, hatFilter, kick,
    snare, snareFilter, brush, brushFilter, rim, shaker, shakerFilter, click, reverb, compressor, master, ...Object.values(channels),
  ];

  return {
    strum,
    bassNote,
    drum,
    channel: (id) => channels[id],
    releaseAll: (time) => {
      guitar.releaseAll(time);
      piano.releaseAll(time);
      bassBody.triggerRelease(time);
      bassSub.triggerRelease(time);
    },
    dispose: () => nodes.forEach((n) => n.dispose()),
  };
}
