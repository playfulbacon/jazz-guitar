import { create } from 'zustand';
import type { Position } from '../audio/engine';

export interface LoopRegion {
  /** chart bar ids (what the user tapped) */
  startChartId: number;
  endChartId: number;
  /** play-bar indexes fed to the engine */
  start: number;
  end: number;
}

export interface PlayerState {
  /** which plan owner is currently bound to the engine, e.g. "tune:autumn-leaves" or "gym" */
  owner: string | null;
  playing: boolean;
  loading: boolean;
  position: Position | null;
  loop: LoopRegion | null;
  /** first tap of a loop selection, waiting for the second */
  loopPending: number | null;
  set: (partial: Partial<Omit<PlayerState, 'set'>>) => void;
}

export const usePlayer = create<PlayerState>()((set) => ({
  owner: null,
  playing: false,
  loading: false,
  position: null,
  loop: null,
  loopPending: null,
  set: (partial) => set(partial),
}));
