"""Reorder current category shells and normalize existing editable preview controls."""
import html,json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'project-page-template'
path=ROOT/'index.html';text=path.read_text(encoding='utf-8')
order=['reconstruction-3d-4d','long-horizon-style','gallery','trajectory-variation','architectural-cinematics','product-cinematography','scientific-visualization','robotics-simulation','control-world-states']
blocks={re.search(r'\bid="([^"]+)"',m)[1]:m for m in re.findall(r'<section class="category-shell".*?</section>',text,re.S)}
for key,block in blocks.items():
    old=re.search(r'<div class="application-edit-controls".*?</div>',block,re.S)
    if not old:continue
    if 'application-variant-toggle' in old[0]:continue
    label=html.unescape(re.search(r'<button class="application-edit"[^>]*>(.*?)</button>',old[0],re.S)[1])
    new=f'<div class="application-edit-controls" role="group" aria-label="Scene edit"><button type="button" class="application-variant-toggle" data-edit-label="{html.escape(label,quote=True)}" aria-pressed="false">{html.escape(label)}</button></div>'
    block=block[:old.start()]+block[old.end():]
    block=block.replace('<div class="comparison-frame">','<div class="comparison-frame">\n'+new,1)
    blocks[key]=block
start='<!-- application-previews:start -->';end='<!-- application-previews:end -->'
before,rest=text.split(start);_,after=rest.split(end)
path.write_text(before+start+'\n'+'\n'.join(blocks[k] for k in order)+'\n'+end+after,encoding='utf-8')
manifest=ROOT/'static/images/application-previews/manifest.json';rows=json.loads(manifest.read_text(encoding='utf-8'));by_id={r['section_id']:r for r in rows};manifest.write_text(json.dumps([by_id[k] for k in order],indent=2)+'\n',encoding='utf-8')
print('Scene editing and trajectory are adjacent; editable previews now have one toggle each.')
