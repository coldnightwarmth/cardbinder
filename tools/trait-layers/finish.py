"""Validate the PNG layer packages and add a portable, file://-safe compositor."""
from pathlib import Path
from PIL import Image
import json, struct, hashlib, sys

ROOT=Path(__file__).resolve().parents[2]
state=json.loads((ROOT/'exports/trait-layers/export-status.json').read_text())
HTML='''<!doctype html><meta charset="utf-8"><title>NAME layer creator</title>
<style>body{font:14px system-ui;margin:0;background:#edf0e9;color:#22342b;display:grid;grid-template-columns:minmax(320px,1fr) 320px;height:100vh}main{display:grid;place-items:center;padding:20px;overflow:auto}canvas{max-width:100%;max-height:90vh;background:repeating-conic-gradient(#ddd 0 25%,#fff 0 50%) 0/20px 20px}aside{padding:18px;overflow:auto;background:#fff}label{display:block;margin:10px 0}select,button{width:100%;padding:7px;font:inherit}h1{font-size:18px}p{font-size:12px;line-height:1.5}#status{min-height:2em}</style>
<main><canvas width="1200" height="1295"></canvas></main><aside><h1>NAME PNG traits</h1><button id="dice">Randomize</button><label>Body color / finish<select id="surface" aria-label="Body color / finish"></select></label><div id="controls"></div><button id="download">Download PNG</button><p id="status"></p><p>One PNG per trait. Body colors also tint the original head; replacement heads retain their own colors and change only with finishes.</p></aside>
<script>const manifest=MANIFEST;
const $=s=>document.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d'),controls={},cache=new Map();let generation=0;
const choose=(select,rows,value)=>{for(const row of rows){const o=document.createElement('option');o.value=row.id;o.textContent=row.label;select.append(o)}select.value=value||rows[0].id};
choose($('#surface'),manifest.surfaces,'default');
for(const category of ['background','head','hair','ears','eyes','brows','nose','mouth','tattoo','shirt','legs','hat','accessory','extra','overlay']){const group=manifest.categories[category],label=document.createElement('label'),select=document.createElement('select');select.setAttribute('aria-label',group.label);label.append(document.createTextNode(group.label),select);$('#controls').append(label);controls[category]=select;choose(select,group.traits,category==='overlay'?'none':manifest.defaultAppearance[category]);select.onchange=render;}
const option=key=>manifest.categories[key].traits.find(r=>r.id===controls[key].value);
function image(path){if(!cache.has(path))cache.set(path,new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load '+path));img.src=path.split('/').map(encodeURIComponent).join('/')}));return cache.get(path)}
async function render(){const revision=++generation;$('#status').textContent='Rendering';try{
 const head=option('head'),top=option('shirt'),hat=option('hat'),v=$('#surface').value,body=manifest.categories.body.variants.find(r=>r.id===v),headSurface=head.variants.find(r=>r.id===v)||head.variants.find(r=>r.id==='default');
 const selections={};for(const key of Object.keys(controls))selections[key]=option(key);
 const skip=new Set();if(!head.baseHead)for(const key of manifest.rules.headReplacementsOverride)skip.add(key);if(!head.allowsEars)skip.add('ears');if(top.overridesLegs)skip.add('legs');if(hat.hidesHair)skip.add('hair');
 const items=[];for(const category of manifest.layerOrder){if(skip.has(category))continue;let file,scale=1;
  if(category==='body')file=body.file;
  else if(category==='head')file=headSurface.file;
  else {file=selections[category]?.file;if(['ears','eyes','brows','nose','mouth','tattoo','hair','hat'].includes(category))scale=head.scale;}
  if(file)items.push({img:await image(file.path),scale});
 }
 if(revision!==generation)return;ctx.clearRect(0,0,canvas.width,canvas.height);for(const {img,scale} of items){ctx.save();if(scale!==1){const p=manifest.headScalePivot;ctx.translate(p.x,p.y);ctx.scale(scale,scale);ctx.translate(-p.x,-p.y);}ctx.drawImage(img,0,0);ctx.restore();}$('#status').textContent=items.length+' aligned PNG layers';
 }catch(error){$('#status').textContent=error.message;}}
$('#surface').onchange=render;$('#dice').onclick=()=>{for(const [key,select] of Object.entries(controls)){const options=manifest.categories[key].traits;select.value=options[Math.floor(Math.random()*options.length)].id;}render();};
$('#download').onclick=()=>canvas.toBlob(blob=>{const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=manifest.character+'-layers.png';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)},'image/png');render();</script>'''

report={}
for species,folder in state['outputs'].items():
    root=Path(folder);manifest=json.loads((root/'manifest.json').read_text())
    assert manifest['completed']
    paths={}
    def walk(value):
        if isinstance(value,dict):
            if 'path' in value and 'sha256' in value:paths[value['path']]=value
            for child in value.values():walk(child)
        elif isinstance(value,list):
            for child in value:walk(child)
    walk(manifest)
    decoded=set();transparent=0;opaque=0;empty=0;stored_bytes=0
    for i,(name,meta) in enumerate(paths.items()):
        path=root/name;data=path.read_bytes()
        assert data[:8]==b'\x89PNG\r\n\x1a\n',name
        assert struct.unpack('>II',data[16:24])==(1200,1295),name
        assert data[25]==6,(name,'Expected RGBA')
        digest=hashlib.sha256(data).hexdigest();assert digest==meta['sha256'],name
        if digest not in decoded:
            with Image.open(path) as im:
                im.load();assert im.mode=='RGBA';lo,hi=im.getchannel('A').getextrema()
                if hi==0:empty+=1
                elif lo<255:transparent+=1
                else:opaque+=1
            decoded.add(digest);stored_bytes+=len(data)
        if i and i%1000==0:print(species,i,'PNG files verified',flush=True)
    actual=list(root.rglob('*.png'));assert len(actual)==len(paths),(species,len(actual),len(paths))
    embedded=json.dumps(manifest,separators=(',',':')).replace('</','<\\/')
    (root/'Preview.html').write_text(HTML.replace('NAME',species.title()).replace('MANIFEST',embedded))
    partial=root/'manifest.partial.json'
    if partial.exists():partial.unlink()
    report[species]={'pngFiles':len(paths),'uniqueImages':len(decoded),'transparentUniqueImages':transparent,'opaqueUniqueImages':opaque,'emptyUniqueImages':empty,'uniqueBytes':stored_bytes,'traitSelections':sum(len(group.get('traits',[])) for key,group in manifest['categories'].items() if key not in ['body','background','overlay']),'bodyHeadPresets':len(manifest['surfaces']),'dimensions':[1200,1295]}
    (root/'validation.json').write_text(json.dumps(report[species],indent=2)+'\n')
    print(species,'COMPLETE',json.dumps(report[species]),flush=True)
(ROOT/'exports/trait-layers/validation.json').write_text(json.dumps(report,indent=2)+'\n')
