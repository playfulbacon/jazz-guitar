import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PracticeEntry {
  id: string;
  date: string; // YYYY-MM-DD
  minutes: number;
  focus: string;
  tuneId?: string;
}

export interface ProgressState {
  /** tuneId -> milestone index -> done */
  milestones: Record<string, Record<number, boolean>>;
  /** lessonId -> done */
  lessons: Record<string, boolean>;
  log: PracticeEntry[];
  toggleMilestone: (tuneId: string, index: number) => void;
  toggleLesson: (lessonId: string) => void;
  addEntry: (entry: Omit<PracticeEntry, 'id'>) => void;
  removeEntry: (id: string) => void;
  exportJson: () => string;
  importJson: (json: string) => { ok: boolean; error?: string };
  reset: () => void;
}

interface Snapshot {
  version: 1;
  milestones: ProgressState['milestones'];
  lessons: ProgressState['lessons'];
  log: PracticeEntry[];
}

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => ({
      milestones: {},
      lessons: {},
      log: [],
      toggleMilestone: (tuneId, index) =>
        set((s) => {
          const tune = { ...(s.milestones[tuneId] ?? {}) };
          tune[index] = !tune[index];
          return { milestones: { ...s.milestones, [tuneId]: tune } };
        }),
      toggleLesson: (lessonId) => set((s) => ({ lessons: { ...s.lessons, [lessonId]: !s.lessons[lessonId] } })),
      addEntry: (entry) =>
        set((s) => ({ log: [{ ...entry, id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}` }, ...s.log] })),
      removeEntry: (id) => set((s) => ({ log: s.log.filter((e) => e.id !== id) })),
      exportJson: () => {
        const { milestones, lessons, log } = get();
        const snap: Snapshot = { version: 1, milestones, lessons, log };
        return JSON.stringify(snap, null, 2);
      },
      importJson: (json) => {
        try {
          const parsed = JSON.parse(json) as Partial<Snapshot>;
          if (typeof parsed !== 'object' || parsed === null) return { ok: false, error: 'Not a JSON object' };
          const milestones = parsed.milestones && typeof parsed.milestones === 'object' ? parsed.milestones : {};
          const lessons = parsed.lessons && typeof parsed.lessons === 'object' ? parsed.lessons : {};
          const log = Array.isArray(parsed.log) ? parsed.log.filter((e) => e && typeof e.minutes === 'number' && typeof e.date === 'string') : [];
          set({ milestones, lessons, log });
          return { ok: true };
        } catch (e) {
          return { ok: false, error: (e as Error).message };
        }
      },
      reset: () => set({ milestones: {}, lessons: {}, log: [] }),
    }),
    { name: 'jgt-progress', version: 1 },
  ),
);

export function totalMinutes(log: PracticeEntry[], days?: number): number {
  const cutoff = days ? Date.now() - days * 86400000 : 0;
  return log.filter((e) => !days || new Date(e.date).getTime() >= cutoff).reduce((s, e) => s + e.minutes, 0);
}
