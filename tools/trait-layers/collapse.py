"""Produce one PNG per trait/preset, with no separate front, back, or tail files."""
from pathlib import Path
from PIL import Image, ImageChops
from functools import lru_cache
import copy, datetime, hashlib, io, json, os, re, shutil

ROOT = Path(__file__).resolve().parents[2]
STATE = ROOT / 'exports/trait-layers/export-status.json'
state = json.loads(STATE.read_text())
stamp = datetime.datetime.now().strftime('%Y-%m-%d %H-%M-%S')
staging = Path.home() / 'Downloads' / ('.drifmaker-single-file-staging-' + stamp)
backup = Path.home() / '.Trash' / ('Drifmaker multipart originals ' + stamp)
staging.mkdir(exist_ok=False)
digests = {}
reports = {}
slug = lambda s: re.sub(r'[^a-zA-Z0-9]+', '-', s).strip('-')
trait_name = lambda row: slug(row['label']) + '--' + row['id']

for species, folder in state['outputs'].items():
    source = Path(folder)
    output = staging / source.name
    output.mkdir()
    old = json.loads((source / 'manifest.json').read_text())
    assert old['version'] == 3, 'Expected the reorganized multipart package'
    manifest = copy.deepcopy(old)
    order = old['layerOrder']
    body = next(v for v in old['categories']['body']['variants'] if v['id'] == 'default')
    heads = {h['id']: h for h in old['categories']['head']['traits']}
    count = merged = 0

    @lru_cache(maxsize=12)
    def read(path):
        with Image.open(source / path) as image:
            assert image.size == (1200, 1295) and image.mode == 'RGBA', path
            return image.copy()

    def save(image, path):
        global count
        buffer = io.BytesIO()
        image.save(buffer, format='PNG', compress_level=6)
        data = buffer.getvalue()
        digest = hashlib.sha256(data).hexdigest()
        destination = output / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        if digest in digests:
            os.link(digests[digest], destination)
        else:
            destination.write_bytes(data)
            digests[digest] = destination
        count += 1
        return {'path': path, 'sha256': digest, 'visiblePixels': sum(image.getchannel('A').histogram()[1:])}

    def keep(meta, path):
        global count
        destination = output / path
        destination.parent.mkdir(parents=True, exist_ok=True)
        os.link(source / meta['path'], destination)
        digests.setdefault(meta['sha256'], destination)
        count += 1
        return {**meta, 'path': path}

    def collapse(pair, category, head=None):
        global merged
        front = read(pair['front']['path'])
        if not pair.get('back'):
            return front
        rear = read(pair['back']['path']).copy()
        slot = 'head.hair.back' if category == 'head' else category + '.back'
        if slot not in order:
            return front
        # Keep visible rear edges, but do not paint formerly occluded geometry over
        # the face when the entire trait is now a single layer above the head.
        selected_head = head or heads['original']
        if selected_head.get('surfaceFrom'):
            selected_head = heads[selected_head['surfaceFrom']]
        surface = next(v for v in selected_head['variants'] if v['id'] == 'default')
        blockers = {'body.tail': body['tail'], 'body.torso': body['torso'], 'head.surface': surface['file']}
        alpha = rear.getchannel('A')
        for following in order[order.index(slot) + 1:]:
            if following in blockers:
                alpha = ImageChops.multiply(alpha, ImageChops.invert(read(blockers[following]['path']).getchannel('A')))
        rear.putalpha(alpha)
        merged += 1
        return Image.alpha_composite(rear, front)

    body_rows = []
    for row in old['categories']['body']['variants']:
        image = Image.alpha_composite(read(row['tail']['path']), read(row['torso']['path']))
        path = '03 Base Body/' + Path(row['torso']['path']).name
        body_rows.append({**{k: v for k, v in row.items() if k not in ['torso', 'tail']}, 'file': save(image, path)})
    manifest['categories']['body'] = {'label': 'Base Body', 'variants': body_rows}

    head_rows, hair_rows = [], []
    hair_rows.append({'id': 'none', 'label': 'No hair', 'empty': True, 'file': save(Image.new('RGBA', (1200, 1295)), '13 Hair/No-hair--none.png')})
    for row in old['categories']['head']['traits']:
        if row['variants']:
            new = {k: v for k, v in row.items() if k not in ['hair', 'surfaceFrom']}
            new['variants'] = [{**v, 'file': keep(v['file'], '06 Heads/' + trait_name(row) + '/' + Path(v['file']['path']).name)} for v in row['variants']]
            head_rows.append(new)
        if row.get('hair'):
            hair = {'id': row['id'], 'label': 'Original hair' if row['id'] == 'original' else row['label']}
            path = '13 Hair/' + trait_name(hair) + '.png'
            hair['file'] = save(collapse(row['hair'], 'head', row), path)
            hair['empty'] = hair['file']['visiblePixels'] == 0
            hair_rows.append(hair)
    manifest['categories']['head'] = {'label': 'Heads', 'traits': head_rows}
    manifest['categories']['hair'] = {'label': 'Hair', 'traits': hair_rows}
    manifest['defaultAppearance']['hair'] = 'original' if any(r['id'] == 'original' for r in hair_rows) else 'none'

    for category, group in old['categories'].items():
        if category in ['body', 'head']:
            continue
        rows = []
        for row in group['traits']:
            new = {k: v for k, v in row.items() if k not in ['front', 'back']}
            if row.get('file'):
                new['file'] = keep(row['file'], row['file']['path'])
            else:
                directory = Path(row['front']['path']).parts[0]
                path = directory + '/' + trait_name(row) + '.png'
                if row.get('back'):
                    new['file'] = save(collapse(row, category), path)
                else:
                    new['file'] = keep(row['front'], path)
                new['empty'] = new['file']['visiblePixels'] == 0
            rows.append(new)
        manifest['categories'][category] = {'label': group['label'], 'traits': rows}

    manifest['version'] = 4
    manifest['layerOrder'] = ['background', 'body', 'legs', 'shirt', 'head', 'ears', 'tattoo', 'eyes', 'brows', 'nose', 'mouth', 'hair', 'hat', 'accessory', 'extra', 'overlay']
    manifest['rules'] = {
        'allPNGsSameCanvas': True, 'noCroppingOrAutoCentering': True,
        'singleFileTraits': True, 'bodyIncludesTail': True,
        'headReplacementsOverride': ['eyes', 'brows', 'mouth', 'nose', 'tattoo', 'hair'],
        'fullLengthTopsOverride': 'legs', 'finishScope': 'body and head only',
        'solidColorScope': 'body and base heads only; replacement heads keep their authored colors',
        'headScale': 'Base head size variants are pre-scaled. Preview scales face, ear, hair and hat layers around headScalePivot.',
        'composition': 'One PNG per trait or surface preset. Rear portions were merged; portions hidden by the neutral body/head silhouette were clipped before merging. No rear layers are required.'
    }
    (output / 'manifest.json').write_text(json.dumps(manifest, separators=(',', ':')))
    (output / 'README.txt').write_text(f'''{species.upper()} SINGLE-FILE TRAITS

Every PNG is 1200 x 1295 RGBA with the original portrait alignment. Keep the full canvas: do not trim, crop, auto-center or resize individual pieces.

Each trait is one PNG. There are no separate front, back, torso, or tail layers. Traits sit directly inside their category folder; heads with color/finish presets keep those individual PNGs grouped by head name.

Base Body includes torso and tail. Hair is a separate category with one PNG per hairstyle. Original heads have body-color and finish variants; replacement heads have their default appearance and finish variants. Clothes and other traits retain their original materials.

For a simple stack, use: background, body, legs, top, head, ears, tattoos, eyes, eyebrows, nose, mouth, hair, hat, gear, extra, overlay. Preview.html assembles these PNGs for you and can download a completed portrait.

Choose one PNG per category (plus the preferred body/head preset). Full replacement heads already include a face; the preview omits separate face traits and hair for those heads. Full-length tops override legs in the preview. These are static neutral portrait layers, so some overlaps with alternate head sizes or transparent finishes differ from the 3D editor.

manifest.json describes every trait and its single file. No browser bookmarks or editor storage were changed.
''')
    reports[species] = {'pngFiles': count, 'mergedPairs': merged, 'bodyPresets': len(body_rows), 'headTraits': len(head_rows), 'hairTraits': len(hair_rows)}
    print(species, reports[species], flush=True)

# Check every reference before replacing either published Downloads folder.
for species, folder in state['outputs'].items():
    output = staging / Path(folder).name
    manifest = json.loads((output / 'manifest.json').read_text())
    referenced = set()
    def verify(value):
        if isinstance(value, dict):
            assert 'front' not in value and 'back' not in value and 'torso' not in value and 'tail' not in value
            if 'path' in value and 'sha256' in value:
                path = output / value['path']
                assert path.is_file(), path
                assert hashlib.sha256(path.read_bytes()).hexdigest() == value['sha256'], path
                referenced.add(value['path'])
            for child in value.values(): verify(child)
        elif isinstance(value, list):
            for child in value: verify(child)
    verify(manifest)
    actual = {p.relative_to(output).as_posix() for p in output.rglob('*.png')}
    assert actual == referenced

backup.mkdir(parents=True, exist_ok=False)
for species, folder in state['outputs'].items():
    source = Path(folder)
    source.rename(backup / source.name)
    (staging / source.name).rename(source)
staging.rmdir()
state['files'] = sum(r['pngFiles'] for r in reports.values())
state['singleFileTraits'] = True
STATE.write_text(json.dumps(state, indent=2) + '\n')
(ROOT / 'exports/trait-layers/single-file-report.json').write_text(json.dumps({'characters': reports, 'backup': str(backup)}, indent=2) + '\n')
print('Single-file packages installed. Recoverable originals:', backup, flush=True)
