import type { Position } from '../audio/engine';

interface Props {
  playing: boolean;
  loading: boolean;
  onToggle: () => void;
  tempo: number;
  onTempo: (bpm: number) => void;
  position: Position | null;
  countIn: boolean;
  onCountIn: (v: boolean) => void;
  /** transposition control (semitones) and the resulting key name */
  transpose?: number;
  onTranspose?: (semitones: number) => void;
  keyName?: string;
  loopLabel?: string | null;
  onClearLoop?: () => void;
  totalBars?: number;
  extra?: React.ReactNode;
}

export function Transport({ playing, loading, onToggle, tempo, onTempo, position, countIn, onCountIn, transpose, onTranspose, keyName, loopLabel, onClearLoop, totalBars, extra }: Props) {
  const beat = position?.beat ?? -1;
  return (
    <div className="transport" role="toolbar" aria-label="Playback">
      <div className="transport-inner">
        <button className={'btn play' + (playing ? '' : ' btn-primary')} onClick={onToggle} disabled={loading} aria-label={playing ? 'Stop' : 'Play'} title={playing ? 'Stop (space)' : 'Play (space)'}>
          {loading ? '…' : playing ? '■' : '▶'}
        </button>
        <div className="tempo">
          <span className="label">Tempo</span>
          <input type="range" min={40} max={260} value={tempo} onChange={(e) => onTempo(Number(e.target.value))} aria-label="Tempo" />
          <span className="bpm">{tempo}</span>
          <button className="btn btn-sm" onClick={() => onTempo(Math.max(40, tempo - 5))} aria-label="Slower">−</button>
          <button className="btn btn-sm" onClick={() => onTempo(Math.min(260, tempo + 5))} aria-label="Faster">+</button>
        </div>
        {onTranspose !== undefined && transpose !== undefined && (
          <div className="row" style={{ gap: '0.35rem' }}>
            <span className="label">Key</span>
            <button className="btn btn-sm" onClick={() => onTranspose((transpose + 11) % 12)} aria-label="Transpose down">♭</button>
            <b style={{ minWidth: '2.6rem', textAlign: 'center' }}>{keyName}</b>
            <button className="btn btn-sm" onClick={() => onTranspose((transpose + 1) % 12)} aria-label="Transpose up">♯</button>
            {transpose !== 0 && (
              <button className="btn btn-sm" onClick={() => onTranspose(0)} title="Back to the original key">reset</button>
            )}
          </div>
        )}
        <label className={'toggle' + (countIn ? ' on' : '')}>
          <input type="checkbox" checked={countIn} onChange={(e) => onCountIn(e.target.checked)} /> Count-in
        </label>
        {loopLabel !== undefined && (
          <div className="row" style={{ gap: '0.4rem' }}>
            <span className="label">Loop</span>
            {loopLabel ? (
              <>
                <span className="pill pill-cool">{loopLabel}</span>
                <button className="btn btn-sm" onClick={onClearLoop}>clear</button>
              </>
            ) : (
              <span className="dim small">tap two bars</span>
            )}
          </div>
        )}
        <div className="spacer" />
        <div className="readout">
          <span className="beat-dots" aria-hidden>
            {[0, 1, 2, 3].map((b) => (
              <i key={b} className={b === beat ? (position?.countIn ? 'countin' : 'on') : ''} />
            ))}
          </span>
          {position?.countIn ? (
            <span><b>count-in</b></span>
          ) : (
            <>
              <span>bar <b>{position ? position.barIndex + 1 : '–'}</b>{totalBars ? ` / ${totalBars}` : ''}</span>
              <span>chorus <b>{position?.chorus ?? '–'}</b></span>
            </>
          )}
        </div>
        {extra}
      </div>
    </div>
  );
}
