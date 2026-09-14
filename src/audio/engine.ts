/**
 * The virtual trio: schedules comping, walking bass and drums over a chord-chart plan.
 */
import type { Chord } from '../theory/chords';
import type { Style } from '../theory/tune';
import type { VoicingLevel } from '../theory/voicings';
import { voicingMidiNotes } from '../theory/voicings';
import { bassLineForSlot, type BassSlot, type BassFeel } from '../theory/bass';
import { pitchClass } from '../theory/notes';
import { seededRng, type Rng } from '../theory/random';
import { BeatClock, DrawQueue } from './scheduler';
import { ensureAudio, audioNow, outputLatency, type Trio, type CompInstrument, type InstrumentId } from './instruments';
import { chooseCompPattern, drumBar, countInBar, swingRatio, offsetSeconds } from './patterns';
import { chooseVoicing, initialComperState, type ComperState } from './comper';

export interface PlanSlot {
  chord: Chord;
  beats: number;
}

export interface PlanBar {
  /** identifies the chart cell for highlighting; opaque to the engine */
  chartId: number;
  slots: PlanSlot[];
  sectionStart: boolean;
  sectionEnd: boolean;
}

export interface Plan {
  bars: PlanBar[];
  style: Style;
}

export interface Position {
  /** index into plan.bars, or -1/-2 during the count-in */
  barIndex: number;
  chartId: number | null;
  /** 0..3 */
  beat: number;
  /** index of the sounding slot within the bar */
  slot: number;
  chord: Chord | null;
  chorus: number;
  countIn: boolean;
}

export interface EngineSettings {
  tempo: number;
  countIn: boolean;
  loop: { start: number; end: number } | null;
  voicingLevel: VoicingLevel;
  compInstrument: CompInstrument;
  feel: BassFeel;
  humanize: boolean;
}

export interface EngineCallbacks {
  onPosition?: (p: Position) => void;
  onWrap?: (chorus: number) => void;
  onStop?: () => void;
}

const COUNT_IN_BARS = 2;

interface ScheduledEvent {
  at: number; // beats from bar start
  fire: (time: number) => void;
}

export class TrioEngine {
  private trio: Trio | null = null;
  private clock: BeatClock;
  private draw: DrawQueue<Position>;
  private plan: Plan = { bars: [], style: 'swing' };
  private settings: EngineSettings = { tempo: 120, countIn: true, loop: null, voicingLevel: 'shell', compInstrument: 'guitar', feel: 'walking', humanize: true };
  private callbacks: EngineCallbacks = {};
  private rng: Rng = seededRng(Date.now() & 0xffff);
  private comper: ComperState = initialComperState();
  private lastPatternId?: string;
  private lastBassMidi?: number;

  // playback cursor
  private barIndex = 0;
  private beatInBar = 0;
  private countInRemaining = 0;
  private chorus = 1;
  private barEvents: ScheduledEvent[] = [];
  private barSlotAtBeat: number[] = [0, 0, 0, 0];
  private pendingAnticipation: { chord: Chord; barIndex: number } | null = null;
  private _playing = false;

  constructor() {
    this.clock = new BeatClock(audioNow, (b) => this.onBeat(b.time, b.secondsPerBeat));
    this.draw = new DrawQueue<Position>(audioNow, (p) => this.callbacks.onPosition?.(p), outputLatency);
  }

  get playing(): boolean {
    return this._playing;
  }

  setCallbacks(cb: EngineCallbacks): void {
    this.callbacks = cb;
  }

  setPlan(plan: Plan): void {
    this.plan = plan;
    if (this.barIndex >= plan.bars.length) this.barIndex = 0;
  }

  getPlan(): Plan {
    return this.plan;
  }

  update(partial: Partial<EngineSettings>): void {
    this.settings = { ...this.settings, ...partial };
    this.clock.bpm = this.settings.tempo;
    if (partial.loop && this._playing) {
      // If we are outside the new loop, jump in at the next bar boundary.
      const { start, end } = partial.loop;
      if (this.barIndex < start || this.barIndex > end) this.barIndex = start;
    }
  }

  getSettings(): EngineSettings {
    return this.settings;
  }

  async prepare(): Promise<void> {
    this.trio = await ensureAudio();
  }

  channel(id: InstrumentId) {
    return this.trio?.channel(id);
  }

  async start(fromBar = 0): Promise<void> {
    if (this._playing) return;
    if (!this.trio) await this.prepare();
    if (!this.plan.bars.length) return;
    this._playing = true;
    this.chorus = 1;
    this.barIndex = this.settings.loop ? Math.max(this.settings.loop.start, Math.min(fromBar, this.settings.loop.end)) : Math.min(fromBar, this.plan.bars.length - 1);
    this.beatInBar = 0;
    this.countInRemaining = this.settings.countIn ? COUNT_IN_BARS : 0;
    this.comper = initialComperState();
    this.lastBassMidi = undefined;
    this.pendingAnticipation = null;
    this.clock.bpm = this.settings.tempo;
    this.clock.start();
  }

  stop(): void {
    if (!this._playing) return;
    this._playing = false;
    this.clock.stop();
    this.draw.clear();
    this.trio?.releaseAll(audioNow() + 0.02);
    this.callbacks.onStop?.();
  }

  /** Play a chord once (for the chord library and gym "hear it" buttons). */
  async audition(midis: number[], instrument: CompInstrument = 'guitar', velocity = 0.8, duration = 1.6): Promise<void> {
    if (!this.trio) await this.prepare();
    this.trio!.strum(midis, audioNow() + 0.03, velocity, duration, instrument, 22);
  }

  async auditionBass(midi: number, duration = 0.8): Promise<void> {
    if (!this.trio) await this.prepare();
    this.trio!.bassNote(midi, audioNow() + 0.03, 0.85, duration);
  }

  // ---- scheduling ----

  private onBeat(time: number, spb: number): void {
    if (!this.trio) return;
    if (this.beatInBar === 0) this.prepareBar();
    const ratio = swingRatio(this.plan.style, this.settings.tempo);
    const beat = this.beatInBar;
    for (const ev of this.barEvents) {
      if (ev.at >= beat && ev.at < beat + 1) {
        let t = time + offsetSeconds(ev.at - beat, spb, ratio);
        if (this.settings.humanize) t += (this.rng() - 0.5) * 0.016;
        ev.fire(Math.max(t, audioNow()));
      }
    }
    // UI position
    const countIn = this.countInRemaining > 0;
    const bar = countIn ? null : this.plan.bars[this.barIndex];
    const slot = countIn ? 0 : this.barSlotAtBeat[beat] ?? 0;
    this.draw.push(time, {
      barIndex: countIn ? -this.countInRemaining : this.barIndex,
      chartId: bar ? bar.chartId : null,
      beat,
      slot,
      chord: bar ? bar.slots[slot]?.chord ?? null : null,
      chorus: this.chorus,
      countIn,
    });
    this.beatInBar += 1;
    if (this.beatInBar >= 4) {
      this.beatInBar = 0;
      this.advanceBar();
    }
  }

  private advanceBar(): void {
    if (this.countInRemaining > 0) {
      this.countInRemaining -= 1;
      return;
    }
    const next = this.nextBarIndex(this.barIndex);
    if (next.wrapped) {
      this.chorus += 1;
      this.callbacks.onWrap?.(this.chorus);
    }
    this.barIndex = next.index;
  }

  private nextBarIndex(i: number): { index: number; wrapped: boolean } {
    const loop = this.settings.loop;
    const n = this.plan.bars.length;
    if (loop && i >= loop.end) return { index: Math.min(loop.start, n - 1), wrapped: true };
    if (i + 1 >= n) return { index: 0, wrapped: true };
    return { index: i + 1, wrapped: false };
  }

  private prepareBar(): void {
    this.barEvents = [];
    const trio = this.trio!;
    if (this.countInRemaining > 0) {
      for (const d of countInBar()) this.barEvents.push({ at: d.at, fire: (t) => trio.drum(d.hit, t, d.velocity) });
      this.barSlotAtBeat = [0, 0, 0, 0];
      return;
    }
    const bar = this.plan.bars[this.barIndex];
    if (!bar) return;
    const nextBar = this.plan.bars[this.nextBarIndex(this.barIndex).index];
    const style = this.plan.style;
    const spbNominal = 60 / this.settings.tempo;
    const humanVel = () => (this.settings.humanize ? 0.92 + this.rng() * 0.16 : 1);

    // slot map for the UI
    this.barSlotAtBeat = [];
    let cursor = 0;
    bar.slots.forEach((s, i) => {
      for (let b = 0; b < s.beats; b++) this.barSlotAtBeat[Math.min(3, cursor + b)] = i;
      cursor += s.beats;
    });
    while (this.barSlotAtBeat.length < 4) this.barSlotAtBeat.push(bar.slots.length - 1);

    // --- comping ---
    cursor = 0;
    bar.slots.forEach((slot, i) => {
      const isLast = i === bar.slots.length - 1;
      const nextChord: Chord | undefined = isLast ? nextBar?.slots[0]?.chord : bar.slots[i + 1].chord;
      const anticipated = this.pendingAnticipation && this.pendingAnticipation.barIndex === this.barIndex && i === 0;
      this.pendingAnticipation = null;
      const pattern = chooseCompPattern(style, slot.beats, this.rng, this.lastPatternId);
      this.lastPatternId = pattern.id;
      const voicing = chooseVoicing(slot.chord, this.settings.voicingLevel, this.comper, this.rng);
      const midis = voicingMidiNotes(voicing);
      pattern.hits.forEach((hit, h) => {
        // if the previous slot anticipated this chord, drop a downbeat hit so it doesn't double up
        if (anticipated && h === 0 && hit.at === 0) return;
        let chordMidis = midis;
        if (hit.anticipate && nextChord && pitchClass(nextChord.root) !== pitchClass(slot.chord.root) ) {
          const v = chooseVoicing(nextChord, this.settings.voicingLevel, this.comper, this.rng);
          chordMidis = voicingMidiNotes(v);
          if (isLast) this.pendingAnticipation = { chord: nextChord, barIndex: this.nextBarIndex(this.barIndex).index };
        }
        const vel = 0.62 * (hit.accent ?? 1) * humanVel();
        const dur = hit.dur * spbNominal;
        this.barEvents.push({ at: cursor + hit.at, fire: (t) => trio.strum(chordMidis, t, vel, dur, this.settings.compInstrument) });
      });
      cursor += slot.beats;
    });

    // --- bass ---
    cursor = 0;
    bar.slots.forEach((slot, i) => {
      const isLast = i === bar.slots.length - 1;
      const next: BassSlot | undefined = isLast ? (nextBar ? { chord: nextBar.slots[0].chord, beats: nextBar.slots[0].beats } : undefined) : { chord: bar.slots[i + 1].chord, beats: bar.slots[i + 1].beats };
      if (style === 'bossa') {
        const notes = this.bossaBass(slot, this.lastBassMidi);
        for (const n of notes) this.barEvents.push({ at: cursor + n.at, fire: (t) => trio.bassNote(n.midi, t, n.velocity * humanVel(), n.dur * spbNominal) });
        this.lastBassMidi = notes[0]?.midi;
      } else {
        const feel: BassFeel = style === 'ballad' ? 'two' : this.settings.feel;
        const notes = bassLineForSlot({ chord: slot.chord, beats: slot.beats }, next, this.lastBassMidi, this.rng, feel);
        for (const n of notes) {
          const dur = n.role === 'push' ? 0.35 * spbNominal : n.duration * spbNominal * 0.9;
          this.barEvents.push({ at: cursor + n.beat, fire: (t) => trio.bassNote(n.midi, t, n.velocity * humanVel(), dur) });
        }
        const onBeat = notes.filter((n) => n.role !== 'push');
        this.lastBassMidi = onBeat[onBeat.length - 1]?.midi ?? this.lastBassMidi;
      }
      cursor += slot.beats;
    });

    // --- drums ---
    const drums = drumBar(style, { barIndex: this.barIndex, sectionStart: bar.sectionStart, sectionEnd: bar.sectionEnd }, this.rng);
    for (const d of drums) this.barEvents.push({ at: d.at, fire: (t) => trio.drum(d.hit, t, d.velocity * humanVel()) });
  }

  private bossaBass(slot: PlanSlot, prev: number | undefined): { at: number; midi: number; velocity: number; dur: number }[] {
    const rootPc = pitchClass(slot.chord.bass ?? slot.chord.root);
    const near = prev ?? 38;
    let root = 28 + ((rootPc - 28) % 12 + 12) % 12;
    while (root + 12 <= near + 6 && root + 12 <= 50) root += 12;
    const fifthName = slot.chord.quality.intervals.find((i) => i === '5' || i === 'b5' || i === '#5') ?? '5';
    const fifthSemis = fifthName === 'b5' ? 6 : fifthName === '#5' ? 8 : 7;
    const fifth = root + fifthSemis - 12 >= 28 ? root + fifthSemis - 12 : root + fifthSemis;
    if (slot.beats >= 4) {
      return [
        { at: 0, midi: root, velocity: 0.85, dur: 1.4 },
        { at: 1.5, midi: fifth, velocity: 0.6, dur: 0.45 },
        { at: 2, midi: root, velocity: 0.8, dur: 1.4 },
        { at: 3.5, midi: fifth, velocity: 0.6, dur: 0.45 },
      ];
    }
    return [
      { at: 0, midi: root, velocity: 0.85, dur: 1.4 },
      { at: 1.5, midi: fifth, velocity: 0.6, dur: 0.45 },
    ].filter((n) => n.at < slot.beats);
  }
}

/** A single shared engine for the whole app (only one thing plays at a time). */
export const engine = new TrioEngine();
