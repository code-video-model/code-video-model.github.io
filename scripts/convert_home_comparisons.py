"""Migrate curated homepage markup without changing video selections."""
import re
from pathlib import Path
page=Path(__file__).resolve().parents[1]/'project-page-template/index.html'
text=page.read_text(encoding='utf-8')
def convert(match):
    article=match[0]
    if 'comparison-frame' in article:return article
    heading=re.search(r'<h2>.*?</h2>',article,re.S)[0]
    pair=re.search(r'<div class="application-video-pair">.*?</div>',article,re.S)[0]
    transport=re.search(r'<div class="application-transport">.*?</div>',article,re.S)[0]
    status=re.search(r'<p class="application-status".*?</p>',article,re.S)[0]
    edit=re.search(r'<div class="application-edit-controls".*?</div>',article,re.S)
    return article[:article.index('>')+1]+f'\n              <div class="comparison-frame">\n{pair}\n{transport}\n{status}\n              </div>\n              <div class="application-copy">\n{heading}\n{edit[0] if edit else ""}\n              </div>\n            </article>'
page.write_text(re.sub(r'<article class="application-preview".*?</article>',convert,text,flags=re.S),encoding='utf-8')
print('Migrated nine curated previews into alternating comparison rows.')
