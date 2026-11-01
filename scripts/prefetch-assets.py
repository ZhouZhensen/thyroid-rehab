"""Fetch pinned, hash-checked public model assets. Never handles patient data."""
from pathlib import Path
import hashlib,io,json,tarfile,urllib.request
root=Path(__file__).resolve().parents[1]
expected=json.loads((root/'scripts/model-hashes.json').read_text())
def valid(name,data):
 if hashlib.sha256(data).hexdigest()!=expected[name]:raise RuntimeError('Checksum mismatch: '+name)
 return data
missing=[n for n in expected if not (root/n).is_file() or hashlib.sha256((root/n).read_bytes()).hexdigest()!=expected[n]]
if any(n!='pose_landmarker_lite.task' for n in missing):
 req=urllib.request.Request('https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-1.2.0.tgz',headers={'User-Agent':'thyroid-rehab-model-build/0.2'})
 with urllib.request.urlopen(req,timeout=90) as r:archive=r.read()
 with tarfile.open(fileobj=io.BytesIO(archive),mode='r:gz') as tar:
  for item in tar.getmembers():
   name=Path(item.name).name
   if name in expected and name!='pose_landmarker_lite.task':
    f=tar.extractfile(item)
    if f:(root/name).write_bytes(valid(name,f.read()))
if 'pose_landmarker_lite.task' in missing:
 url='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
 with urllib.request.urlopen(url,timeout=90) as r:data=r.read()
 (root/'pose_landmarker_lite.task').write_bytes(valid('pose_landmarker_lite.task',data))
for name in expected:valid(name,(root/name).read_bytes())
print('Verified',len(expected),'pinned model/runtime assets')
