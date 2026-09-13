import { useEffect, useRef, useState } from 'react';
import { BeatClock, DrawQueue } from '../audio/scheduler';
import { ensureAudio, audioNow, type Trio } from '../audio/instruments';
import { swingRatio } from '../audio/patterns';

type Sound = 'click' | 'swing' | 'hat24';

export function MetronomePage() {
  const [tempo, setTempo] = useState(120);
  const [sound, setSound] = useState<Sound>('swing');
  const [accentOne, setAccentOne] = useState(true);
  const [running, setRunning] = useState(false);
  const [beat, setBeat] = useState(-1);
  const clock = useRef<BeatClock | null>(null);
  const draw = useRef<DrawQueue<number> | null>(null);
  const trio = useRef<Trio | null>(null);
  const soundRef = useRef(sound);
  const accentRef = useRef(accentOne);
  const tempoRef = useRef(tempo);
  soundRef.current = sound;
  accentRef.current = accentOne;
  tempoRef.current = tempo;

  useEffect(() => {
    if (clock.current) clock.current.bpm = tempo;
  }, [tempo]);

  useEffect(() => () => stop(), []);

  const start = async () => {
    trio.current = await ensureAudio();
    draw.current = new DrawQueue<number>(audioNow, (b) => setBeat(b));
    clock.current = new BeatClock(audioNow, ({ index, time, secondsPerBeat }) => {
      const t = trio.current!;
      const b = index % 4;
      const s = soundRef.current;
      const accent = accentRef.current && b === 0;
      if (s === 'click') {
        t.drum(accent ? 'clickAccent' : 'click', time, accent ? 0.9 : b === 2 ? 0.7 : 0.6);
      } else if (s === 'hat24') {
        if (b === 1 || b === 3) t.drum('hat', time, 0.8);
        else if (accent) t.drum('click', time, 0.35);
      } else {
        const ratio = swingRatio('swing', tempoRef.current);
        t.drum(b === 0 && accent ? 'rideBell' : 'ride', time, b % 2 === 0 ? 0.85 : 0.6);
        if (b === 1 || b === 3) {
          t.drum('hat', time, 0.6);
          t.drum('ride', time + secondsPerBeat * ratio, 0.45);
        }
      }
      draw.current!.push(time, b);
    });
    clock.current.bpm = tempoRef.current;
    clock.current.start();
    setRunning(true);
  };

  const stop = () => {
    clock.current?.stop();
    draw.current?.clear();
    clock.current = null;
    setRunning(false);
    setBeat(-1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        running ? stop() : void start();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <main className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Practice</div>
          <h1>Metronome</h1>
          <p className="lede">Practise with the click on 2 and 4: it is where the swing lives.</p>
        </div>
      </div>
      <div className="card stack" style={{ alignItems: 'center' }}>
        <div className="metro-big">{tempo}</div>
        <input type="range" min={40} max={260} value={tempo} onChange={(e) => setTempo(Number(e.target.value))} style={{ width: '100%' }} aria-label="Tempo" />
        <div className="row">
          {[-10, -5, -1, 1, 5, 10].map((d) => (
            <button key={d} className="btn btn-sm" onClick={() => setTempo((t) => Math.min(260, Math.max(40, t + d)))}>{d > 0 ? `+${d}` : d}</button>
          ))}
        </div>
        <div className="beat-dots" style={{ gap: 12 }}>
          {[0, 1, 2, 3].map((b) => (
            <i key={b} className={b === beat ? 'on' : ''} style={{ width: 22, height: 22 }} />
          ))}
        </div>
        <div className="row" style={{ justifyContent: 'center' }}>
          <div className="seg">
            <button className={sound === 'swing' ? 'active' : ''} onClick={() => setSound('swing')}>Swing ride</button>
            <button className={sound === 'hat24' ? 'active' : ''} onClick={() => setSound('hat24')}>2 &amp; 4 only</button>
            <button className={sound === 'click' ? 'active' : ''} onClick={() => setSound('click')}>Click</button>
          </div>
          <label className={'toggle' + (accentOne ? ' on' : '')}>
            <input type="checkbox" checked={accentOne} onChange={(e) => setAccentOne(e.target.checked)} /> Accent beat 1
          </label>
        </div>
        <button className={'btn btn-lg' + (running ? '' : ' btn-primary')} onClick={() => (running ? stop() : void start())}>
          {running ? '■ Stop' : '▶ Start'}
        </button>
        <span className="dim small">Space bar starts and stops.</span>
      </div>
    </main>
  );
}
