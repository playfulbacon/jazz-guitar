import type { Tune } from '../../theory/tune';

// Adding a tune = dropping a JSON file into this folder. No code changes required.
const modules = import.meta.glob<{ default: Tune }>('./*.json', { eager: true });

export const TUNES: Tune[] = Object.values(modules)
  .map((m) => m.default)
  .sort((a, b) => (a.learning?.order ?? 99) - (b.learning?.order ?? 99) || a.title.localeCompare(b.title));

export function findTune(id: string | undefined): Tune | undefined {
  return TUNES.find((t) => t.id === id);
}
