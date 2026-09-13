# Personal site

## Edit and preview

Serve this directory with `python3 -m http.server 8767 --bind 127.0.0.1`.

- `index.html`: page shell, copy, theme switch, and page styles.
- `site.jsx`: design-system accordion and social buttons.
- `playground.js`, `drawing-scores.js`, `drawing-gestures.js`, `drawing-phrases.js`, `drawing-page-ink.js`: drawing behavior and compositions.
- `playground.css`: canvas styles.

Run `node build.mjs` after editing any JavaScript, JSX, or stylesheet, or updating the design system. It bundles all drawing modules into `assets/site.js`, copies the design-system CSS and fonts into `assets/`, and updates the script and stylesheet hashes in `index.html`.

## Build prerequisites

Use Node.js and the `../design-system` checkout with its dependencies installed and its `dist` bundle built. The build resolves React, esbuild, and `@scott/ui` from that checkout. A clean checkout of this repository alone can serve the committed output, but cannot rebuild without that sibling dependency.

## Current hosting

GitHub Pages publishes the root of `main` at https://scottlangille.com/. It serves the committed static output; no Node runtime or design-system checkout is needed on the host.

Before shipping, run `node build.mjs` and commit the resulting `index.html`, `assets/`, and `playground.css` together with the edited sources. Keep `CNAME` and `.nojekyll`. Push to `main` only when publishing is intended. No hosting migration or custom build workflow is required.

Project decisions: `/Users/scott/code/systems/ideas/personal-site.md`.
