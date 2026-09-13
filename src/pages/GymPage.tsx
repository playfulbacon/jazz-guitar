import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Key, allKeys, keyName, romanNumeral } from '../theory/keys';
import { parseChord, displaySymbol, chordSymbol, QUALITIES } from '../theory/chords';
import { transposeNote, interval, simplifyNote, pitchClass } from '../theory/notes';
import type { Plan } from '../audio/engine';
import { usePlanOwner } from '../audio/usePlayback';
import { usePlayer } from '../store/player';
import { useSettings } from '../store/settings';
import { Transport } from '../components/Transport';
import { FretboardStrip } from '../components/FretboardStrip';
import { Mixer } from '../components/Mixer';
import { formatNumeral } from '../theory/keys';

type Mix = 'major' | 'minor' | 'both';
type Length = 'compact' | 'four' | 'eight';

interface Round {
  key: Key;
  chords: { symbol: string; beats: number }[][]; // bars
}

function makeRound(keys: Key[], mix: Mix, length: Length): Round {
  const pool = keys.length ? keys : allKeys('major');
  const mode: 'major' | 'minor' = mix === 'both' ? (Math.random() < 0.5 ? 'major' : 'minor') : mix;
  const majorKey = pool[Math.floor(Math.random() * pool.length)];
  const key: Key = mode === 'major' ? majorKey : { tonic: allKeys('minor').find((k) => pitchClass(k.tonic) === pitchClass(majorKey.tonic))!.tonic, mode: 'minor' };
  const ii = simplifyNote(transposeNote(key.tonic, interval('2')), mode === 'major');
  const V = simplifyNote(transposeNote(key.tonic, interval('5')), mode === 'major');
  const iiSym = chordSymbol(ii, QUALITIES[mode === 'major' ? 'm7' : 'm7b5']);
  const vSym = chordSymbol(V, QUALITIES[mode === 'major' ? '7' : '7b9']);
  const iSym = chordSymbol(key.tonic, QUALITIES[mode === 'major' ? 'maj7' : 'm6']);
  let bars: Round['chords'];
  if (length === 'compact') bars = [[{ symbol: iiSym, beats: 2 }, { symbol: vSym, beats: 2 }], [{ symbol: iSym, beats: 4 }]];
  else if (length === 'four') bars = [[{ symbol: iiSym, beats: 4 }], [{ symbol: vSym, beats: 4 }], [{ symbol: iSym, beats: 4 }], [{ symbol: iSym, beats: 4 }]];
  else bars = [iiSym, iiSym, vSym, vSym, iSym, iSym, iSym, iSym].map((s) => [{ symbol: s, beats: 4 }]);
  return { key, chords: bars };
}

function toPlan(round: Round, style: 'swing' | 'bossa'): Plan {
  return {
    style,
    bars: round.chords.map((bar, i) => ({
      chartId: i,
      slots: bar.map((c) => ({ chord: parseChord(c.symbol), beats: c.beats })),
      sectionStart: i === 0,
      sectionEnd: i === round.chords.length - 1,
    })),
  };
}

export function GymPage() {
  const settings = useSettings();
  const [enabledPcs, setEnabledPcs] = useState<number[]>(() => Array.from({ length: 12 }, (_, i) => i));
  const [mix, setMix] = useState<Mix>('both');
  const [length, setLength] = useState<Length>('four');
  const [tempo, setTempo] = useState(120);
  const [style, setStyle] = useState<'swing' | 'bossa'>('swing');
  const [alwaysShow, setAlwaysShow] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [everyChoruses, setEveryChoruses] = useState(2);
  const [showMixer, setShowMixer] = useState(false);
  const majorKeys = useMemo(() => allKeys('major'), []);
  const keys = useMemo(() => majorKeys.filter((k) => enabledPcs.includes(pitchClass(k.tonic))), [majorKeys, enabledPcs]);
  const [round, setRound] = useState<Round>(() => makeRound(keys, mix, length));
  const [history, setHistory] = useState<Round[]>([]);
  const chorusesOnRound = useRef(0);

  const newRound = useCallback(() => {
    setRound((prev) => {
      setHistory((h) => [prev, ...h].slice(0, 8));
      return makeRound(keys, mix, length);
    });
    setRevealed(false);
    chorusesOnRound.current = 0;
  }, [keys, mix, length]);

  // regenerate when settings change (not while playing to avoid jumping mid-round)
  const playing = usePlayer((s) => s.playing);
  useEffect(() => {
    if (!playing) {
      setRound(makeRound(keys, mix, length));
      setRevealed(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys, mix, length]);

  const plan = useMemo(() => toPlan(round, style), [round, style]);
  const onWrap = useCallback(() => {
    chorusesOnRound.current += 1;
    if (chorusesOnRound.current >= everyChoruses) newRound();
  }, [everyChoruses, newRound]);
  const { toggle } = usePlanOwner('gym', plan, tempo, onWrap);
  const { position, loading } = usePlayer();

  const show = alwaysShow || revealed;
  const currentBar = position && !position.countIn ? position.barIndex : -1;

  return (
    <main className="page player">
      <div className="page-header">
        <div>
          <div className="eyebrow">Practice</div>
          <h1>ii–V–I Gym</h1>
          <p className="lede">The trio plays a cadence in a random key. Hear it, find it on the guitar, then reveal. A new key arrives every {everyChoruses} {everyChoruses === 1 ? 'chorus' : 'choruses'}.</p>
        </div>
        <span className="spacer" />
        <button className={'btn' + (showMixer ? ' active' : '')} onClick={() => setShowMixer((v) => !v)}>Mixer</button>
      </div>

      <div className="player-layout">
        <div className="player-main">
          <div className="card">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
              <div>
                <span className="label">Key</span>{' '}
                <b style={{ fontSize: '1.3rem' }}>{show ? keyName(round.key, { unicode: true }) + (round.key.mode === 'minor' ? ' minor' : ' major') : '?'}</b>
              </div>
              <div className="row">
                <button className="btn" onClick={() => setRevealed(true)} disabled={show}>Reveal</button>
                <button className="btn" onClick={newRound}>Next key</button>
              </div>
            </div>
            <div className="gym-stage" style={{ gridTemplateColumns: `repeat(${Math.min(4, round.chords.length)}, minmax(0, 1fr))` }}>
              {round.chords.map((bar, i) => (
                <div className={'gym-bar' + (i === currentBar ? ' current' : '')} key={i}>
                  <span className={show ? 'chord-symbol' : 'hidden'}>
                    {show ? bar.map((c) => displaySymbol(parseChord(c.symbol))).join('  ') : '?'}
                  </span>
                  <span className="rn">{show ? bar.map((c) => formatNumeral(romanNumeral(parseChord(c.symbol), round.key).text)).join('  ') : ''}</span>
                </div>
              ))}
            </div>
            {show && <FretboardStrip chord={position?.chord ?? parseChord(round.chords[0][0].symbol)} labelMode={settings.labelMode} />}
          </div>

          <div className="card" style={{ marginTop: '0.9rem' }}>
            <div className="row" style={{ gap: '1.2rem', alignItems: 'flex-start' }}>
              <div className="field">
                <label>Mix</label>
                <div className="seg">
                  <button className={mix === 'major' ? 'active' : ''} onClick={() => setMix('major')}>Major</button>
                  <button className={mix === 'minor' ? 'active' : ''} onClick={() => setMix('minor')}>Minor</button>
                  <button className={mix === 'both' ? 'active' : ''} onClick={() => setMix('both')}>Both</button>
                </div>
              </div>
              <div className="field">
                <label>Length</label>
                <div className="seg">
                  <button className={length === 'compact' ? 'active' : ''} onClick={() => setLength('compact')}>ii V | I</button>
                  <button className={length === 'four' ? 'active' : ''} onClick={() => setLength('four')}>ii | V | I | I</button>
                  <button className={length === 'eight' ? 'active' : ''} onClick={() => setLength('eight')}>2 bars each</button>
                </div>
              </div>
              <div className="field">
                <label>Feel</label>
                <div className="seg">
                  <button className={style === 'swing' ? 'active' : ''} onClick={() => setStyle('swing')}>Swing</button>
                  <button className={style === 'bossa' ? 'active' : ''} onClick={() => setStyle('bossa')}>Bossa</button>
                </div>
              </div>
              <div className="field">
                <label>New key every</label>
                <div className="seg">
                  {[1, 2, 4].map((n) => (
                    <button key={n} className={everyChoruses === n ? 'active' : ''} onClick={() => setEveryChoruses(n)}>{n}×</button>
                  ))}
                </div>
              </div>
              <label className={'toggle' + (alwaysShow ? ' on' : '')} style={{ marginTop: '1.4rem' }}>
                <input type="checkbox" checked={alwaysShow} onChange={(e) => setAlwaysShow(e.target.checked)} /> Always show chords
              </label>
            </div>
            <div className="field" style={{ marginTop: '0.9rem' }}>
              <label>Keys included ({keys.length})</label>
              <div className="key-grid">
                {majorKeys.map((k) => {
                  const pc = pitchClass(k.tonic);
                  const on = enabledPcs.includes(pc);
                  return (
                    <button key={pc} className={'btn btn-sm' + (on ? ' active' : '')} onClick={() => setEnabledPcs((s) => (on ? s.filter((p) => p !== pc) : [...s, pc]))}>
                      {keyName(k, { unicode: true })}
                    </button>
                  );
                })}
                <button className="btn btn-sm" onClick={() => setEnabledPcs(Array.from({ length: 12 }, (_, i) => i))}>all</button>
                <button className="btn btn-sm" onClick={() => setEnabledPcs([0, 5, 10, 3, 8, 7])}>flat keys</button>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="card" style={{ marginTop: '0.9rem' }}>
              <h3>Previous rounds</h3>
              <div className="row">
                {history.map((r, i) => (
                  <span className="pill" key={i}>{keyName(r.key, { unicode: true })}{r.key.mode === 'minor' ? 'm' : ''}: {r.chords.flat().map((c) => displaySymbol(parseChord(c.symbol))).filter((s, j, a) => a.indexOf(s) === j).join(' – ')}</span>
                ))}
              </div>
            </div>
          )}
        </div>
        {showMixer && (
          <aside className="player-side">
            <Mixer />
          </aside>
        )}
      </div>

      <Transport playing={playing} loading={loading} onToggle={toggle} tempo={tempo} onTempo={setTempo} position={position} countIn={settings.countIn} onCountIn={(v) => settings.set({ countIn: v })} totalBars={round.chords.length} />
    </main>
  );
}
