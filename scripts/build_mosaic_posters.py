"""Native-resolution frames for the visible homepage result mosaics."""
import json
from build_case_catalog import Cards
from build_native_posters import ROOT, ensure_poster, selected_frame, dimensions

registry=json.loads((ROOT.parent/'scripts/data/case-catalog.json').read_text(encoding='utf-8'))['entries']
home=Cards();home.feed((ROOT/'index.html').read_text(encoding='utf-8'))
gallery=Cards();gallery.feed((ROOT/'gallery.html').read_text(encoding='utf-8'))
result={}
for main in home.rows:
    others=[r for r in gallery.rows if r['section']==main['section'] and (r['a']!=main['a'] or r['selection']!=main['selection'])]
    for row in others[:4]:
        key='|'.join(row[k] for k in ('section','a','b','selection'))
        entry=registry[key];relative=entry['sources'][row['a']]['result']
        video=ROOT/'static/project-page-cases'/relative
        poster=ensure_poster(video)
        result[key]={'src':poster.relative_to(ROOT).as_posix(),'video':'static/project-page-cases/'+relative,'frame_index':selected_frame(video),'dimensions':dimensions(poster)}
(ROOT/'static/images/mosaic-posters.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
print(f'Prepared {len(result)} native-resolution mosaic frames.')
