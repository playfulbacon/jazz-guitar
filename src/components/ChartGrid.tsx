/**
 * iReal-style chord grid: four bars per row, section labels, repeats and endings,
 * with optional Roman numerals and the ii–V–I "x-ray" brackets.
 */
import { useMemo } from 'react';
import type { Tune } from '../theory/tune';
import { chartBars, chartChords } from '../theory/tune';
import { analyzeProgression, parseKey, formatNumeral, type Cadence } from '../theory/keys';
import { displaySymbol } from '../theory/chords';

interface Props {
  tune: Tune;
  showRoman: boolean;
  showXray: boolean;
  currentChartId: number | null;
  currentSlot: number;
  loop: { startChartId: number; endChartId: number } | null;
  loopPending: number | null;
  onBarTap: (chartId: number) => void;
}

export const CADENCE_LEGEND: { type: Cadence['type']; label: string }[] = [
  { type: 'major251', label: 'major ii–V–I / V–I' },
  { type: 'minor251', label: 'minor ii–V–i' },
  { type: 'ii-V', label: 'ii–V (unresolved)' },
  { type: 'secondary', label: 'secondary dominant' },
];

export function ChartGrid({ tune, showRoman, showXray, currentChartId, currentSlot, loop, loopPending, onBarTap }: Props) {
  const bars = useMemo(() => chartBars(tune), [tune]);
  const analysis = useMemo(() => {
    const chords = chartChords(tune);
    const { chords: analyzed, cadences } = analyzeProgression(chords.map((c) => c.chord), parseKey(tune.defaultKey));
    // index cadences by chord position
    const byIndex = new Map<number, { cadence: Cadence; start: boolean; end: boolean }>();
    cadences.forEach((cad) => {
      for (let i = cad.start; i <= cad.end; i++) if (!byIndex.has(i)) byIndex.set(i, { cadence: cad, start: i === cad.start, end: i === cad.end });
    });
    const perBar = new Map<number, { numeral: string; fn?: string; cad?: { cadence: Cadence; start: boolean; end: boolean } }[]>();
    chords.forEach((c, i) => {
      const list = perBar.get(c.chartId) ?? [];
      list.push({ numeral: analyzed[i].numeral.text, fn: analyzed[i].functionLabel, cad: byIndex.get(i) });
      perBar.set(c.chartId, list);
    });
    return perBar;
  }, [tune]);

  const sections = useMemo(() => {
    const out: { label: string; bars: typeof bars }[] = [];
    for (const b of bars) {
      if (b.isSectionStart) out.push({ label: b.sectionLabel, bars: [] });
      out[out.length - 1].bars.push(b);
    }
    return out;
  }, [bars]);

  const inLoop = (id: number) => loop !== null && id >= loop.startChartId && id <= loop.endChartId;

  return (
    <div className="chart" role="grid" aria-label={`${tune.title} chord chart`}>
      {sections.map((section, si) => (
        <div className="chart-section" key={si}>
          <div className="chart-section-label">{section.label}</div>
          <div className="chart-rows">
            {section.bars.map((bar, bi) => {
              const prev = section.bars[bi - 1];
              const endingCont = bar.ending !== undefined && prev?.ending === bar.ending;
              const cls = ['bar'];
              if (bar.id === currentChartId) cls.push('current');
              if (inLoop(bar.id)) cls.push('in-loop');
              if (loopPending === bar.id) cls.push('loop-pending');
              if (bar.repeatOpen) cls.push('repeat-open');
              if (bar.repeatClose) cls.push('repeat-close');
              const info = analysis.get(bar.id) ?? [];
              return (
                <div key={bar.id} className={cls.join(' ')} onClick={() => onBarTap(bar.id)} role="gridcell" aria-label={`Bar ${bar.id + 1}`}>
                  {bar.ending !== undefined && <div className={'ending' + (endingCont ? ' cont' : '')}>{endingCont ? '' : `${bar.ending}.`}</div>}
                  {bar.repeatOpen && <div className="repeat-dots left">:</div>}
                  {bar.repeatClose && <div className="repeat-dots right">:</div>}
                  <div className="bar-chords">
                    {bar.chords.map((c, ci) => {
                      const a = info[ci];
                      const sounding = bar.id === currentChartId && ci === currentSlot;
                      const cad = showXray ? a?.cad : undefined;
                      return (
                        <div className="bar-chord" key={ci} style={{ flexGrow: c.beats }}>
                          <span className={'sym chord-symbol' + (showRoman ? ' roman' : '') + (sounding ? ' sounding' : '')}>
                            {showRoman ? formatNumeral(a?.numeral ?? '') : displaySymbol(c.chord)}
                          </span>
                          {showRoman && a?.fn && <span className="fn">{formatNumeral(a.fn)}</span>}
                          {showXray && (
                            <span
                              key={cad ? `cad-${cad.cadence.type}` : 'none'}
                              className={'cadence' + (cad ? ` cad-${cad.cadence.type}` + (cad.start ? ' start' : '') + (cad.end ? ' end' : '') : ' none')}
                              title={cad?.cadence.label}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <span className="bar-num">{bar.id + 1}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {showXray && (
        <div className="xray-legend">
          {CADENCE_LEGEND.map((l) => (
            <span key={l.type} className={`cad-${l.type}`}>
              {l.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
