# Third-party material in this template

No JavaScript libraries are vendored: the engine and motion library are plain CSS and Web Animations (GSAP was not
needed; every pattern is a WAAPI animation or a seekable driver).

| File | Source | Version | License |
|---|---|---|---|
| `fonts/ArchivoDeckHead.woff2` | Archivo variable, google/fonts `ofl/archivo` | commit 5bb28733 (9 Nov 2026), static instance wght 780 / wdth 75, renamed | SIL OFL 1.1, `fonts/OFL-Archivo.txt` |
| `fonts/ArchivoDeckFigure.woff2` | same master | static instance wght 820 / wdth 62, renamed | SIL OFL 1.1 |
| `fonts/AtkinsonHyperlegibleNext-Regular.woff2`, `-Bold.woff2` | Atkinson Hyperlegible Next variable, google/fonts `ofl/atkinsonhyperlegiblenext` | commit 5bb28733, static instances wght 400 / 700 | SIL OFL 1.1, `fonts/OFL-Atkinson.txt` |

Neither font declares a Reserved Font Name, so the renamed instances are permitted modified versions under OFL 1.1.
Instances were made with fontTools 4.60.1 (`tools/fonts/make-static-fonts.py`); embedding is set to installable.

The export tool's dependencies are pinned in `tools/deck-export/package.json` and its lockfile: playwright-core 1.63.0
(Apache-2.0, drives the system Chrome), dom-to-pptx 2.1.2 (MIT), pptxgenjs 4.0.1 (MIT), jszip 3.10.1 (MIT or GPL-3.0).
