"""Local-only sink for aligned Three.js trait layers. No editor storage access."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse, parse_qs
from datetime import datetime
import hashlib, json, os, struct, threading

ROOT=Path(__file__).resolve().parents[2]
DOWNLOADS=Path.home()/'Downloads'
PORT=8768
OUT={}
for species in ('drifella','drilady'):
    path=DOWNLOADS/(species.title()+' Traits')
    if path.exists(): path=DOWNLOADS/(species.title()+' Traits '+datetime.now().strftime('%Y-%m-%d %H-%M-%S'))
    path.mkdir()
    OUT[species]=path
STATE={'files':0,'bytes':0,'deduplicated':0,'outputs':{k:str(v) for k,v in OUT.items()},'last':None}
HASHES={}
LOCK=threading.Lock()
STATE_PATH=ROOT/'exports/trait-layers/export-status.json'

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT),**kwargs)
    def log_message(self,*args): pass
    def end_headers(self):
        self.send_header('Cache-Control','no-store')
        super().end_headers()
    def reply(self,value,status=200):
        data=json.dumps(value).encode();self.send_response(status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        if urlparse(self.path).path=='/export-status':return self.reply(STATE)
        return super().do_GET()
    def do_POST(self):
        if self.headers.get('Origin') not in (f'http://localhost:{PORT}',f'http://127.0.0.1:{PORT}'):return self.reply({'error':'Local export origin required'},403)
        route=urlparse(self.path);qs=parse_qs(route.query);species=qs.get('character',[''])[0]
        if species not in OUT:return self.reply({'error':'Unknown character'},400)
        name=qs.get('path',[''])[0];target=(OUT[species]/name).resolve()
        if not target.is_relative_to(OUT[species]) or not name:return self.reply({'error':'Invalid export path'},400)
        size=int(self.headers.get('Content-Length',0))
        if not 0<size<64*1024*1024:return self.reply({'error':'Invalid payload size'},400)
        data=self.rfile.read(size)
        try:
            target.parent.mkdir(parents=True,exist_ok=True)
            if route.path=='/export-png':
                if data[:8]!=b'\x89PNG\r\n\x1a\n' or struct.unpack('>II',data[16:24])!=(1200,1295):raise ValueError('Expected full-canvas PNG')
                digest=hashlib.sha256(data).hexdigest()
                with LOCK:
                    if target.exists():
                        if hashlib.sha256(target.read_bytes()).hexdigest()!=digest:raise ValueError('Refusing to replace a different export')
                    elif digest in HASHES:
                        os.link(HASHES[digest],target);STATE['deduplicated']+=1
                    else:
                        target.write_bytes(data);HASHES[digest]=target;STATE['bytes']+=len(data)
                    STATE['files']+=1;STATE['last']=f'{species}/{name}'
                    STATE_PATH.write_text(json.dumps(STATE,indent=2)+'\n')
                return self.reply({'path':name,'bytes':len(data),'sha256':digest})
            if route.path=='/export-json':
                value=json.loads(data);target.write_text(json.dumps(value,indent=2)+'\n');return self.reply({'path':name})
            if route.path=='/export-text':target.write_bytes(data);return self.reply({'path':name})
            return self.reply({'error':'Unknown endpoint'},404)
        except Exception as error:return self.reply({'error':str(error)},400)

STATE_PATH.write_text(json.dumps(STATE,indent=2)+'\n')
print(json.dumps(STATE),flush=True)
ThreadingHTTPServer(('127.0.0.1',PORT),Handler).serve_forever()
