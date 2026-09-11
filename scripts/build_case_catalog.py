"""Maintain the private case catalog used by asset tools and source tests."""
import json
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'project-page-template'
TARGET = ROOT.parent / 'scripts/data/case-catalog.json'

class Cards(HTMLParser):
    def __init__(self):
        super().__init__(); self.section = ''; self.rows = []
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'section': self.section = a.get('id', '')
        if 'fps-case-bubble' in a.get('class', '').split() or 'application-preview' in a.get('class', '').split():
            self.rows.append({'section': a.get('data-section', self.section), 'a': a['data-case'],
                              'b': a.get('data-case-b', ''), 'selection': a.get('data-selection', ''),
                              'title': a.get('data-title', '')})

def main():
    registry = json.loads(TARGET.read_text(encoding='utf-8')) if TARGET.exists() else {'schema': 1, 'nextId': 1, 'entries': {}}
    items = {str(i['case_id']): i for i in json.loads((ROOT/'static/project-page-cases/prompts.json').read_text(encoding='utf-8'))['items']}
    pairs = {p['id']:p for p in json.loads((ROOT/'static/interactive/experiment-pairs.json').read_text(encoding='utf-8'))['pairs']}
    for entry in registry['entries'].values(): entry['active'] = False
    for page in ('gallery.html', 'index.html'):
        parser=Cards(); parser.feed((ROOT/page).read_text(encoding='utf-8'))
        for row in parser.rows:
            key='|'.join(row[k] for k in ('section','a','b','selection'))
            entry=registry['entries'].get(key)
            if entry is None:
                entry={'id':f"R{registry['nextId']:03d}", **row}
                registry['nextId']+=1
                registry['entries'][key]=entry
            item=items[row['a']]; pair=pairs.get(row['selection'])
            entry.update(active=True, sectionTitle=item['session'], version=pair['label'] if pair else item.get('display_code_video_model_setting','published'))
            if row['title']: entry['title']=row['title']
            entry['sources']={}
            for case in filter(None,[row['a'],row['b']]):
                base=items[case]; asset=pair.get('assets',{}).get(case,{}) if pair else {}
                entry['sources'][case]={'threejsSHA':asset.get('threejs_sha256',base['threejs_sha256']),
                  'result':asset.get('video') or base.get('display_code_video_model') or base.get('code_video_model_v2') or base.get('code_video_model')}
    TARGET.parent.mkdir(parents=True,exist_ok=True)
    TARGET.write_text(json.dumps(registry,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f"Private case catalog: {sum(e['active'] for e in registry['entries'].values())} active entries")

if __name__=='__main__': main()
