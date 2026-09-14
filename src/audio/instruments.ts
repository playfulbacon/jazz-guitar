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
      // "balanced" asks the browser for a larger render buffer than Tone's default
      // "interactive" setting. A starved audio thread is what crackling sounds like, and the
      // extra output latency costs nothing here because every event is scheduled ahead on
      // the audio clock (the UI compensates with outputLatency()).
      Tone.setContext(new Tone.Context({ latencyHint: 'balanced', lookAhead: 0.2 }));
      await Tone.start();
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

/** How far behind the audio clock the speakers actually are, so visuals can line up with sound. */
export function outputLatency(): number {
  if (!Tone) return 0;
  const raw = Tone.getContext().rawContext as unknown as { outputLatency?: number; baseLatency?: number };
  return raw.outputLatency || raw.baseLatency || 0;
}

function buildTrio(): Trio {
  const master = new Tone.Limiter(-1).toDestination();
  const compressor = new Tone.Compressor({ threshold: -18, ratio: 2.5, attack: 0.01, release: 0.2 }).connect(master);
  const reverb = new Tone.Reverb({ decay: 1.1, preDelay: 0.02, wet: 0.15 }).connect(compressor);

  const channels: Record<InstrumentId, ToneTypes.Channel> = {
    comp: new Tone.Channel({ volume: -6 }).connect(reverb),
    bass: new Tone.Channel({ volume: -4 }).connect(compressor),
    drums: new Tone.Channel({ volume: -8 }).connect(reverb),
  };

  // --- Comp guitar: FM pluck through a warm low-pass. ---
  const guitarFilter = new Tone.Filter({ frequency: 2400, type: 'lowpass', rolloff: -12, Q: 0.6 }).connect(channels.comp);
  const guitar = new Tone.PolySynth({
    voice: Tone.FMSynth,
    maxPolyphony: 10,
    volume: -6,
    options: {
      harmonicity: 2,
      modulationIndex: 2.2,
      oscillator: { type: 'triangle' },
      modulation: { type: 'sine' },
      envelope: { attack: 0.006, decay: 1.4, sustain: 0.06, release: 0.35 },
      modulationEnvelope: { attack: 0.003, decay: 0.25, sustain: 0.04, release: 0.25 },
    },
  }).connect(guitarFilter);

  // --- Comp piano: brighter FM, built on first use so the guitar-only case stays cheap. ---
  let piano: ToneTypes.PolySynth<ToneTypes.FMSynth> | null = null;
  let pianoFilter: ToneTypes.Filter | null = null;
  const getPiano = () => {
    if (!piano) {
      pianoFilter = new Tone.Filter({ frequency: 5200, type: 'lowpass', rolloff: -12 }).connect(channels.comp);
      piano = new Tone.PolySynth({
        voice: Tone.FMSynth,
        maxPolyphony: 10,
        volume: -8,
        options: {
          harmonicity: 3.01,
          modulationIndex: 6,
          oscillator: { type: 'sine' },
          modulation: { type: 'sine' },
          envelope: { attack: 0.004, decay: 1.8, sustain: 0.04, release: 0.6 },
          modulationEnvelope: { attack: 0.002, decay: 0.35, sustain: 0.02, release: 0.3 },
        },
      }).connect(pianoFilter);
    }
    return piano;
  };

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
  // Tone's MetalSynth cymbals are stacked square waves: at 44.1 kHz their partials land near
  // Nyquist and alias into a constant fizz, which is what "crackly" sounded like. Filtered
  // noise plus a couple of sine partials gives a band-limited brush/ride that stays smooth.
  const drumBus = new Tone.Filter({ frequency: 12000, type: 'lowpass', rolloff: -12 }).connect(channels.drums);

  const rideFilter = new Tone.Filter({ frequency: 6000, type: 'bandpass', Q: 0.5 }).connect(drumBus);
  const rideNoise = new Tone.NoiseSynth({
    volume: -7,
    noise: { type: 'white' },
    envelope: { attack: 0.002, decay: 0.85, sustain: 0, release: 0.2 },
  }).connect(rideFilter);
  const rideTone = new Tone.Synth({
    volume: -18,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.3, sustain: 0, release: 0.1 },
  }).connect(drumBus);
  const bellFilter = new Tone.Filter({ frequency: 3400, type: 'bandpass', Q: 1.4 }).connect(drumBus);
  const bellNoise = new Tone.NoiseSynth({
    volume: -11,
    noise: { type: 'white' },
    envelope: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.15 },
  }).connect(bellFilter);
  const bellTone = new Tone.Synth({
    volume: -14,
    oscillator: { type: 'sine' },
    envelope: { attack: 0.001, decay: 0.55, sustain: 0, release: 0.15 },
  }).connect(drumBus);

  const hatFilter = new Tone.Filter({ frequency: 8200, type: 'bandpass', Q: 1.1 }).connect(drumBus);
  const hat = new Tone.NoiseSynth({ volume: -9, noise: { type: 'white' }, envelope: { attack: 0.001, decay: 0.055, sustain: 0 } }).connect(hatFilter);
  const kick = new Tone.MembraneSynth({ volume: -9, pitchDecay: 0.04, octaves: 5, envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 } }).connect(drumBus);
  const snareFilter = new Tone.Filter({ frequency: 1700, type: 'bandpass', Q: 0.6 }).connect(drumBus);
  const snare = new Tone.NoiseSynth({ volume: -7, noise: { type: 'pink' }, envelope: { attack: 0.004, decay: 0.16, sustain: 0 } }).connect(snareFilter);
  const brushFilter = new Tone.Filter({ frequency: 2400, type: 'bandpass', Q: 0.5 }).connect(drumBus);
  const brush = new Tone.NoiseSynth({ volume: -11, noise: { type: 'pink' }, envelope: { attack: 0.14, decay: 0.28, sustain: 0 } }).connect(brushFilter);
  const rim = new Tone.MembraneSynth({ volume: -9, pitchDecay: 0.005, octaves: 1.5, envelope: { attack: 0.001, decay: 0.045, sustain: 0 } }).connect(drumBus);
  const shakerFilter = new Tone.Filter({ frequency: 5200, type: 'bandpass', Q: 1 }).connect(drumBus);
  const shaker = new Tone.NoiseSynth({ volume: -13, noise: { type: 'white' }, envelope: { attack: 0.01, decay: 0.07, sustain: 0 } }).connect(shakerFilter);
  const click = new Tone.MembraneSynth({ volume: -8, pitchDecay: 0.002, octaves: 1, envelope: { attack: 0.001, decay: 0.03, sustain: 0 } }).connect(drumBus);

  const strum: Trio['strum'] = (midis, time, velocity, duration, instrument, spreadMs = 14) => {
    const synth = instrument === 'piano' ? getPiano() : guitar;
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
        rideNoise.triggerAttackRelease(0.5, time, v);
        rideTone.triggerAttackRelease(430, 0.16, time, v * 0.5);
        break;
      case 'rideBell':
        bellNoise.triggerAttackRelease(0.4, time, v * 0.8);
        bellTone.triggerAttackRelease(790, 0.4, time, v * 0.55);
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

  const nodes: ({ dispose(): void } | null)[] = [
    guitar, guitarFilter, bassBody, bassSub, bassThump, bassFilter, drumBus, rideNoise, rideTone, rideFilter, bellNoise, bellTone,
    bellFilter, hat, hatFilter, kick, snare, snareFilter, brush, brushFilter, rim, shaker, shakerFilter, click, reverb, compressor,
    master, ...Object.values(channels),
  ];

  return {
    strum,
    bassNote,
    drum,
    channel: (id) => channels[id],
    releaseAll: (time) => {
      guitar.releaseAll(time);
      piano?.releaseAll(time);
      bassBody.triggerRelease(time);
      bassSub.triggerRelease(time);
    },
    dispose: () => [...nodes, piano, pianoFilter].forEach((n) => n?.dispose()),
  };
}
