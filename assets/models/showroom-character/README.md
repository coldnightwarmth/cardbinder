# Blue fin character — low-poly rigged model

Created from the supplied character turnaround and material sheet. The hoodie artwork and fabric, denim, and bag texture regions are mapped from `material-atlas.png`. Face, fins, muzzle, brows, eye glints, white tips, and accessories are modeled geometry.

## Files

- `blue-fin-character.blend`: editable Blender 5.2 scene, one weighted character mesh, skeleton, packed image, animation actions, and preview studio.
- `blue-fin-character.glb`: web-ready skinned model with embedded texture and all four animations.
- `preview.html`: standalone interactive Three.js viewer. Open through the local web server, not file://.
- `preview-neutral.png` / `preview-walk-hold.png`: rendered pose previews.
- `model-info.json` / `animation-validation.json`: geometry and deformation validation.

## Animation clips

| Clip | Duration | Behavior |
| --- | --- | --- |
| Neutral | 2 seconds | Arms at sides, subtle breathing and tail motion |
| Walk | 1 second | In-place walking loop, alternating leg and arm motion |
| Hold_Right | 2 seconds | Right arm extended forward, breathing and tail motion |
| Walk_Hold_Right | 1 second | Walking with the right hand held forward |

All clips loop. Walking has no forward root travel: the game moves the avatar. Blend between clips when the player's movement or held-card state changes. The preview includes a simple optional card to demonstrate attachment; it is not baked into the model.

## Rig and coordinates

19 bones including `Root`, `Pelvis`, `Chest`, `Head`, separate upper arms/forearms/hands, thighs/shins/feet, two tail bones, and `CardSocket.R`. Skin weights are assigned and normalized, with blended influence at sleeve elbows, knees, torso, and tail. The saved mesh's vertex groups remain editable with Blender's Weight Paint tools. The rig uses keyed FK poses, not an animator-facing IK control rig.

Blender: +Z up, -Y forward; character right is -X. GLB: +Y up, +Z forward. Blender bone `CardSocket.R` becomes `CardSocketR` in Three.js's sanitized object names. Attach card objects to that node (with their local offset/orientation adjusted for the card model). The showroom now uses this model for remote players through `showroom-avatar.js`. Each player owns its skeleton and animation mixer while sharing geometry and textures. Movement selects idle/walk, shared hand ownership selects the holding variants, and cards track the hand socket. The character is scaled to 60% and rotated to match the camera-facing convention.

7,756 triangles, 4,004 source vertices, 19 bones, one embedded texture, 13 exported material primitives. Blender validated normalized weights, finite deformations, closed animation loops, and grounded supporting feet at every keyed frame. The GLB was loaded in Three.js and all four clips and the card attachment were checked in-browser.

## Rebuild

`scripts/character-model/build_character.py` builds and exports the character in Blender through the local MCP bridge. `check_and_render.py` validates the animations and renders the pose previews. The generator replaces only its own named character collection; original scene objects are preserved and hidden in the dedicated modeling window.

Revision 2: bag turned 72 degrees around the left hip under the arm with reshaped strap; fins swept back 20 degrees; back of the cranium deepened by 34%; raised denim pocket stitching and hoodie pocket outline removed. Slight left-arm clearance adjustment preserves bag clearance during the animation clips.

Revision 3: bag moved farther behind the left hip and turned to 100 degrees (mostly side-facing, slightly rearward). Removed the left-arm clearance offset so both arms rest symmetrically, accepting some bag contact as requested.
