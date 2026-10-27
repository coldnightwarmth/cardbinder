"""Flatten single-PNG traits and omit rear layers hidden in the neutral portrait."""
from pathlib import Path
from PIL import Image, ImageChops
from functools import lru_cache
import datetime, json, shutil, sys

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / 'exports/trait-layers/export-status.json'
state = json.loads(STATE.read_text())
apply = '--apply' in sys.argv
backup = Path.home() / '.Trash' / ('Drifmaker hidden rear layers ' + datetime.datetime.now().strftime('%Y-%m-%d %H-%M-%S'))
reports = {}

for species, folder in state['outputs'].items():
    root = Path(folder)
    manifest = json.loads((root / 'manifest.json').read_text())
    order = manifest['layerOrder']
    body = next(v for v in manifest['categories']['body']['variants'] if v['id'] == 'default')
    heads = {h['id']: h for h in manifest['categories']['head']['traits']}

    @lru_cache(maxsize=12)
    def alpha(path):
        with Image.open(root / path) as image:
            return image.getchannel('A')

    removals = []
    candidates = []
    for category, group in manifest['categories'].items():
        for trait in group.get('traits', []):
            pair = trait.get('hair') if category == 'head' else trait
            if not pair or not pair.get('back'):
                continue
            candidates.append((category, trait, pair))

    for category, trait, pair in candidates:
        slot = 'head.hair.back' if category == 'head' else category + '.back'
        rear = pair['back']
        reason = 'unused by the portrait layer order'
        maximum = pixels = 0
        if slot in order:
            start = order.index(slot)
            remaining = alpha(rear['path']).copy()
            head = heads.get(trait.get('surfaceFrom', trait['id'])) if category == 'head' else heads['original']
            surface = next(v for v in head['variants'] if v['id'] == 'default')
            blockers = {'body.torso': body['torso'], 'body.tail': body['tail'], 'head.surface': surface['file']}
            if pair.get('front'):
                blockers[slot.replace('.back', '.front')] = pair['front']
            # Optional clothing/gear never count as blockers: they can be changed.
            for following in order[start + 1:]:
                if following in blockers:
                    remaining = ImageChops.multiply(remaining, ImageChops.invert(alpha(blockers[following]['path'])))
            maximum = remaining.getextrema()[1]
            pixels = sum(remaining.histogram()[1:])
            reason = 'fully hidden by the neutral base silhouette and matching front layer'
        if maximum == 0:
            removals.append({'path': rear['path'], 'reason': reason})
            pair['back'] = None

    report = {'removedBackLayers': len(removals), 'retainedBackLayers': len(candidates) - len(removals), 'removals': removals}
    if apply:
        saved = backup / root.name
        saved.mkdir(parents=True)
        for name in ['manifest.json', 'README.txt', 'Preview.html', 'validation.json']:
            if (root / name).exists():
                shutil.copy2(root / name, saved / name)
        for item in removals:
            source = root / item['path']; target = saved / item['path']
            target.parent.mkdir(parents=True, exist_ok=True)
            source.rename(target)

        paths = {}
        # Bottom-up: Hair/front.png -> Hair.png; a one-file trait -> Category/Trait.png.
        directories = sorted((p for p in root.rglob('*') if p.is_dir()), key=lambda p: len(p.parts), reverse=True)
        for directory in directories:
            if len(directory.relative_to(root).parts) < 2:
                continue
            entries = list(directory.iterdir())
            if len(entries) != 1 or not entries[0].is_file() or entries[0].suffix.lower() != '.png':
                continue
            source = entries[0]; target = directory.with_suffix('.png')
            if target.exists():
                raise RuntimeError('Refusing to overwrite ' + str(target))
            old, new = source.relative_to(root).as_posix(), target.relative_to(root).as_posix()
            source.rename(target); directory.rmdir()
            for original, current in list(paths.items()):
                if current == old:
                    paths[original] = new
            paths[old] = new

        def update(value):
            if isinstance(value, dict):
                if value.get('path') in paths:
                    value['path'] = paths[value['path']]
                for child in value.values(): update(child)
            elif isinstance(value, list):
                for child in value: update(child)
        update(manifest)
        manifest['version'] = 3
        manifest['rules']['singlePartTraits'] = 'Single-PNG traits live directly in their category folder. Multi-part and surface-variant traits retain folders.'
        manifest['rules']['rearLayerPruning'] = 'Rear layers unused by layerOrder or fully hidden in the neutral original-head portrait were omitted. Transparent finishes and smaller replacement heads may reveal different areas than the 3D editor.'
        (root / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')))
        readme = (root / 'README.txt').read_text()
        readme = readme.replace('their own Hair/front.png and Hair/back.png', 'their own hair layers (see manifest.json for paths)')
        readme = readme.replace('Use each selected trait\'s matching front.png/back.png pair; not every piece needs a back file.', 'Single-PNG traits are named directly inside their category folder. Traits with multiple parts or surface variants keep their own folders. Use the manifest paths for matching front/back files.')
        readme += '\nRear layers unused by the portrait layer order or fully hidden by the neutral base silhouette and matching front layer have been omitted. No optional clothing or gear was used to hide a rear layer during this check. Transparent finishes and smaller heads may reveal areas differently from the 3D editor.\n'
        (root / 'README.txt').write_text(readme)
        report['renamedPaths'] = paths
        report['pngFiles'] = sum(1 for _ in root.rglob('*.png'))
        report['directCategoryTraitPNGs'] = sum(1 for p in root.glob('*/*.png') if not p.parent.name.startswith(('01 ', '16 ')))
    reports[species] = report
    print(species, {k: v for k, v in report.items() if k not in ['removals', 'renamedPaths']}, flush=True)

(ROOT / 'exports/trait-layers/reorganize-plan.json').write_text(json.dumps(reports, indent=2))
if apply:
    state['files'] = sum(r['pngFiles'] for r in reports.values())
    state['removedHiddenBackLayers'] = sum(r['removedBackLayers'] for r in reports.values())
    STATE.write_text(json.dumps(state, indent=2) + '\n')
    print('Recoverable originals:', backup, flush=True)
