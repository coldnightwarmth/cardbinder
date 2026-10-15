# Portrait artwork

User-supplied PNGs, copied byte-for-byte with URL-safe filenames. Preserve their alpha channels.

- Backgrounds: `spiral.png`, `black-ops.png`.
- Portrait-only overlays: `911.png`, `postdemon.png`, `splatter.png`, `hell.png`, `avant-garde.png`, `ss-drip.png`.

`drifmaker-portrait-art.mjs` registers the artwork and composites overlays in screen space after the character render. Preview, bookmark thumbnails, single PNG exports, and bookmark ZIPs share this path. Overlay selection is stored under `portrait.overlay`, separately from the 3D appearance; older looks default to `none`.

Randomization weights for overlays and backgrounds use the same persisted rarity settings as the wardrobe. Gallery tile inputs edit relative weights (default 100; 0 excludes a choice) and display the resulting percentage within the category.
