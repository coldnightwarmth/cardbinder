# Drifella modular character wardrobe

Created in Blender 5.2 through the live local Blender MCP bridge. The original
showroom character and its source asset are preserved. This library partitions
the original joined model and adds compatible modeled wardrobe choices.

## Choices

| Category | Mesh prefix | Total choices |
| --- | --- | --- |
| Eyes | `Drif_Eyes_` | 24 |
| Mouth | `Drif_Mouth_` | 21 |
| Shirts | `Drif_Shirt_` | 25 |
| Pants / legs | `Drif_Legs_` | 21 |
| Hats | `Drif_Hat_` | 25, including none |
| Accessories | `Drif_Accessory_` | 27, including none |
| Heads | `Drif_Head_` | Classic plus 6 replacements |
| Extra | `Drif_Extra_` | 12 scenes / companions plus none |
| Tattoos | `Drif_Tattoo_` | 8 sets plus none |
| Nose | `Drif_Nose_` | Original plus 5 replacements |
| Ears | `Drif_Ears_` | Original plus 5 replacements |

`drifmaker-config.mjs` and `drifmaker-expansion.mjs` contain the full catalog and
labels. The editor also offers 37 body colors, 28 portrait backgrounds, custom
color inputs for both, and solid, translucent ghost, or reflective gold body finishes.

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

The spectral expansion adds ten choices each to eyes, mouths, shirts, legs, hats,
and accessories. This includes Venom-inspired white eyes and a toothy tongue-out
mouth, racer jackets, kimono, space suits, samurai armor, mushroom caps, jester
hats, a sheathed back sword, angel/bat/mechanical wings, and a hanging lantern.

Five alternate heads interpret the user-supplied Drifella 2 reference images:
a hooded star, dragon vortex, horned gas mask, fuzzy glitch vortex, and perforated
hockey mask. Their face is part of the head, so they override eyes, mouths, noses, ears, and tattoos.
The selected facial traits are retained and return with the classic head.

The independent Extra category adds a floating mon companion, golden aura,
ornate frame, spirit flames, orbiting planets, arcane circle, storm cloud,
floating crystals, pixel stars, shadow tendrils, spirit dragon, and floating
cards. These are actual skinned geometry and can accompany any accessory.

The signature expansion adds a silver Hayabusa-style helmet with a navy hood,
curved brow and raised scrollwork; a single gold hoop earring; a stylized machine
gun with a back sling; and a red McDonald's visor and employee polo. Eight ink
sets follow the face surface: teardrops, stars, lightning, tribal marks, rose,
runes, freckles and skull marks. Five noses and five ear pairs replace the
original nostrils and fins independently.

The Swag World hoodie uses the exact user-supplied photograph, saved unchanged
as `textures/swagworld-hoodie.png`. Tailored UVs sample the front character print,
sleeve lettering and fabric; modeled hood, drawstrings, pocket seams and ribbing
provide depth. The image is packed into both Blender and GLB, so runtime loading
does not rely on a separate texture request. The Hayabusa reference was used to
model the helmet, and is not redistributed as a texture.

## Runtime contract

- `drifella-customizable.glb` contains 182 skinned mesh objects: `Drif_Body`,
  `Drif_Ghost_Fuzz`, and one object per modeled category choice. The file includes all alternatives; runtime
  code selects exactly one choice per category and optionally no hat/accessory/extra/tattoo.
- The default leg set contains the original waist, denim, ankles and feet; the
  original mouth contains the mouth patch and two fangs. These components were
  removed from `Drif_Body`, so selected replacements never overlay duplicates.
  The muzzle and forehead dot remain in `Drif_Head_original`. Original
  fins and nostrils are separate `Drif_Ears_original` / `Drif_Nose_original`
  meshes, so their replacements remove the old geometry. Hands and the animated
  tail stay in the shared body.
- Ghost mode uses isolated skin materials with a transparent rim shader and
  luminous skinned fibers. Clothing keeps its normal opacity. Switching back to
  solid restores the original material settings, without affecting other players.
- Gold isolates and coats body, head, eyes, mouth, forehead dot, ears, nose and
  exposed original feet with a metallic material. Clothing, accessories and ink
  retain their colors. Switching finishes restores the original colors, texture
  maps and material settings. Room-environment reflections are created separately
  for the studio, thumbnails and PNG-export WebGL renderers.
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
new leg/mouth choices. `extend_drifmaker_spectral.py` builds the latest sixty
wardrobe choices, five heads, twelve extras, and ghost fibers.
`extend_drifmaker_signature.py` builds the tattoos, noses, ears, Hayabusa helmet,
earring, back prop, visor and shirts, embedding the supplied hoodie photograph.
Execute `scripts/showroom-assets/check_drifmaker.py`
afterward to validate all 456 animation frames and create the render previews.

`animation-validation.json` confirms normalized weights, no more than four
influences per vertex, finite deformations on all 10 clips, and exact preservation
of the original mesh vertices across the original component choices. The saved
previews show mixed choices in neutral, walk/hold, and crouch/hold poses, plus a
rear view of the plush backpack and expanded looks with the new legs/mouths.
All 182 meshes passed the complete 456-frame sweep after the final geometry
refinement. The final GLB also passed the runtime regression for mesh names,
normalized weights, identical bind matrices and animation tracks, and exact
original triangle coverage.

## Editor and showroom integration

The standalone editor is served at `/drifmaker` (`drifmaker/index.html`). Its
preview uses `createShowroomAvatar` and the same movement/holding blends as the
show floor. `drifmaker-config.mjs` defines the allowlisted appearance schema and
local storage; `drifmaker-avatar.mjs` applies visibility and isolated body colors.
The showroom publishes saved appearances in player poses, and its Worker
normalizes them before broadcasting. Legacy players retain the original look.
The editor has eleven trait tabs with rendered option thumbnails, plus a color
and finish tab. Appearance exports use schema version 4. Imports from versions
1–3 retain their choices and fill missing categories with original facial traits,
no tattoos, the classic head, original mouth/legs, no extra, and solid body finish. Randomize
chooses from every category and both the body and portrait background palettes.
The expanded controls and preview were checked at desktop and 390-pixel mobile
widths.

For local development, run `python3 scripts/serve-local.py --no-auth` and open
`http://localhost:8000/drifmaker/`. Focused checks are:

```sh
node --test worker/test/drifmaker.test.mjs worker/test/drifmaker-portrait.test.mjs worker/test/showroom-avatar.test.mjs
node scripts/verify-browser-runtime.mjs
```

Release the static site and the showroom Worker together: an older Worker normalizes
unknown trait IDs back to older defaults and drops new categories. This change has been verified locally, not deployed.
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

The latest browser checks cover ghost shader compilation, alternate-head facial
overrides, companion/aura/frame combinations, back accessories, both expanded
color pickers, custom background color, randomization, and native-size PNG export.
The streamlined editor keeps only controls, trait names, and essential state text.
`preview-spectral-colors.png` shows the ghost finish and expanded color controls;
`preview-spectral-portrait.png` is an actual export with a vortex head, back sword
and ornate frame.

The signature expansion passed the full 456-frame sweep across all 182 meshes.
Runtime checks also cover face-part suppression/restoration, full gold coverage,
material isolation, embedded hoodie UVs and texture, and renderer-specific
reflection cleanup on successful and failed PNG exports. Browser proof images:
`preview-signature-editor.png` (helmet and hoodie), `preview-signature-face.png`
(tattoos, heart nose, elf ears and earring), and `preview-signature-gold.png`
(actual 1200 × 1295 reflective-gold export). `preview-signature-back.png` shows
the back prop attached during the walk-and-hold animation.
