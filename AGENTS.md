# AGENTS.md

Vanilla HTML5 Canvas game. No package.json, no build step, no tests, no lint — do not look for or try to run npm scripts.

## Verify changes

Open `index.html` directly in a browser, or serve locally:

```bash
npx serve .   # http://localhost:3000
```

## Structure

Everything lives in `game.js` (one file, loaded by `index.html`): classes `Bullet`, `Asteroid`, `Ship`, `Particle` plus a module-scope `update(dt)` / `draw()` game loop. Comments and UI strings are in Spanish — keep that convention.

## Conventions you must follow when editing game.js

- **Canvas size is duplicated**: `width=800 height=600` on the `<canvas>` in `index.html` AND the `W`/`H` constants at the top of `game.js`. Changing one without the other breaks rendering; keep them in sync.
- **Toroidal space**: all movement goes through `wrap(v, max)`. Never let positions go un-wrapped.
- **Death pattern**: entities set `.dead = true`; `update()` filters arrays each frame. New entities must follow this.
- **Input**: `keys` for held state, `pressed(code)` (backed by `justPressed`) for single-shot edge detection — it consumes the flag, so call it once per frame per action. Arrows/Space are `preventDefault`-ed; add any new game key to that list.
- **Game state** is a string in the module-scope `state` var: `'playing'` / `'dead'` / `'gameover'`. `update()` early-returns per state.
- `dt` is clamped to 0.05s in `loop()`; all speeds are px/second, not px/frame.

## Known doc/code mismatch

README mentions power-ups and a "estrella fugaz" (shooting star) asteroid — **neither exists in `game.js`**. Trust the code; don't assume those features are implemented.
