/**
 * A look-ahead beat clock ("A Tale of Two Clocks"): a coarse JS timer schedules audio events
 * a short window ahead on the precise Web Audio clock. Tempo changes take effect on the next
 * beat.
 */
export interface BeatInfo {
  /** running beat counter since start (0-based) */
  index: number;
  /** audio-clock time of the beat */
  time: number;
  secondsPerBeat: number;
}

export class BeatClock {
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeatTime = 0;
  private beatIndex = 0;
  bpm = 120;
  lookahead = 0.15;
  interval = 25;

  constructor(private readonly now: () => number, private readonly onBeat: (beat: BeatInfo) => void) {}

  get running(): boolean {
    return this.timer !== null;
  }

  start(startDelay = 0.08): void {
    if (this.timer) return;
    this.beatIndex = 0;
    this.nextBeatTime = this.now() + startDelay;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.interval);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private tick(): void {
    const horizon = this.now() + this.lookahead;
    while (this.nextBeatTime < horizon) {
      const secondsPerBeat = 60 / this.bpm;
      this.onBeat({ index: this.beatIndex, time: this.nextBeatTime, secondsPerBeat });
      this.beatIndex += 1;
      this.nextBeatTime += secondsPerBeat;
    }
  }
}

/** Queue of UI events keyed by audio time, drained on animation frames. */
export class DrawQueue<T> {
  private items: { time: number; payload: T }[] = [];
  private raf: number | null = null;

  constructor(private readonly now: () => number, private readonly onDraw: (payload: T) => void) {}

  push(time: number, payload: T): void {
    this.items.push({ time, payload });
    if (this.raf === null) this.loop();
  }

  clear(): void {
    this.items = [];
    if (this.raf !== null) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  private loop = (): void => {
    const t = this.now();
    let last: T | undefined;
    while (this.items.length && this.items[0].time <= t) last = this.items.shift()!.payload;
    if (last !== undefined) this.onDraw(last);
    this.raf = this.items.length ? requestAnimationFrame(this.loop) : null;
  };
}
