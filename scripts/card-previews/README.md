# Card preview build

This pipeline produces one 260px-wide WebP tier for binder thumbnails and other
small card surfaces. Expanded cards and downloads continue to use the originals.
Preview calls above 260px deliberately return the original URL.

```sh
cd scripts/card-previews
npm ci
npm run build
npm run check
npm test
```

The build reads card images through bounded `git cat-file --batch` pipes, including
images excluded by sparse checkout. It does not restore the original artwork to
disk or access third-party hosting. Commit newly added original images before
rebuilding. `CARD_PREVIEW_REF` chooses a Git revision (default `HEAD`), and
`CARD_PREVIEW_WORKERS` controls simultaneous conversions (default 4, maximum 8).
`CARD_PREVIEW_LIMIT` is available for temporary sample builds; it intentionally
writes a partial index and must not be used for the final production build.

Each output name includes the source Git blob hash, conversion settings/version,
and sprite layout through a SHA-256 digest. Output names therefore change when the
source or conversion rules change. Increment the version in `build.mjs` if the
encoder or conversion behavior changes. Original query strings are matched
exactly so unbuilt future artwork revisions safely keep using their originals.

The tiny `card-preview-index.mjs` maps source directories to content-hashed
manifests. Each manifest is fetched only when its folder is first needed (usually
at most 1,000 cards). No card catalog is fetched to resolve a preview. A failed or
timed-out manifest, unavailable image, unlisted source, external URL, or larger
requested resolution falls back to the original image.

Color/alpha aspect ratios are preserved, with quality 85 and full alpha quality.
Animated sprite sheets retain exactly the same frame count and grid. Each frame
is resized separately before recomposition to prevent filtering across adjacent
frames. Original frame timings remain owned by the card catalog. Actual animated
WebP files are never silently converted to static images. Sources that cannot be
decoded are reported in `assets/card-previews/metrics.json` and excluded from the
index, retaining the original behavior.

`npm run check` fully decodes every generated image and checks its dimensions, all source manifests,
the index, and collection counts against the selected Git revision. It also
verifies that previously skipped originals are still the same Git blobs.

## Avatar atlas

`npm run avatar` converts only the embedded avatar PNG to lossless WebP. It checks
decoded RGBA equality and every geometry/animation buffer before writing. The
GLB retains its materials, UVs, normals, skeletons, skin weights, and all animation
clips. The build is idempotent; it skips an already optimized GLB. The Three.js
loader supports `EXT_texture_webp`; other image assets already require WebP.
