# Forward Systems / V5 Fluid Field

A responsive, single-page, static Forward Systems site. The original black-and-cream poster layout, interactive cards, and purple/blue/orange heatmap artwork are preserved.

## Preview

Unzip and open `index.html` in Chrome or Safari. Or, for a local server, run `python3 -m http.server 8000` in the extracted folder, then visit `http://localhost:8000`.

## New in V5

Move your mouse over the large heatmap image in the splash section. The pixels now visibly warp in a local area around the cursor. Faster movements create a subtle trailing current. Stopping settles the motion, and leaving gradually restores the original image. On touch devices, drag across the hero with a finger to activate the effect. The grid and heatmap distortion are rendered directly in a WebGL shader (`hero-fluid.js`), not approximated by moving the whole image. The rest of the site keeps the monochrome-to-color toolkit animations and working flip cards.

No external libraries, fonts, or CDNs. The effect automatically falls back to the original still image if WebGL is unavailable or the OS requests reduced motion. Rendering pauses when the graphic is offscreen or the browser tab is hidden. CSS and HTML content remain unaffected.

The contact form needs Netlify hosting to accept inquiries. Local preview shows a helpful non-sending notice.
