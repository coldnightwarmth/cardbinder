# Mi Note Card Studio

Static browser editor served at `/minotecurator/`. The separate local studio is unchanged.

Edits are stored per browser under `cards.art:minote-studio:edits:v1`. Back up/import transfers edits between browsers. `initial-edits.json` supplies the starting layouts. No server, login, or editor sync is needed. Concurrent tabs use revision checks and Web Locks where available.

Artwork is WebP, capped at 2000 × 2800 without stretching. Gallery thumbnails are 420 pixels wide; trimmed name art is lossless WebP. Exports are 2000 × 2800 PNG.

Run checks with `node --test worker/test/minote-*.test.mjs` from the repository root.
