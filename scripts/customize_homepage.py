"""Apply explicit curated homepage choices without rebuilding the Gallery."""
import hashlib
import html
import json
import re
from pathlib import Path
from build_native_posters import ensure_poster, main as refresh_native_posters

ROOT=Path(__file__).resolve().parents[1]/'project-page-template'
ORDER=['reconstruction-3d-4d','long-horizon-style','gallery','architectural-cinematics','product-cinematography','scientific-visualization','robotics-simulation','trajectory-variation','control-world-states']
CHOICES={'reconstruction-3d-4d':'R003','long-horizon-style':'R011','architectural-cinematics':'R050','control-world-states':'R024'}

def main():
    if 'data-integrated-gallery' in (ROOT/'index.html').read_text(encoding='utf-8'):
        raise SystemExit('This one-time curation script predates the integrated Gallery. Do not overwrite the current category shells.')
    index=ROOT/'index.html'; text=index.read_text(encoding='utf-8')
    records=json.loads((ROOT/'static/images/application-previews/manifest.json').read_text(encoding='utf-8'))
    mapping={r['section_id']:r for r in records}
    registry=json.loads((ROOT.parent/'scripts/data/case-catalog.json').read_text(encoding='utf-8'))
    ids={r['id']:r for r in registry['entries'].values()}
    items={str(r['case_id']):r for r in json.loads((ROOT/'static/project-page-cases/prompts.json').read_text(encoding='utf-8'))['items']}
    articles={re.search(r'data-section="([^"]+)"',a)[1]:a for a in re.findall(r'<article class="application-preview".*?</article>',text,re.S)}
    for section,identity in CHOICES.items():
        entry=ids[identity]; assert entry['section']==section and not entry['b']
        item=items[entry['a']]; row=mapping[section]; old=articles[section]
        assets=[('Three.js',item['threejs_video'],item['threejs_sha256']),
                (item.get('result_caption','Code Video Model'),item.get('display_code_video_model') or item['code_video_model'],item.get('display_code_video_model_sha256') or item['code_video_model_sha256'])]
        figures=[]
        for label,relative,sha in assets:
            video=ROOT/'static/project-page-cases'/relative
            assert hashlib.sha256(video.read_bytes()).hexdigest()==sha
            poster=ensure_poster(video)
            title='Gaming' if section=='control-world-states' else item['session']
            figures.append(f'<figure><figcaption>{html.escape(label)}</figcaption><video playsinline muted preload="none" poster="{poster.relative_to(ROOT).as_posix()}" data-src="static/project-page-cases/{relative}" aria-label="{html.escape(title)} {html.escape(label)}"></video></figure>')
        old=re.sub(r'data-case="[^"]+"',f'data-case="{entry["a"]}"',old,count=1)
        old=re.sub(r'(<div class="application-video-pair">).*?(</div>)',lambda m:m[1]+'\n              '+'\n              '.join(figures)+'\n              '+m[2],old,count=1,flags=re.S)
        articles[section]=old
        row.update(case_id=entry['a'],threejs=assets[0][1],threejs_sha256=assets[0][2],result=assets[1][1],result_sha256=assets[1][2])
    articles={k:v.replace('First-Person Games','Gaming') for k,v in articles.items()}
    mapping['control-world-states']['section']='Gaming'
    start='<!-- application-previews:start -->'; end='<!-- application-previews:end -->'
    before,rest=text.split(start); _,after=rest.split(end)
    index.write_text(before+start+'\n            '+'\n            '.join(articles[k] for k in ORDER)+'\n          '+end+after,encoding='utf-8')
    (ROOT/'static/images/application-previews/manifest.json').write_text(json.dumps([mapping[k] for k in ORDER],indent=2)+'\n',encoding='utf-8')
    gallery=ROOT/'gallery.html'; text=gallery.read_text(encoding='utf-8')
    text,n=re.subn(r'<div class="fps-bubble-float"><a\b(?=[^>]*data-case="434")[^>]*>.*?</a></div>','',text,flags=re.S)
    assert n in (0,1)
    gallery.write_text(text.replace('First-Person Games','Gaming'),encoding='utf-8')
    for relative,field in [('static/project-page-cases/prompts.json','items'),('static/interactive/catalog.json','cases')]:
        path=ROOT/relative; data=json.loads(path.read_text(encoding='utf-8'))
        for item in data[field]:
            if item.get('session')=='First-Person Games': item['session']='Gaming'
            if str(item['case_id'])=='434': item['gallery_visible']=False
        path.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print('Curated homepage updated; R056 hidden; Gaming renamed.')
    refresh_native_posters()

if __name__=='__main__': main()
