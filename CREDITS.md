# Credits and licenses

## Audio

Version 1 uses **no audio samples**. All three instruments are synthesized at runtime with
[Tone.js](https://tonejs.github.io/) (MIT license):

- Comp guitar: FM pluck (`PolySynth` of `FMSynth`) through a low-pass filter and reverb
- Comp piano: FM electric-piano style `PolySynth`
- Upright bass: two-layer `MonoSynth` (filtered triangle + sine sub) with a noise "thump"
- Drums: `MetalSynth` ride, `NoiseSynth` hi-hat, brush and snare, `MembraneSynth` kick and rim

The instrument layer (`src/audio/instruments.ts`) exposes a narrow interface (`strum`, `bassNote`,
`drum`) so sampled instruments can replace the synths later. Candidate license-clean sources for
that upgrade, to be documented here when added:

- Piano: Salamander Grand Piano (CC BY 3.0)
- Bass: FreePats / Versilian Community Sample Library upright bass (check per-set license)
- Drums: open brush-kit samples or self-recorded loops

## Libraries

- React (MIT), React Router (MIT), Zustand (MIT), Tone.js (MIT), Vite (MIT), Vitest (MIT)

## Content

Chord progressions are not copyrightable and are written here from common practice. No melodies,
lyrics or reproductions of published charts appear in this repository. Lesson text, theory cards,
listening notes and tune analyses were written for this project.
