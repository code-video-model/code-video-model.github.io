"""Migrate the current homepage into category shells and update two curated pairs."""
import hashlib
import html
import json
import re
from pathlib import Path
from build_native_posters import ensure_poster, main as refresh_posters

ROOT=Path(__file__).resolve().parents[1]/'project-page-template'
page=ROOT/'index.html';text=page.read_text(encoding='utf-8')
registry=json.loads((ROOT.parent/'scripts/data/case-catalog.json').read_text(encoding='utf-8'))
ids={r['id']:r for r in registry['entries'].values()}
items={str(i['case_id']):i for i in json.loads((ROOT/'static/project-page-cases/prompts.json').read_text(encoding='utf-8'))['items']}
pairs={p['id']:p for p in json.loads((ROOT/'static/interactive/experiment-pairs.json').read_text(encoding='utf-8'))['pairs']}
manifest=ROOT/'static/images/application-previews/manifest.json'
records=json.loads(manifest.read_text(encoding='utf-8'))

def media(identity, selection):
    item=items[identity];asset=pairs[selection]['assets'][identity] if selection else {}
    paths=[asset.get('threejs_video',item['threejs_video']),asset.get('video',item.get('display_code_video_model') or item['code_video_model'])]
    hashes=[asset.get('threejs_sha256',item['threejs_sha256']),asset.get('sha256',item.get('display_code_video_model_sha256') or item['code_video_model_sha256'])]
    posters=[]
    for source,sha in zip(paths,hashes):
        video=ROOT/'static/project-page-cases'/source
        assert hashlib.sha256(video.read_bytes()).hexdigest()==sha
        posters.append(ensure_poster(video).relative_to(ROOT).as_posix())
    return paths,hashes,posters

for review_id in ['R008','R044']:
    entry=ids[review_id];section=entry['section'];a=entry['a'];b=entry['b'];selection=entry['selection']
    pattern=rf'<article class="application-preview"(?=[^>]*data-section="{section}").*?</article>'
    match=re.search(pattern,text,re.S);article=match[0]
    paths,hashes,posters=media(a,selection)
    if b: bp,bh,bposters=media(b,selection)
    figures=[]
    for j,label in enumerate(['Three.js','Code Video Model']):
        extra=f' data-src-a="static/project-page-cases/{paths[j]}" data-poster-a="{posters[j]}" data-src-b="static/project-page-cases/{bp[j]}" data-poster-b="{bposters[j]}"' if b else ''
        figures.append(f'<figure><figcaption>{label}</figcaption><video playsinline muted preload="none" poster="{posters[j]}" data-src="static/project-page-cases/{paths[j]}"{extra} aria-label="{entry["sectionTitle"]} {label}"></video></figure>')
    article=re.sub(r'(<div class="application-video-pair">).*?(</div>)',lambda m:m[1]+'\n'+'\n'.join(figures)+'\n'+m[2],article,count=1,flags=re.S)
    article=re.sub(r'data-case="[^"]+"',f'data-case="{a}"',article,count=1)
    if b:
        article=re.sub(r'data-case-b="[^"]+"',f'data-case-b="{b}"',article,count=1)
        article=re.sub(r'data-selection="[^"]+"',f'data-selection="{selection}"',article,count=1)
        label=html.escape(pairs[selection]['edit_label'])
        article=re.sub(r'(<button class="application-edit"[^>]*>).*?(</button>)',lambda m:m[1]+label+m[2],article)
    text=text[:match.start()]+article+text[match.end():]
    row=next(r for r in records if r['section_id']==section)
    row.update(case_id=a,threejs=paths[0],threejs_sha256=hashes[0],result=paths[1],result_sha256=hashes[1])
    if b:row.update(selection=selection,edited={'case_id':b,'label':pairs[selection]['edit_label'],'threejs':bp[0],'threejs_sha256':bh[0],'result':bp[1],'result_sha256':bh[1]})

if 'data-integrated-gallery' not in text:
    text=text.replace('<html lang="en">','<html lang="en" data-integrated-gallery>')
    text=text.replace('      <section class="application-previews"', '    </div>\n    <header class="gallery-intro" id="results"><h2>Gallery</h2><p>click for more results</p></header>\n      <section class="application-previews"')
    text=text.replace('      </section>\n    </div>\n  </main>','      </section>\n  </main>')
    def shell(m):
        section=re.search(r'data-section="([^"]+)"',m[0])[1]
        return f'<section class="category-shell" id="{section}"><div class="category-content"><div class="category-overview">\n{m[0]}\n</div></div></section>'
    text=re.sub(r'<article class="application-preview".*?</article>',shell,text,flags=re.S)
text=text.replace('>Play demo</button>','>Watch</button>')
text=text.replace('<a href="gallery.html">','<a href="#results">')
page.write_text(text,encoding='utf-8')
manifest.write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
refresh_posters()
print('Integrated shell markup; R008 and R044 selected.')
