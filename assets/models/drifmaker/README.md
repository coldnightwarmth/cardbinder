# Drifella modular character wardrobe

Created in Blender 5.2 using the live local Blender MCP bridge and isolated
Blender CLI builds. Both workflows are supported; the user explicitly authorized
CLI modeling and rebuilds. The original showroom character and its source asset
are preserved. This library partitions the original joined model and adds
compatible modeled wardrobe choices.

## Choices

| Category | Mesh prefix | Total choices |
| --- | --- | --- |
| Eyes | `Drif_Eyes_` | 57 |
| Eyebrows | `Drif_Brows_` | 36, including original and none |
| Mouth | `Drif_Mouth_` | 53 |
| Shirts | `Drif_Shirt_` | 52 |
| Pants / legs | `Drif_Legs_` | 46 |
| Hats | `Drif_Hat_` | 53, including none |
| Accessories | `Drif_Accessory_` | 52, including none |
| Heads | `Drif_Head_` | 35: 32 modeled choices and 3 proportion aliases |
| Extra | `Drif_Extra_` | 38, including none |
| Tattoos | `Drif_Tattoo_` | 34, including none |
| Nose | `Drif_Nose_` | 31 |
| Ears | `Drif_Ears_` | 35 |

Counts above come from `drifmaker-config.mjs`; its imported expansion modules
contain the full catalog and labels. The editor also offers **63 body-color
choices**, **50 portrait backgrounds**, custom color inputs, and **14 finishes**:
solid, ghost, gold, silver, matte black, camo, marble, holographic, black gem,
lava, woods, mossy, pink latex, and cow hide. Some color choices select their
associated finish. Marble makes every visible trait matte white; body-only
finishes retain independent clothing and accessory colors.

## Sculpted collection study

The latest expansion adds **120 modeled traits**, ten to each of the twelve
categories, and rebuilds the previous **24 atelier ears and extras** in place
while preserving their IDs. New objects use shaped shells, cavities, integrated
folds, layered collars and pockets, bevels, inset panels, thick hardware, and
physical interlocking links. The reworked fins and extras replace applied
surface-line decoration with shaped surfaces and solid construction. Tattoos
remain intentional fitted surface artwork.

The three generator catalogs record the inspected reference for every new trait:
`sculpt-faces-catalog.json`, `sculpt-wardrobe-catalog.json`, and
`sculpt-ear-extra-catalog.json` in `scripts/showroom-assets/`. This batch was
studied from local **Drifella 2 source layers** and actual **Afella 2 collection
images**, including the ruffle harness blouse, bow blouse and high-collar
rainwear. Lower-body designs extending upper-body references are identified as
such in the catalog. These are modeled interpretations, not claims of exact
reconstruction. The earlier Little Swag World hoodie retains its supplied image.

The DJ station is lowered at the waist with shorter legs that retain floor contact.
All 21 replacement heads that use separate ears support every selected ear trait,
including pumpkin, TV, crystal, and the eight earless sculpted heads. Onyx cat
and Lilac drake keep their modeled ears.

The expansion includes a detailed DJ station, gumball machine, shield potions,
carved relics, handheld devices, new fin constructions and fitted face sculptures.
It adds no new companion creatures. Three additional head choices—Big head,
Giant head and Small head—reuse the classic head through animated bone scaling;
they do not add duplicate meshes. The earlier atelier expansion remains present
with its 144 traits, woven prints, short sleeves, and four full-body outfits.

## Earlier expansion notes

The notes below retain reference and review history from earlier batches.
The catalog table and runtime contract describe the current library.

The original shirt is the artwork hoodie and the original accessory is the
crossbody bag. The initial wardrobe took inspiration from the
[Drifella 2 collection](https://www.tensor.trade/trade/drifella_2), whose visible
trait names and sample thumbnails were inspected in Tensor on October 14, 2026.
That initial thumbnail research produced:

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
the named motif rather than claiming exact reconstruction. These initial hats
were fitted between the original fins, with headphones below and necklaces/straps
over the garments. Categories remain independently
selectable; large head proportions, replacement fins, oversized garments and
extended poses can create overlap in some combinations.

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

- `drifella-customizable.glb` contains 516 skinned mesh objects: `Drif_Body`,
  `Drif_Ghost_Fuzz`, and one object per modeled category choice. The file includes
  all alternatives; runtime
  code selects exactly one choice per category and optionally no
  hat/accessory/extra/tattoo/brows. The catalog also exposes three virtual classic
  head aliases: `bighead` (1.2×), `gianthead` (1.4×), and `smallhead` (0.76×).
  Runtime scales the animated Head bone, so facial parts and head attachments
  follow together; these aliases are not separate GLB objects.
- The default leg set contains the original waist, denim, ankles and feet; the
  original mouth contains the mouth patch and two fangs. These components were
  removed from `Drif_Body`, so selected replacements never overlay duplicates.
  The muzzle and forehead dot remain in `Drif_Head_original`. Original
  fins and nostrils are separate `Drif_Ears_original` / `Drif_Nose_original`
  meshes, so their replacements remove the old geometry. Hands and the animated
  tail stay in the shared body. The dinosaur onesie hides only the original
  Tail/TailTip-weighted body triangles (including the ivory tip), preserving its
  own costume tail. Other tops restore the original tail. The runtime uses an
  avatar-owned filtered geometry so other players and all skin weights stay intact.
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
  The current library has 32 actions: the ten locomotion clips plus 22 poses.
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

Run from the repository root. On this Mac the complete CLI rebuild is:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background \
  assets/models/showroom-character/blue-fin-character.blend \
  --python scripts/showroom-assets/build_drifmaker.py
/Applications/Blender.app/Contents/MacOS/Blender --background \
  assets/models/drifmaker/drifella-customizable.blend \
  --python scripts/showroom-assets/check_drifmaker.py
```

The first command loads the preserved original, rebuilds only the generated
`DrifmakerLibrary`, creates all 32 actions, and saves the editable blend, GLB and
manifest to this folder. The second validates the generated library and refreshes
its render previews. `ROOT` in the Python scripts is configured for this workspace;
change it when rebuilding from another checkout. An isolated CLI process does
not replace the user's open Blender scene. The live bridge remains supported:
open the original blend, inspect the active scene, then execute the same builder
and validator scripts.

The builder runs every extension in order, ending with
`extend_drifmaker_atelier.py`, `extend_drifmaker_sculpt_faces.py`,
`extend_drifmaker_sculpt_wardrobe.py`, and
`extend_drifmaker_sculpt_ears_extra.py`. The last extension also replaces the
24 existing atelier ear/extra meshes. `animate_drifmaker_poses.py` creates the
22 enter-and-hold actions while preserving the ten original locomotion actions.

The builder automatically runs `optimize_drifmaker_glb.py` after GLB export and
writes `optimization-report.json`. This is lossless buffer deduplication: it
shares identical byte payloads while retaining every buffer-view index, accessor,
geometry value, skin weight, image, animation sampler and channel. It does not
simplify geometry, quantize attributes, resample clips, or require a compression
extension. The standalone optimizer verifies equivalence before writing and
requires a new output path:

```sh
python3 scripts/showroom-assets/optimize_drifmaker_glb.py \
  assets/models/drifmaker/drifella-customizable.glb --dry-run
python3 scripts/showroom-assets/optimize_drifmaker_glb.py \
  assets/models/drifmaker/drifella-customizable.glb /tmp/drifella-optimized.glb \
  --max-bytes 52428800
```

The 50 MiB optimizer budget is a project transfer budget, not a hosting-provider
limit. The separate showroom prop build's Draco/simplification workflow does not
apply to this character library.

`check_drifmaker.py` evaluates every mesh over **1,798 frames across all 32
clips**, checks normalized weights with at most four influences per vertex,
checks finite deformations and collar fit, and compares the original ten-part
union against the original source vertices. `animation-validation.json` records
the last completed run, mesh count, clip counts and bounds; rerun it after a
rebuild rather than treating historical figures below as current results.
Runtime asset regressions additionally compare the original bind matrices,
animation tracks and source-triangle coverage. Saved previews show mixed choices
in neutral, held poses, walk/hold and crouch/hold, including rear accessories.

## Editor and showroom integration

The standalone editor is served at `/drifmaker` (`drifmaker/index.html`). Its
preview uses `createShowroomAvatar` and the same movement/holding blends as the
show floor. `drifmaker-config.mjs` defines the allowlisted appearance schema and
local storage; `drifmaker-avatar.mjs` applies visibility and isolated body colors.
The showroom publishes saved appearances in player poses, and its Worker
normalizes them before broadcasting. Legacy players retain the original look.
The editor has twelve trait tabs with rendered option thumbnails, plus a color
and finish tab. Appearance exports use schema version 6. Imports from versions
1–4 retain their choices and fill missing categories with original facial traits,
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
unknown trait IDs back to older defaults and drops new categories. The showroom Worker must include the matching appearance catalog.
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


## Held poses and encore traits

The initial ten two-second pose actions enter from the original neutral stance and settle
into a static final pose: Salute, T-pose, Deep bow, Victory, Thinking, Point,
Spellcast, Flex, Welcome and Heart hands. Twelve later poses bring the current
total to 22. `animate_drifmaker_poses.py` creates
`Pose_<id>` actions on the same 19 bones without editing the original ten clips.
`drifmaker-poses.mjs` is the shared runtime/server allowlist. Every selected part
uses that skeleton, including face variants, shirts, ears, back gear and extras.

The Drifmaker **Pose** selector plays a pose entrance and holds it indefinitely.
A locomotion button, Hold card, or selecting the empty Pose option cancels it.
In Portrait view, **Poses** enables a separate static pose selector. It samples
the final frame without advancing the studio or changing its selected motion.
The dice button randomizes this pose when enabled. Disabling Poses restores the
original collection crop and neutral stance. Enabled poses use a wider frame to
fit the arms, with the same camera direction and 1200 × 1295 output dimensions.
Look JSON version 5 additionally saves the portrait toggle, pose and background.

In the showroom, press Escape to open the menu and choose a pose. The selector
is also available with touch controls. Walking, crouching, jumping or choosing
the empty Pose option cancels it; another pose starts its new entrance. Compact
`emote` and `emoteTime` fields synchronize progress and the held endpoint with
peers, including late arrivals. Server normalization rejects unknown IDs and
bounds playback to two seconds. The local test route `/show?multiplayerLocal`
uses the Worker on port 8788, with the flag captured before URL normalization.

`extend_drifmaker_encore.py` adds three modeled choices to each of eleven trait
categories: target/flower/sleep-mask eyes; smirk/buck-teeth/whistle mouths;
cardigan/flight-jacket/sunburst tops; moon-boots/checker/ripped legs;
chef/straw/Viking hats; jetpack/shoulder-fox/camera-bag gear;
pumpkin/TV/crystal heads; butterflies/UFO/rainbow extras;
chevron/crescent/circuit tattoos; diamond/wood/metal noses; and
fox/axolotl/robot ears. Plasma purple, papaya and arctic colors expand both
palettes. That stage contained 228 skinned choices and shared components.

Validation covers all 1,066 frames across the 20 actions, preservation of the
original geometry and locomotion tracks, indefinite holds, cancellation,
static/animated pose equivalence, material isolation and network normalization.
A local two-client WebSocket check confirmed every pose, its held time,
cancellation and the new traits. The browser showroom also rendered a remote
posed avatar and broadcast the selection made in its pose menu.
`preview-poses-showroom.png` records that check.
`preview-poses-editor.png` shows the pose controls with the new flight jacket and
target eyes, and `preview-poses-portrait.png` is their actual 1200 × 1295 PNG
export. Browser checks also confirmed dice-based pose randomization, switching
poses off and on, alternate-head compatibility, and a 390-pixel mobile layout
without horizontal overflow. All 48 focused runtime tests passed.

## Custom randomization rarity

The **Rarity** button next to Randomize opens independent weights for all twelve
trait categories, body colors, body finishes, backgrounds and portrait poses.
Every option defaults to weight 100. Higher weights are more common; 0 removes
an option from dice rolls. Displayed chances normalize the weights within that
category. If all its weights are zero, randomization retains the current value.
Manual trait selection remains available regardless of a trait's weight.

Settings save locally under `cards-art:drifmaker:rarity:v1`. Only non-default
values are stored, so newly added traits retain equal default eligibility.
Exported look JSON version 6 includes rarity settings; importing older looks
leaves current rarity settings intact. Reset category / Reset all restore equal
weights without changing the current character. Pose weights apply when portrait
Poses is enabled. Face-trait visibility and Gold's fixed body color retain their
existing override behavior.

`worker/test/drifmaker-rarity.test.mjs` covers the complete catalog, weighted
selection boundaries, zero exclusion, all-off retention, portrait pose gating,
storage recovery and bounded import/export. Browser checks cover persistence,
live percentages, weighted finish/pose rolls and the mobile dialog layout.


## Eyebrows, fitted eyes and spatial extras

Twelve independently modeled brow styles take visual cues from the collection's
angular expressions, curls, graphic accents and glowing motifs: soft arches,
heavy, needle, raised, worried, slit, winged, flame, lightning, pixel, crescent and
spiral. Original red brows and No eyebrows remain available. They follow Head,
participate in rarity/randomization, save and sync to the showroom, and hide with
all other facial categories under full head replacements. Old looks default to
original brows. At that stage the library contained 228 skinned meshes and 20 actions.

Eight earlier eye styles (Crescent, Lightning, Pilot goggles, Robot, Stitched,
Target, Flower and Sleep mask) have no generic black eye-orb backing. Crescents
use an actual open mesh; graphic symbols are resized and fitted to the face;
layered robot panels and target discs preserve their depth separation. The gold
earring now pierces the original fin at its surface, above the hanging hoop.
Ghost finish applies the selected color and translucent rim treatment to all
body and facial surfaces, including fins, nose, muzzle, dot, brows and bare feet.
Clothing, tattoos, accessories and extras retain their independent materials.

The first 15 Extras were adjusted with staggered depth, individual tilts and more
clearance. Frames and aura elements sit behind the body; butterflies have folded
wings; the dragon and tendrils curve through depth. The collection camera and
export dimensions remain unchanged, so edge cropping and natural occlusion are
still possible. Large outfits and extended-arm poses can overlap nearby props.
`extra-clearance-validation.json` compares surface intersections with the classic
wardrobe at neutral and all ten held pose endpoints: 281 mesh-pair intersections
before, 10 after, and none remaining at neutral. This measures actual geometry
intersections rather than visual occlusion. Reproduce with
`check_drifmaker_extra_clearance.py` and `DRIFMAKER_BASELINE` set to the earlier
`.blend` snapshot before executing it through the bridge.

That brow/refinement revision passed the 1,066-frame Blender sweep and all 132 Drifmaker /
showroom runtime tests. Browser checks covered the eight refined eyes, new brow
thumbnails and selection, eyebrow rarity controls, full-head overrides, whole-body
ghost tint, Salute/T-pose/Deep bow, 390-pixel layout, and an actual 1200 × 1295
PNG export. `preview-brows-editor.png`, `preview-brows-ghost.png`,
`preview-brows-poses.png` and `preview-ghost-portrait.png` record those checks.
