# Showroom exhibit assets

These are separate showroom assets; the source GLBs and individual card viewer are unchanged.

Regenerate from the repository's originals:

```sh
cd scripts/showroom-assets
npm ci
npm run build
```

The build uses meshoptimizer simplification and Draco compression. The gremlin's unused color/metallic/emissive images are removed because its showroom finish is matte orange. Its retained normal map is resized to 512px. The clear frame's disconnected per-face vertices are welded, simplified and given smooth normals. Card face/back textures are not resized.

| Exhibit | Original triangles | Near triangles | Far triangles | Near bytes | Far bytes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Gremlin | 695,096 | 59,984 | 9,600 | 299,228 | 62,192 |
| Dratini frame | 1,147,771 | 140,000 | 22,400 | 404,804 | 83,184 |

The showroom initially loads far assets (145,376 bytes combined). Near versions are loaded one at a time when approached, with texture upload and shader compilation using the existing frame scheduler. Detail and clear-material switches have distance hysteresis. Floor reflections temporarily use far geometry and non-transmissive clear proxies; close direct views retain their physical materials.

Measured frame times select three quality tiers after 2.5-second sampling windows, with cooldowns between changes. Reflection sizes are 256/512/1024 pixels and minimum update intervals are 100/66/33ms. The existing resolution controller remains separate. Quality changes are deferred during binder interaction and doorway crossings.

Validation: showroom tests cover adaptive quality, material restoration/disposal, and asset budgets. Browser screenshots were compared with the original GLBs at matching camera positions. The frame-facing draw reported about 299k triangles with optimized assets versus 2.31m with originals in the same setup; this is geometry workload, not an FPS benchmark. Actual Surface performance still needs testing on that device.

## Separate Drifella and Drilady collection wave

`character-collection-catalog.json` defines 20 additions in each of the twelve modeled categories **for each character** (240 + 240). `drifmaker-character-collection.mjs` is its browser catalog. Character IDs are disjoint; selecting another species never exposes these modeled parts in its picker. New head choices are fitted hair sculpts that retain the accepted species-specific face and ears. Seven full outfits per character hide, but preserve, the selected legs.

Source motifs: [Drifella 2](https://www.tensor.trade/trade/drifella_2), [Drilady](https://www.tensor.trade/trade/drilady), [CryptoPunks attributes](https://www.larvalabs.com/catalog/attributes?project=cryptopunks), and [Bored Ape Yacht Club](https://boredapeyachtclub.com/). These are independently authored character-specific adaptations. No whole collection artwork is mapped onto a mesh. Extras are scenery and objects, with no new companions or handheld gear.

Rebuild the packs separately in Blender 5.2:

```sh
python3 scripts/showroom-assets/create_character_collection_catalog.py
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/showroom-assets/build_character_collection.py -- drifella
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/showroom-assets/build_character_collection.py -- drilady
python3 scripts/showroom-assets/create_collection_portraits.py
```

Each `*-collection-wave.blend` is a separate editable source. Its GLB has 240 skinned parts, the existing 19-bone rest pose, and no duplicate animation clips. `mergeAvatarParts` binds each new pack to its character's base skeleton before cloning. The accepted source models and 49 base clips are not rebuilt.

The twelve procedural finishes, twelve baked backgrounds, and twelve transparent portrait overlays are shared across both characters. Grain is deterministic, baked into PNGs; finishes use rest-space shaders. `/exports/character-trait-review/` is a local review harness that renders all new parts, poses, finishes and portrait layers without reading or writing saved editor looks.

## Single-file portrait trait exports

The local exporter renders every character-specific trait at 1200 × 1295 in the neutral portrait frame. Run `python3 tools/trait-layers/server.py` from the repository root, open `http://localhost:8768/exports/trait-layers/`, render the samples, then export both characters. This creates separate Drifella and Drilady folders in the current user's Downloads without overwriting an existing export.

After the browser reports completion, stop the exporter server and run these commands from the repository root (Python 3 with Pillow is required):

```sh
python3 tools/trait-layers/reorganize.py --apply
python3 tools/trait-layers/collapse.py
python3 tools/trait-layers/finish.py
```

These stages run once, in order, against the paths recorded in the local `exports/trait-layers/export-status.json`. They remove invisible rear layers, merge the remaining visible rear portions into their matching fronts, combine body and tail, and create one PNG per trait or body/head preset. Head surface variants remain grouped by head; hairstyles become a separate Hair category. Replacement heads include finishes but no redundant solid-color variants. Removed and replaced outputs remain recoverable in the user's Trash.

Each finished folder includes a manifest, layering notes, validation results, and a portable `Preview.html` that assembles the PNGs without a server. Validation checks dimensions, transparency format, checksums, file references, and image decoding. The exporter never accesses editor bookmarks or browser storage. Generated images, local manifests, backup files, and reference studies are excluded from Git; the rendering and post-processing code is tracked.
