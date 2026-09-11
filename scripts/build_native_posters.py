"""Extract visually selected native-resolution, lossless frames for homepage videos."""
import hashlib
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]/'project-page-template'
OUTPUT=ROOT/'static/images/first-frames-native'

def selected_frame(video):
    config=ROOT/'static/images/poster-selections.json'
    selections=json.loads(config.read_text(encoding='utf-8')) if config.exists() else {}
    relative=video.resolve().relative_to(ROOT.resolve()).as_posix()
    frame=selections.get(relative,{}).get('frame_index',0)
    if not isinstance(frame,int) or frame<0:raise ValueError(f'Invalid selected frame for {relative}')
    return frame

def ensure_poster(video):
    sha=hashlib.sha256(video.read_bytes()).hexdigest()
    OUTPUT.mkdir(parents=True,exist_ok=True)
    frame=selected_frame(video)
    target=OUTPUT/(sha+(f'-frame{frame:06d}' if frame else '')+'.png')
    if not target.exists():
        subprocess.run(['ffmpeg','-v','error','-n','-i',str(video),'-map','0:v:0','-vf',f'select=eq(n\\,{frame})','-frames:v','1','-pix_fmt','rgb24','-update','1',str(target)],check=True)
    return target

def dimensions(path):
    result=subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(path)])
    stream=json.loads(result)['streams'][0]
    return [stream['width'],stream['height']]

def frame_pixel_hash(path, frame=0):
    return subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-vf',f'select=eq(n\\,{frame})','-frames:v','1','-pix_fmt','rgb24','-f','hash','-hash','sha256','-']).decode().strip()

class VideoAttrs(HTMLParser):
    def handle_starttag(self,tag,attrs):
        if tag=='video':self.attrs=dict(attrs)

def main():
    index=ROOT/'index.html'; text=index.read_text(encoding='utf-8')
    records={}
    def update(match):
        tag=match[0]; parser=VideoAttrs();parser.feed(tag);attrs=parser.attrs
        for source_key,poster_key in [('data-src','poster'),('data-src-a','data-poster-a'),('data-src-b','data-poster-b')]:
            source=attrs.get(source_key)
            if not source:continue
            video=(ROOT/source).resolve()
            if not video.is_relative_to(ROOT.resolve()):raise ValueError('Video must belong to this site')
            if source not in records:
                target=ensure_poster(video)
                source_size=dimensions(video);poster_size=dimensions(target)
                assert source_size==poster_size,(source,source_size,poster_size)
                frame=selected_frame(video)
                pixel_hash=frame_pixel_hash(video,frame)
                assert pixel_hash==frame_pixel_hash(target),source
                records[source]={'video':source,'poster':target.relative_to(ROOT).as_posix(),'width':poster_size[0],'height':poster_size[1],'frame_index':frame,'format':'PNG/rgb24','video_sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'poster_sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'decoded_pixels_sha256':pixel_hash.split('=')[-1]}
                print(f'Native frame {frame}: {poster_size[0]}x{poster_size[1]} {source}',flush=True)
            poster=records[source]['poster']
            pattern=rf'\b{re.escape(poster_key)}="[^"]*"'
            if re.search(pattern,tag):tag=re.sub(pattern,f'{poster_key}="{poster}"',tag)
            else:tag=tag[:-1]+f' {poster_key}="{poster}">'
        return tag
    updated=re.sub(r'<video\b[^>]*>',update,text)
    index.write_text(updated,encoding='utf-8')
    (OUTPUT/'manifest.json').write_text(json.dumps(list(records.values()),indent=2)+'\n',encoding='utf-8')
    print(f'Updated {len(records)} unique homepage videos, including edited variants and the hero demo.')

if __name__=='__main__':main()
