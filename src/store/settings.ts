import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { VoicingLevel } from '../theory/voicings';
import type { CompInstrument, InstrumentId } from '../audio/instruments';
import type { BassFeel } from '../theory/bass';

export type LabelMode = 'interval' | 'note';

export interface ChannelSettings {
  volume: number; // dB
  mute: boolean;
  solo: boolean;
}

export interface SettingsState {
  voicingLevel: VoicingLevel;
  labelMode: LabelMode;
  showRoman: boolean;
  showXray: boolean;
  showSpotlight: boolean;
  compInstrument: CompInstrument;
  countIn: boolean;
  humanize: boolean;
  feel: BassFeel;
  mixer: Record<InstrumentId, ChannelSettings>;
  tempoByTune: Record<string, number>;
  transposeByTune: Record<string, number>;
  set: (partial: Partial<Omit<SettingsState, 'set' | 'setChannel' | 'setTuneTempo' | 'setTuneTranspose'>>) => void;
  setChannel: (id: InstrumentId, partial: Partial<ChannelSettings>) => void;
  setTuneTempo: (tuneId: string, tempo: number) => void;
  setTuneTranspose: (tuneId: string, semitones: number) => void;
}

export const DEFAULT_MIXER: Record<InstrumentId, ChannelSettings> = {
  comp: { volume: -6, mute: false, solo: false },
  bass: { volume: -4, mute: false, solo: false },
  drums: { volume: -8, mute: false, solo: false },
};

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      voicingLevel: 'shell',
      labelMode: 'interval',
      showRoman: false,
      showXray: false,
      showSpotlight: true,
      compInstrument: 'guitar',
      countIn: true,
      humanize: true,
      feel: 'walking',
      mixer: DEFAULT_MIXER,
      tempoByTune: {},
      transposeByTune: {},
      set: (partial) => set(partial),
      setChannel: (id, partial) => set((s) => ({ mixer: { ...s.mixer, [id]: { ...s.mixer[id], ...partial } } })),
      setTuneTempo: (tuneId, tempo) => set((s) => ({ tempoByTune: { ...s.tempoByTune, [tuneId]: tempo } })),
      setTuneTranspose: (tuneId, semitones) => set((s) => ({ transposeByTune: { ...s.transposeByTune, [tuneId]: semitones } })),
    }),
    { name: 'jgt-settings', version: 1 },
  ),
);
