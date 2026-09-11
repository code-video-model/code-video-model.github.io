"""Import the four explicitly supplied deliveries; never execute archive scripts."""
import hashlib, json, tarfile, shutil, subprocess, re, os, sys
from fractions import Fraction
from build_native_posters import ensure_poster
from pathlib import Path, PurePosixPath

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'project-page-template'
ARCHIVES=ROOT.parent/'try_seedance25/backup_09_09'
PACKAGES=[
 ('electromagnetic-induction-classroom-5s-review-v1','physical-induction','Electromagnetic Induction'),
 ('isochronous-circle-metal-5s-final-v1','physical-isochronous','Isochronous Circle'),
 ('prism-dispersion-classroom-5s-final-v1','physical-prism','Prism Dispersion'),
 ('double-pendulum-classroom-5s-final-v1','physical-pendulum','Double Pendulum'),
]
def sha(data):return hashlib.sha256(data).hexdigest()
def stage():
 for package,case,title in PACKAGES:
  destination=ROOT/'.local-import'/package
  with tarfile.open(ARCHIVES/(package+'.tar.gz')) as archive:
   members=archive.getmembers()
   for member in members:
    path=PurePosixPath(member.name)
    if path.is_absolute() or '..' in path.parts or '\\' in member.name or ':' in member.name or member.issym() or member.islnk():raise ValueError('Unsafe archive entry')
   manifest=json.load(archive.extractfile(package+'/delivery-manifest.json'))
   approved={f['path']:f['sha256'] for f in manifest['files']}
   chosen={manifest.get('recommendedMedia','final.mp4'),manifest.get('generationProxy','media/generation-proxy-silent.mp4'),'delivery-manifest.json'}
   for member in members:
    rel=PurePosixPath(member.name).relative_to(package).as_posix()
    if not member.isfile() or not (rel in chosen or rel.startswith(('threejs/','physics/'))):continue
    data=archive.extractfile(member).read()
    if rel in approved and sha(data)!=approved[rel]:raise ValueError('Hash mismatch: '+rel)
    target=destination/rel;target.parent.mkdir(parents=True,exist_ok=True)
    if target.exists():
     if target.read_bytes()!=data:raise ValueError('Existing import differs: '+str(target))
     continue
    target.write_bytes(data)
  print(json.dumps({'case':case,'title':title,'status':manifest.get('status'),'result':manifest.get('recommendedMedia','final.mp4'),'entry':manifest.get('threejsEntry','threejs/index.html')}))

def read(path):return json.loads(path.read_text(encoding='utf-8'))
def write(path,data):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(data,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
def probe(path):
 return json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height,r_frame_rate,nb_frames,duration','-of','json',str(path)]))['streams'][0]
def publish():
 items=[];cards=[];previews=[]
 posters=read(SITE/'static/images/poster-selections.json')
 mosaics=read(SITE/'static/images/mosaic-posters.json')
 for package,case,title in PACKAGES:
  staged=ROOT/'.local-import'/package;manifest=read(staged/'delivery-manifest.json')
  result=staged/manifest.get('recommendedMedia','final.mp4');proxy=staged/'media/generation-proxy-silent.mp4'
  meta=probe(result);input_meta=probe(proxy)
  paths={}
  for label,media in [('threejs',proxy),('code-video-model',result)]:
   dest=SITE/f'static/project-page-cases/{label}/physical-grounding/{case}.mp4'
   dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(media,dest)
   paths[label]=dest.relative_to(SITE/'static/project-page-cases').as_posix()
   fps=float(Fraction(probe(media)['r_frame_rate']))
   posters[dest.relative_to(SITE).as_posix()]={'frame_index':round((3 if case=='physical-prism' else 1)*fps)}
  write(SITE/'static/images/poster-selections.json',posters)
  proxy_poster=ensure_poster(SITE/'static/project-page-cases'/paths['threejs']).relative_to(SITE).as_posix()
  output_poster=ensure_poster(SITE/'static/project-page-cases'/paths['code-video-model']).relative_to(SITE).as_posix()
  base=SITE/'static/interactive'/case
  entries=[];entry=manifest.get('threejsEntry','threejs/index.html')
  html=(staged/entry).read_text(encoding='utf-8')
  module=re.search(r'<script type="module" src="([^"]+)"',html)[1]
  main=(PurePosixPath(entry).parent/module).as_posix().replace('/./','/')
  for source in sorted((staged/'threejs').rglob('*')):
   if not source.is_file() or (source.suffix not in {'.html','.js','.mjs','.json','.txt'} and not source.name.startswith('LICENSE')) or source.name.startswith(('render','validate','build_')):continue
   rel=source.relative_to(staged)
   for kind in ['original','runtime']:
    target=base/kind/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
   if source.suffix in {'.js','.mjs'} and 'vendor' not in source.parts:
    text=source.read_text(encoding='utf-8')
    functions=[{'name':m[1],'line':text[:m.start()].count('\n')+1} for m in re.finditer(r'(?:async\s+)?function\s+(\w+)\s*\(',text)]
    entries.append({'path':'original/'+rel.as_posix(),'name':rel.as_posix(),'sha256':sha(source.read_bytes()),'functions':functions})
  # Isolate the unmodified source; adapt only the runtime's clock/capture interface.
  for source in sorted((staged/'physics').rglob('*')):
   if source.is_file() and (source.suffix=='.py' or source.name=='physics-model.txt'):
    target=base/'original'/source.relative_to(staged);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
    entries.append({'path':target.relative_to(base).as_posix(),'name':source.relative_to(staged).as_posix(),'sha256':sha(source.read_bytes()),'functions':[]})
  license_source=ROOT/'.local-import/electromagnetic-induction-classroom-5s-review-v1/threejs/case/vendor/LICENSE.threejs'
  for vendor in base.rglob('vendor'):
   if vendor.is_dir() and not (vendor/'LICENSE.threejs').exists():shutil.copy2(license_source,vendor/'LICENSE.threejs')
  runtime_html=base/'runtime'/entry
  hook=os.path.relpath(SITE/'static/js/scene-host.js',runtime_html.parent).replace('\\','/')
  runtime_html.write_text(html.replace('<head>',f'<head><script src="{hook}"></script>',1),encoding='utf-8')
  main_path=base/'runtime'/main
  adapter='\n// Project-page adapter: expose the original runtime, without changing scene geometry.\n'
  if case=='physical-isochronous':adapter+='window.reconstruction = {pause(){}, seek: setTime};\n'
  if case=='physical-prism':adapter+='window.reconstruction.displayCanvas = deliveryCanvas;\nconst originalSeek = window.reconstruction.seek; window.reconstruction.seek = t => {originalSeek(t); deliveryContext.drawImage(canvas,0,0,1280,720);};\n'
  adapter+='window.__bfCapture = {THREE, renderer, scene, camera};\n'
  main_path.write_text(main_path.read_text(encoding='utf-8')+adapter,encoding='utf-8')
  hashes={'input':sha(proxy.read_bytes()),'output':sha(result.read_bytes())}
  metadata={'case_id':case,'session':'Physical Grounding','prompt':title,'fps':float(Fraction(meta['r_frame_rate'])),'frames':int(meta['nb_frames']),'width':input_meta['width'],'height':input_meta['height'],'threejs_sha256':hashes['input'],'entry':'runtime/'+entry,'sources':entries,'provenance':{'archive':package+'.tar.gz','delivery_status':manifest.get('status'),'result_sha256':hashes['output'],'input_metadata':input_meta,'output_metadata':meta,'timeline':'Output frame clock in seconds; source files and media are unchanged.'}}
  write(base/'case.json',metadata)
  item={'case_id':case,'session':'Physical Grounding','source_prompt':title,'threejs_video':paths['threejs'],'threejs_sha256':hashes['input'],'code_video_model':paths['code-video-model'],'display_code_video_model':paths['code-video-model'],'display_code_video_model_sha256':hashes['output'],'code_video_model_sha256':hashes['output'],'interactive_source':case+'/','display_code_video_model_setting':package}
  items.append(item)
  palette='[[206, 216, 224], [161, 182, 187], [222, 211, 187], [139, 166, 169]]'
  cards.append(f'<div class="fps-bubble-float"><a class="case-explore fps-case-bubble" href="?case={case}" data-case="{case}" data-title="{title}" data-color="161, 182, 187" data-palette="{palette}" aria-label="Open {title}" aria-controls="physical-grounding-expanded" aria-expanded="false"><img src="{output_poster}" width="{meta["width"]}" height="{meta["height"]}" alt="" loading="lazy"></a></div>')
  mosaics[f'physical-grounding|{case}||']={'src':output_poster}
  previews.append({'section':'Physical Grounding','section_id':'physical-grounding','case_id':case,'threejs':paths['threejs'],'threejs_sha256':hashes['input'],'result':paths['code-video-model'],'result_sha256':hashes['output'],'proxy_poster':proxy_poster,'output_poster':output_poster})
 manifest_path=SITE/'static/project-page-cases/prompts.json';data=read(manifest_path)
 data['items']=[i for i in data['items'] if i['case_id'] not in {row['case_id'] for row in items}]+items
 data['count']=len(data['items']);write(manifest_path,data)
 catalog_path=SITE/'static/interactive/catalog.json';catalog=read(catalog_path)
 catalog['cases']=[i for i in catalog['cases'] if i['case_id'] not in {row['case_id'] for row in items}]+[{'case_id':i['case_id'],'session':i['session']} for i in items]
 catalog['count']=len(catalog['cases']);write(catalog_path,catalog);write(SITE/'static/images/mosaic-posters.json',mosaics)
 gallery=f'''<section class="gallery-section control-world-section" id="physical-grounding"><div class="container fps-bubbles-host"><h2>Physical Grounding</h2><div class="fps-bubble-grid" aria-label="Physical Grounding cases">{''.join(cards)}</div><div id="physical-grounding-expanded" class="fps-expanded" hidden><div class="fps-expanded-heading"><button type="button" class="fps-back">← Return</button></div><p class="fps-load-status" role="status" aria-live="polite"></p><div class="fps-frame-slot"></div></div></div></section>'''
 highlight=next(p for p in previews if p['case_id']=='physical-induction')
 figures=''.join(f'<figure><figcaption>{label}</figcaption><video playsinline muted preload="none" poster="{highlight[poster]}" data-src="static/project-page-cases/{highlight[key]}" aria-label="Physical Grounding {label}"></video></figure>' for label,poster,key in [('Three.js','proxy_poster','threejs'),('Output','output_poster','result')])
 overview=f'''<section class="category-shell" id="physical-grounding"><div class="category-content"><div class="category-overview"><article class="application-preview" data-case="{highlight['case_id']}" data-section="physical-grounding"><div class="comparison-frame"><div class="application-video-pair">{figures}</div><div class="application-transport"><button class="application-play" type="button">Play</button><input class="application-seek" type="range" min="0" max="1000" step="1" value="0" aria-label="Video pair progress" disabled><button class="application-sound" type="button" aria-pressed="false">Sound off</button></div><p class="application-status" role="status" aria-live="polite"></p></div><div class="application-copy"><h2><a href="gallery.html#physical-grounding">Physical Grounding</a></h2></div></article></div></div></section>'''
 for filename,markup in [('gallery.html',gallery),('index.html',overview)]:
  target=SITE/filename;text=target.read_text(encoding='utf-8');start='<!-- physical-grounding:start -->';end='<!-- physical-grounding:end -->'
  block=start+'\n'+markup+'\n'+end+'\n'
  if start in text:text=re.sub(re.escape(start)+r'[\s\S]*?'+re.escape(end)+'\n?',lambda _:block,text)
  else:
   match=re.search(r'<section\b[^>]*id="robotics-simulation"',text)
   assert match,'Insertion point missing';text=text[:match.start()]+block+text[match.start():]
  target.write_text(text,encoding='utf-8')
 path=SITE/'static/images/application-previews/manifest.json';data=[p for p in read(path) if p['section_id']!='physical-grounding']
 data.insert(next(i for i,p in enumerate(data) if p['section_id']=='robotics-simulation'),highlight);write(path,data)
 print('Imported four cases and Physical Grounding; highlighted Electromagnetic Induction.')

if __name__=='__main__':
 stage()
 if '--publish-local' in sys.argv:publish()
