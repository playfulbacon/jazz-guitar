# Jazz Guitar Trainer

A static, interactive web app for learning jazz guitar: a chord library on a complexity ladder, playable chord charts with a virtual trio (comp, walking bass, brushes), and a curriculum with progress tracking. Runs entirely in the browser and deploys to GitHub Pages.

## Features

- **Chord Library** – every quality from shells (root/3rd/7th) through drop-2 and drop-3 inversions to extended voicings. Voicings are stored as interval templates and rendered for any root, with tap-to-hear audio and a theory card per quality.
- **Chart Player** – iReal-style grid for ten standards (chords only), with play/stop, tempo (40–260), count-in, transposition to all twelve keys with correct spelling, tap-two-bars looping, chorus counter, Roman numeral view, ii–V–I x-ray, and a fretboard "chord-tone spotlight" that lights up the sounding chord's tones in real time.
- **Virtual trio** – synthesized comp guitar (or piano), walking bass generated from the changes with approach tones, and a swing/bossa/ballad drum kit; humanized timing, velocity variation, a pool of comping rhythms with anticipations, and voicing rotation. Mixer with mute/solo/volume per instrument.
- **Practice** – ii–V–I gym (random keys, major/minor mix, reveal) and a swing metronome.
- **Learn** – four-phase roadmap, listening list, per-tune analysis and drills, milestone checklists and a practice log stored in `localStorage` with JSON export/import.

## Development

```bash
npm install
npm run dev        # local dev server
npm test           # vitest: theory utilities and tune data
npm run typecheck
npm run build      # type-check + production build into dist/
```

Requires Node 22. Audio starts after the first user gesture (browser autoplay policy); Tone.js is loaded lazily at that point.

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`, which tests, builds with `BASE_PATH=/<repo-name>/`, and publishes `dist/` to GitHub Pages. Enable Pages with the **GitHub Actions** source in the repository settings once. Routing uses hash URLs so no server-side rewrites are needed.

## Adding a tune

Drop a JSON file into `src/data/tunes/`. No code changes are required; the loader picks it up and the data tests validate it (every bar must total four beats, every symbol must parse).

```json
{
  "id": "my-tune",
  "title": "My Tune",
  "defaultKey": "F",
  "form": "AABA",
  "style": "swing",
  "defaultTempo": 140,
  "sections": [
    { "label": "A", "repeat": 2, "bars": [
      { "chords": [{ "symbol": "Fmaj7", "beats": 4 }] },
      { "chords": [{ "symbol": "Gm7", "beats": 2 }, { "symbol": "C7", "beats": 2 }], "ending": 1 },
      { "chords": [{ "symbol": "Fmaj7", "beats": 4 }], "ending": 2 }
    ]},
    { "label": "B", "bars": [ { "chords": [{ "symbol": "Bb7", "beats": 4 }] } ]}
  ],
  "analysis": { "keyPairs": ["F"], "notes": "…" },
  "learning": { "phase": 2, "order": 11, "why": "…", "concepts": [], "drills": [], "listen": [], "milestones": [] }
}
```

Chord symbols accept the usual spellings (`Cmaj7`, `CΔ7`, `Am7b5`, `Aø7`, `G7alt`, `Bbdim7`, `F#-7`, `C6/9`, `C/E`, …). Styles are `swing`, `bossa` or `ballad`.

## Project layout

```
src/theory/     pure, unit-tested music theory (notes, chords, keys, form, voicings, bass lines)
src/audio/      Tone.js instruments, rhythm patterns, look-ahead scheduler, trio engine
src/data/       voicings, theory cards, tunes/*.json, curriculum, listening list
src/components/ fretboard diagrams, chord grid, transport, mixer
src/pages/      routes
src/store/      zustand stores (settings, progress, player)
```

## Content policy

Chord progressions only. No melodies, lyrics or reproductions of published lead sheets are included; progressions in the tune files are written from common practice and deliberately not copied from any book. Learn melodies by ear from the recordings on the listening list.

Sample and library licenses are listed in [CREDITS.md](CREDITS.md).
