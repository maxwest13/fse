# Forward Systems / V6 Industrial Process

This update is built directly from V5, with the existing responsive layout, heatmap WebGL effect, custom toolkit graphics, flip cards, and contact dialog preserved.

## What changed

- Rebuilt the four-step process in a 2x2 industrial editorial grid, with a single column on phones.
- Replaced the process icons with oversized 01 / 02 / 03 / 04 numerals, bigger condensed headings, and fully visible body copy.
- Updated the splash index and process titles to Instrument / Diagnose / Engineer / Iterate.
- Added subtle grid textures and restrained violet highlights on hover.
- Removed the obsolete process accordion. Copy and layout reflect the approved language exactly.

## Preview

Open `index.html` in Chrome or Edge, or use a local server such as `python -m http.server 8000`.

## GitHub Pages

Push the modified `index.html`, `styles.css`, `script.js`, and `README.md` files to the existing `main` branch. No special dependencies or build steps. The contact form still needs a form service; GitHub Pages serves static files only.


## V7: color-current hero + outlined numerals
The hero is no longer just a still image distorted by the pointer. `hero-fluid.js` renders a WebGL color field driven by cursor position, direction and velocity. The field's UV currents advect the colored pixels, while a fine stationary grid floats above it. A separate `assets/heatmap-field.webp` is the color-only texture; `assets/heatmap-hero.webp` remains the fallback.

Hover and move across the hero to generate a curl/wake, then stop to watch the flow settle. On mobile you can touch-drag. Under reduced-motion preferences, the original static image remains visible. When WebGL is unavailable, a lower-resolution 2D canvas current runs instead, with the original image remaining as a fallback if neither canvas renderer can start.

Process numbers 01–04 are now outlined instead of filled, while the 2x2 V6 process copy stays intact.

GitHub Pages works without a build step. Contact form submissions still require a backend.
