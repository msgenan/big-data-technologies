# Third-party material

No JavaScript libraries are vendored: the engine and motion library are plain CSS and Web Animations.

| File | Source | Version | License |
|---|---|---|---|
| `fonts/NewsreaderDeck-Medium.woff2` | Newsreader variable, google/fonts `ofl/newsreader` | commit 5bb28733 (9 Nov 2026), static instance wght 500 / opsz 72, tabular figures as default, renamed "Newsreader Deck" | SIL OFL 1.1, `fonts/OFL-Newsreader.txt` |
| `fonts/InstrumentSansDeck-Regular.woff2`, `-SemiBold.woff2` | Instrument Sans variable, google/fonts `ofl/instrumentsans` | commit 5bb28733, static instances wght 400 / 600, wdth 100, tabular figures as default, renamed "Instrument Sans Deck" | SIL OFL 1.1, `fonts/OFL-InstrumentSans.txt` |
| `fonts/ArchivoDeck*.woff2`, `fonts/AtkinsonHyperlegibleNext-*.woff2` | template fonts declared by `deck.css`, not used by this deck | google/fonts commit 5bb28733 | SIL OFL 1.1, `fonts/OFL-Archivo.txt`, `fonts/OFL-Atkinson.txt` |

None of the fonts declares a Reserved Font Name, so the renamed instances are permitted modified versions under OFL 1.1.
Instances were made with fontTools 4.60.1 (after `tools/fonts/make-static-fonts.py` in the skills repo); embedding is set to installable.

The stills and the loop in `medya/` are the team's own; `medya/derece/` holds graded copies (one shared 16-bit colour table,
light grain) and blurred crops of them, made by `araclar/derece.sh` (ImageMagick, ffmpeg).

The export tool's dependencies are pinned in `tools/deck-export/package.json` and its lockfile: playwright-core 1.63.0
(Apache-2.0, drives the system Chrome), dom-to-pptx 2.1.2 (MIT), pptxgenjs 4.0.1 (MIT), jszip 3.10.1 (MIT or GPL-3.0).
