# Drifella modular character wardrobe

Created in Blender 5.2 through the live local Blender MCP bridge. The original
showroom character and its source asset are preserved. This library partitions
the original joined model and adds compatible modeled wardrobe choices.

## Choices

| Category | Mesh IDs | Options |
| --- | --- | --- |
| Eyes | `Drif_Eyes_…` | `classic`, `sleepy`, `star`, `spiral`, `hearts`, `buttons`, `wink`, `angry`, `bored`, `tears`, `dead`, `cyclops`, `pixel`, `lashes` |
| Shirts | `Drif_Shirt_…` | `original`, `denim`, `bomber`, `jersey`, `tiedye`, `skeleton`, `cloud`, `cloak`, `suit`, `raincoat`, `puffer`, `rugby`, `armor` |
| Hats | `Drif_Hat_…` | `cap`, `beanie`, `party`, `tophat`, `wizard`, `crown`, `antlers`, `bunny`, `spinner`, `officer`, `bucket`, `horns`, `halo` (or none) |
| Accessories | `Drif_Accessory_…` | `original`, `headphones`, `necklace`, `backpack`, `scarf`, `medallion`, `wings`, `bowtie`, `satchel`, `camera`, `skateboard`, `flower`, `cassette`, `keychain` (or none) |
| Pants / legs | `Drif_Legs_…` | `original`, `denim`, `cargo`, `shorts`, `striped`, `patched`, `tech`, `skeleton`, `plush`, `boots`, `joggers` |
| Mouth | `Drif_Mouth_…` | `original`, `smile`, `sidesmile`, `fangs`, `goldgrill`, `braces`, `tongue`, `cat`, `drool`, `skull`, `grin` |

The original shirt is the artwork hoodie and the original accessory is the
crossbody bag. New pieces take inspiration from the
[Drifella 2 collection](https://www.tensor.trade/trade/drifella_2), whose visible
trait names and sample thumbnails were inspected in Tensor on October 14, 2026:

- `jean jacket`: faded blue denim, collar, flap chest pockets, buttons, seams.
- `white bomber`: off-white jacket, dark central zipper, ribbed cuffs/collar.
- `solana cap`, `doomer black beanie`, and `rainbow party hat`: dark teal cap
  with three cyan/purple bars, plain black folded-cuff beanie, rainbow cone hat.
- `sleppy`, `pixelady star`, and `spiral`: heavy lids, golden four-point star
  pupils, and white spiral eyes. The original glossy eyes remain available.
- `dark magician spiky headphones`, `pokeball necklace`, and `warlax backpack`:
  purple spiked ear cups, a loop of red/white ball beads, and a teal plush backpack.

These are new 3D interpretations of collection traits. Some thumbnails obscure
their traits, so the modeled party hat, spiral pattern, and plush backpack use
the named motif rather than claiming exact reconstruction. Hat geometry fits
between the fins, headphones sit below it, and necklaces/straps fit over all
shirts. These choices can be combined independently.

The expanded wardrobe adds ten more choices to each original category, plus ten
new complete leg sets and ten new mouth styles. New motifs combine the
collection's plush/streetwear palette with original playful designs: stitched
button eyes, wizard hats, technical trousers, skeleton patterns, toy cameras,
braces and fanged grins. These are separate modeled choices, including sleeve,
pocket, cuff, trim, zipper, face and accessory geometry.

## Runtime contract

- `drifella-customizable.glb` contains 77 skinned mesh objects: `Drif_Body` and
  one object per category choice. The file includes all alternatives; runtime
  code selects exactly one choice per category and optionally no hat/accessory.
- The default leg set contains the original waist, denim, ankles and feet; the
  original mouth contains the mouth patch and two fangs. These components were
  removed from `Drif_Body`, so selected replacements never overlay duplicates.
  The muzzle, nostrils and animated tail stay in the shared body.
- Every component uses the same 19-bone rest pose and skin. Preserve the bones,
  bind matrices, vertex weights, and original ten animation names when editing.
- `Drif_Body_Main` is the blue body material, also used by the sleepy eyelids.
  Recolor this material per character. Keep shared source materials immutable.
- `Drif_Shirt_Main`, `Drif_Hat_Main`, and `Drif_Accessory_Main` are additional
  recolorable wardrobe materials. Original texture artwork is embedded.
- Coordinate conventions match the showroom asset: Blender +Z up / -Y forward;
  glTF +Y up / +Z forward. Original height is approximately 2.84 model units;
  the wizard hat reaches approximately 3.49 units. Showroom scale/orientation
  apply normally. Exact posed bounds are in `animation-validation.json`.
- All existing actions remain present: Neutral, Walk, Hold_Right,
  Walk_Hold_Right, Crouch, Crouch_Hold_Right, Crouch_Walk,
  Crouch_Walk_Hold_Right, Jump, and Jump_Hold_Right. CardSocket.R is preserved
  (Three.js sanitizes it to CardSocketR).

`manifest.json` records categories, names, geometry counts, materials, and clips.
`drifella-customizable.blend` is editable and opens with the original look visible;
all variants are in the `DrifmakerLibrary` collection, hidden until selected.

## Rebuild and validation

Open the original `assets/models/showroom-character/blue-fin-character.blend` in
Blender, then execute `scripts/showroom-assets/build_drifmaker.py` through the
local MCP bridge. The generator replaces only its own collection and saves to
this folder. The builder loads `extend_drifmaker_wardrobe.py` for the forty new
eye/shirt/hat/accessory choices and `extend_drifmaker_legs_mouth.py` for twenty
new leg/mouth choices. Execute `scripts/showroom-assets/check_drifmaker.py`
afterward to validate all 456 animation frames and create the render previews.

`animation-validation.json` confirms normalized weights, no more than four
influences per vertex, finite deformations on all 10 clips, and exact preservation
of the original mesh vertices across the original component choices. The saved
previews show mixed choices in neutral, walk/hold, and crouch/hold poses, plus a
rear view of the plush backpack and expanded looks with the new legs/mouths.
All 77 meshes passed the complete 456-frame sweep. A subsequent bunny-headband
refinement lowered the band onto the scalp and connected both ear roots with an
arch; that rigid Head-bound mesh passed all 456 frames again. The final GLB also
passed the runtime regression for mesh names, normalized weights, identical bind
matrices and animation tracks, and exact original triangle coverage.

## Editor and showroom integration

The standalone editor is served at `/drifmaker` (`drifmaker/index.html`). Its
preview uses `createShowroomAvatar` and the same movement/holding blends as the
show floor. `drifmaker-config.mjs` defines the allowlisted appearance schema and
local storage; `drifmaker-avatar.mjs` applies visibility and isolated body colors.
The showroom publishes saved appearances in player poses, and its Worker
normalizes them before broadcasting. Legacy players retain the original look.
The editor has six wardrobe category tabs with rendered option thumbnails, plus
body colors. Appearance exports use schema version 2; importing a version 1 look
keeps its existing choices and defaults the new legs and mouth to `original`.
The expanded controls and preview were checked at desktop and 390-pixel mobile
widths.

For local development, run `python3 scripts/serve-local.py --no-auth` and open
`http://localhost:8000/drifmaker/`. Focused checks are:

```sh
node --test worker/test/drifmaker.test.mjs worker/test/showroom-avatar.test.mjs
node scripts/verify-browser-runtime.mjs
```

Release the static site and the showroom Worker together: an older Worker drops
the new appearance field. This change has been verified locally, not deployed.
`preview-editor.jpg` shows the browser editor with a mixed collection-inspired look.

## Collection portrait mode

`drifmaker-portrait.mjs` defines the shared composition used by the fixed portrait
preview and PNG export. Export dimensions are **1200 × 1295 pixels**, verified
directly from the PNG header of the original
[Drifella #8446 image](https://gateway.pinata.cloud/ipfs/bafybeickydqnfa3n2nbcihbbj5kpyudpid3yfrkxvt42qgbw7xjwfq4f7y/8446.png)
linked by its collection metadata. The source has a slightly taller-than-square
aspect ratio. Camera angle and crop are a visual match to the collection image;
the original collection camera rig and render settings are unavailable.

The portrait owns a separate avatar clone, samples the existing `Neutral` clip
at exactly time zero, and then leaves that pose frozen. Appearance changes remain
independent of the studio animation and orbit. PNG capture creates a temporary
renderer at pixel ratio 1 and clones the orthographic camera, preserving the
configured native image dimensions independently of device pixel ratio or editor
size. It exports an opaque image without editor controls or the studio floor and
releases its WebGL context after encoding, including on export failure.

Focused portrait checks use the shipped animation tracks and exercise fixed pose,
studio isolation, portrait aspect ratio, export dimensions and export cleanup:

```sh
node --test worker/test/drifmaker-portrait.test.mjs
```

Browser checks covered 390-pixel mobile and 1280-pixel desktop layouts, live
wardrobe/background updates, and restoration of studio movement/holding/orbit
settings after toggling views. Repeated captures remained byte-identical after
the studio animation advanced. `preview-portrait.png` is an actual 1200 × 1295
export; `preview-portrait-editor.jpg` shows the new controls. PNG generation and
the export preview were verified, but the desktop app's in-app browser did not
report a completed download from the Save PNG link during automated checking.
