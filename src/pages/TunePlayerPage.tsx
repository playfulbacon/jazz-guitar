import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { findTune } from '../data/tunes';
import { transposeTune, expandForm, chartBars } from '../theory/tune';
import { keyName, parseKey } from '../theory/keys';
import type { Plan } from '../audio/engine';
import { engine } from '../audio/engine';
import { usePlanOwner } from '../audio/usePlayback';
import { usePlayer } from '../store/player';
import { useSettings } from '../store/settings';
import { ChartGrid, type ChordSelection } from '../components/ChartGrid';
import { ChordPanel } from '../components/ChordPanel';
import { FretboardStrip } from '../components/FretboardStrip';
import { Transport } from '../components/Transport';
import { Mixer } from '../components/Mixer';

export function TunePlayerPage() {
  const { id } = useParams();
  const base = findTune(id);
  if (!base) {
    return (
      <main className="page">
        <h1>Tune not found</h1>
        <Link to="/tunes">Back to tunes</Link>
      </main>
    );
  }
  return <Player key={base.id} tuneId={base.id} />;
}

function Player({ tuneId }: { tuneId: string }) {
  const base = findTune(tuneId)!;
  const settings = useSettings();
  const transpose = settings.transposeByTune[tuneId] ?? 0;
  const tempo = settings.tempoByTune[tuneId] ?? base.defaultTempo;
  const tune = useMemo(() => transposeTune(base, transpose), [base, transpose]);
  const playBars = useMemo(() => expandForm(tune), [tune]);
  const cells = useMemo(() => chartBars(tune), [tune]);

  const plan = useMemo<Plan>(
    () => ({
      style: tune.style,
      bars: playBars.map((b, i) => ({
        chartId: b.chartId,
        slots: b.chords.map((c) => ({ chord: c.chord, beats: c.beats })),
        sectionStart: i === 0 || playBars[i - 1].sectionEnd,
        sectionEnd: b.sectionEnd,
      })),
    }),
    [tune, playBars],
  );

  const { toggle, playing } = usePlanOwner(`tune:${tuneId}`, plan, tempo);
  const { position, loading, loop, loopPending, set } = usePlayer();
  const [showMixer, setShowMixer] = useState(false);
  const [selected, setSelected] = useState<ChordSelection | null>(null);
  const [ring, setRing] = useState<number[]>([]);

  // Tapping a chord pins the spotlight to it and opens the inspector; tapping it again closes.
  const onChordTap = useCallback((sel: ChordSelection) => {
    setSelected((prev) => (prev && prev.chartId === sel.chartId && prev.slot === sel.slot ? null : sel));
    setRing([]);
  }, []);

  const auditionVoicing = useCallback(
    (midis: number[]) => {
      setRing(midis);
      void engine.audition(midis, settings.compInstrument);
      window.setTimeout(() => setRing((r) => (r === midis ? [] : r)), 1800);
    },
    [settings.compInstrument],
  );

  // loop selection: tap two chart bars
  const onBarTap = useCallback(
    (chartId: number) => {
      if (loopPending === null) {
        if (loop && loop.startChartId === chartId && loop.endChartId === chartId) {
          set({ loop: null });
          engine.update({ loop: null });
          return;
        }
        set({ loopPending: chartId });
        return;
      }
      const a = Math.min(loopPending, chartId);
      const b = Math.max(loopPending, chartId);
      // map chart ids to play indexes: first pass of the start cell, then the first later end
      const start = playBars.findIndex((p) => p.chartId === a);
      let end = playBars.findIndex((p, i) => i >= start && p.chartId === b);
      if (end === -1) end = start;
      const region = { startChartId: a, endChartId: b, start, end };
      set({ loop: region, loopPending: null });
      engine.update({ loop: { start, end } });
    },
    [loopPending, loop, playBars, set],
  );

  const clearLoop = useCallback(() => {
    set({ loop: null, loopPending: null });
    engine.update({ loop: null });
  }, [set]);

  // keyboard: space toggles playback, escape clears loop
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      } else if (e.key === 'Escape') {
        if (selected) setSelected(null);
        else clearLoop();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle, clearLoop, selected]);

  // auto-scroll the current bar into view
  useEffect(() => {
    if (!position || position.chartId === null) return;
    const el = document.querySelector<HTMLElement>(`.bar[aria-label="Bar ${position.chartId + 1}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    const margin = 120;
    if (r.top < 70 || r.bottom > window.innerHeight - margin) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [position?.chartId]);

  const currentChord = position?.chord ?? null;
  const currentCell = position?.chartId ?? null;
  const key = keyName(parseKey(tune.defaultKey), { unicode: true });
  const loopLabel = loop ? `bars ${loop.startChartId + 1}–${loop.endChartId + 1}` : loopPending !== null ? `from bar ${loopPending + 1}…` : null;

  return (
    <main className="page page-wide player">
      <div className="player-title">
        <h1>{tune.title}</h1>
        <div className="meta">
          <span>{key}</span>
          <span>{tune.form}</span>
          <span>{tune.style}</span>
          {tune.composer && <span className="dim">{tune.composer}</span>}
        </div>
        <span className="spacer" />
        <Link className="btn btn-sm" to={`/tunes/${tune.id}/learn`}>Analysis &amp; drills →</Link>
      </div>
      <div className="player-toolbar">
        <div className="seg" aria-label="Chord display">
          <button className={!settings.showRoman ? 'active' : ''} onClick={() => settings.set({ showRoman: false })}>Symbols</button>
          <button className={settings.showRoman ? 'active' : ''} onClick={() => settings.set({ showRoman: true })}>Roman</button>
        </div>
        <button className={'btn' + (settings.showXray ? ' active' : '')} onClick={() => settings.set({ showXray: !settings.showXray })}>ii–V–I x-ray</button>
        <div className="row" style={{ gap: '0.35rem' }}>
          <span className="label">Voicings</span>
          <div className="seg">
            <button className={settings.voicingLevel === 'shell' ? 'active' : ''} onClick={() => settings.set({ voicingLevel: 'shell' })}>Shells</button>
            <button className={settings.voicingLevel === 'drop2' ? 'active' : ''} onClick={() => settings.set({ voicingLevel: 'drop2' })}>Drop 2</button>
            <button className={settings.voicingLevel === 'extended' ? 'active' : ''} onClick={() => settings.set({ voicingLevel: 'extended' })}>Extended</button>
          </div>
        </div>
        <div className="row" style={{ gap: '0.35rem' }}>
          <span className="label">Labels</span>
          <div className="seg">
            <button className={settings.labelMode === 'interval' ? 'active' : ''} onClick={() => settings.set({ labelMode: 'interval' })}>R 3 7</button>
            <button className={settings.labelMode === 'note' ? 'active' : ''} onClick={() => settings.set({ labelMode: 'note' })}>C E B</button>
          </div>
        </div>
        <button className={'btn' + (settings.showSpotlight ? ' active' : '')} onClick={() => settings.set({ showSpotlight: !settings.showSpotlight })}>Spotlight</button>
        <span className="spacer" />
        <button className={'btn' + (showMixer ? ' active' : '')} onClick={() => setShowMixer((v) => !v)}>Mixer</button>
      </div>

      <div className="player-layout">
        <div className="player-main">
          <ChartGrid
            tune={tune}
            showRoman={settings.showRoman}
            showXray={settings.showXray}
            currentChartId={currentCell}
            currentSlot={position?.slot ?? 0}
            loop={loop ? { startChartId: loop.startChartId, endChartId: loop.endChartId } : null}
            loopPending={loopPending}
            selected={selected}
            onBarTap={onBarTap}
            onChordTap={onChordTap}
          />
          <p className="chart-hint small dim">
            Tap a chord to see its voicings. Tap two bars anywhere else to set a loop.
          </p>
          {settings.showSpotlight && (
            <FretboardStrip
              chord={selected?.chord ?? currentChord ?? cells[0]?.chords[0]?.chord ?? null}
              labelMode={settings.labelMode}
              ring={ring}
              pinned={!!selected}
              onUnpin={() => setSelected(null)}
            />
          )}
          {tune.analysis?.notes && (
            <p className="muted small" style={{ marginTop: '1rem' }}>
              <b>Analysis:</b> {tune.analysis.notes}
            </p>
          )}
        </div>
        {(selected || showMixer) && (
          <aside className="player-side">
            {selected && (
              <ChordPanel selection={selected} labelMode={settings.labelMode} onAudition={auditionVoicing} onClose={() => setSelected(null)} />
            )}
            {showMixer && <Mixer />}
          </aside>
        )}
      </div>

      <Transport
        playing={playing}
        loading={loading}
        onToggle={toggle}
        tempo={tempo}
        onTempo={(bpm) => settings.setTuneTempo(tuneId, bpm)}
        position={position}
        countIn={settings.countIn}
        onCountIn={(v) => settings.set({ countIn: v })}
        transpose={transpose}
        onTranspose={(s) => {
          setSelected(null);
          settings.setTuneTranspose(tuneId, s);
        }}
        keyName={key}
        loopLabel={loopLabel}
        onClearLoop={clearLoop}
        totalBars={playBars.length}
      />
    </main>
  );
}
