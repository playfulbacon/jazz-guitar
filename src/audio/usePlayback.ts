/**
 * Binds the shared engine to the player store and to the persisted settings.
 */
import { useEffect, useCallback } from 'react';
import { engine, type Plan } from './engine';
import { usePlayer } from '../store/player';
import { useSettings } from '../store/settings';
import type { InstrumentId } from './instruments';

/** Pushes mixer/comp settings into the engine whenever they change. */
export function useEngineSettings(): void {
  const { voicingLevel, compInstrument, countIn, humanize, feel, mixer } = useSettings();
  useEffect(() => {
    engine.update({ voicingLevel, compInstrument, countIn, humanize, feel });
  }, [voicingLevel, compInstrument, countIn, humanize, feel]);
  useEffect(() => {
    for (const id of Object.keys(mixer) as InstrumentId[]) {
      const ch = engine.channel(id);
      if (!ch) continue;
      ch.volume.value = mixer[id].volume;
      ch.mute = mixer[id].mute;
      ch.solo = mixer[id].solo;
    }
  }, [mixer, usePlayer((s) => s.loading)]);
}

/**
 * Owns the engine for a page: installs the plan, wires position updates to the store and
 * stops playback when the page unmounts. Returns play/stop controls.
 */
export function usePlanOwner(owner: string, plan: Plan, tempo: number, onWrap?: (chorus: number) => void) {
  const set = usePlayer((s) => s.set);
  const playing = usePlayer((s) => s.playing);

  useEffect(() => {
    engine.setPlan(plan);
  }, [plan]);

  useEffect(() => {
    engine.update({ tempo });
  }, [tempo]);

  useEffect(() => {
    engine.setCallbacks({
      onPosition: (position) => set({ position }),
      onWrap: (chorus) => onWrap?.(chorus),
      onStop: () => set({ playing: false, position: null }),
    });
    set({ owner });
    return () => {
      engine.stop();
      engine.setCallbacks({});
      set({ owner: null, playing: false, position: null, loop: null, loopPending: null });
      engine.update({ loop: null });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner]);

  useEffect(() => {
    engine.setCallbacks({
      onPosition: (position) => set({ position }),
      onWrap: (chorus) => onWrap?.(chorus),
      onStop: () => set({ playing: false, position: null }),
    });
  }, [onWrap, set]);

  const play = useCallback(
    async (fromBar = 0) => {
      set({ loading: true });
      try {
        await engine.prepare();
        applyMixer();
        await engine.start(fromBar);
        set({ playing: true });
      } finally {
        set({ loading: false });
      }
    },
    [set],
  );

  const stop = useCallback(() => {
    engine.stop();
    set({ playing: false, position: null });
  }, [set]);

  const toggle = useCallback(() => (playing ? stop() : play()), [playing, play, stop]);

  return { play, stop, toggle, playing };
}

function applyMixer(): void {
  const mixer = useSettings.getState().mixer;
  for (const id of Object.keys(mixer) as InstrumentId[]) {
    const ch = engine.channel(id);
    if (!ch) continue;
    ch.volume.value = mixer[id].volume;
    ch.mute = mixer[id].mute;
    ch.solo = mixer[id].solo;
  }
}
