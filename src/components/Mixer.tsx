import { useSettings } from '../store/settings';
import type { InstrumentId } from '../audio/instruments';

const STRIPS: { id: InstrumentId; name: string }[] = [
  { id: 'comp', name: 'Comp' },
  { id: 'bass', name: 'Bass' },
  { id: 'drums', name: 'Drums' },
];

export function Mixer() {
  const { mixer, setChannel, compInstrument, set, feel, humanize } = useSettings();
  return (
    <div className="mixer">
      {STRIPS.map((s) => {
        const ch = mixer[s.id];
        return (
          <div className="strip" key={s.id}>
            <span className="name">
              {s.name}
              {s.id === 'comp' && <span className="dim small"> · {compInstrument}</span>}
            </span>
            <button className={'btn mute' + (ch.mute ? ' active' : '')} onClick={() => setChannel(s.id, { mute: !ch.mute })} title="Mute">M</button>
            <button className={'btn solo' + (ch.solo ? ' active' : '')} onClick={() => setChannel(s.id, { solo: !ch.solo })} title="Solo">S</button>
            <input type="range" min={-40} max={6} step={1} value={ch.volume} onChange={(e) => setChannel(s.id, { volume: Number(e.target.value) })} aria-label={`${s.name} volume`} />
          </div>
        );
      })}
      <div className="card stack" style={{ gap: '0.5rem' }}>
        <div className="field">
          <label>Comp instrument</label>
          <div className="seg">
            <button className={compInstrument === 'guitar' ? 'active' : ''} onClick={() => set({ compInstrument: 'guitar' })}>Guitar</button>
            <button className={compInstrument === 'piano' ? 'active' : ''} onClick={() => set({ compInstrument: 'piano' })}>Piano</button>
          </div>
        </div>
        <div className="field">
          <label>Bass feel</label>
          <div className="seg">
            <button className={feel === 'walking' ? 'active' : ''} onClick={() => set({ feel: 'walking' })}>Walking</button>
            <button className={feel === 'two' ? 'active' : ''} onClick={() => set({ feel: 'two' })}>Two-feel</button>
          </div>
        </div>
        <label className={'toggle' + (humanize ? ' on' : '')}>
          <input type="checkbox" checked={humanize} onChange={(e) => set({ humanize: e.target.checked })} /> Humanize timing
        </label>
      </div>
    </div>
  );
}
