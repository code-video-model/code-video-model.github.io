const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const root = path.resolve(process.env.SITE_ROOT || path.join(__dirname, '../project-page-template'));
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.mp4':'video/mp4','.webm':'video/webm','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.pdf':'application/pdf','.woff2':'font/woff2'};
const server = http.createServer((req, res) => {
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405).end(); return; }
  let file;
  try {
    const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    file = path.resolve(root, '.' + relative);
    if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }
    if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    const stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('Not a file');
    // Revalidate on each visit: byte reuse without stale local edits or releases.
    const etag = `W/"${stat.size.toString(16)}-${stat.mtimeMs.toString(16)}"`;
    const compressible = /\.(html|css|js|mjs|json|svg)$/.test(file);
    res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    res.setHeader('ETag', etag);
    if(compressible)res.setHeader('Vary', 'Accept-Encoding');
    if(req.headers['if-none-match'] === etag && !req.headers.range){res.writeHead(304).end();return;}
    let start = 0, end = stat.size - 1, status = 200;
    if (req.headers.range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if (!match || (!match[1] && !match[2])) { res.writeHead(416, {'Content-Range': `bytes */${stat.size}`}).end(); return; }
      start = match[1] ? Number(match[1]) : Math.max(0, stat.size - Number(match[2]));
      end = match[1] && match[2] ? Math.min(Number(match[2]), end) : end;
      if (start > end || start < 0) { res.writeHead(416, {'Content-Range': `bytes */${stat.size}`}).end(); return; }
      status = 206;
      res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    }
    const gzip = compressible && !req.headers.range && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const headers = {'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes'};
    if(gzip)headers['Content-Encoding']='gzip';else headers['Content-Length']=Math.max(0,end-start+1);
    res.writeHead(status, headers);
    if (req.method === 'HEAD' || !stat.size) res.end();
    else {
      const stream=fs.createReadStream(file,{start,end});
      const output=gzip?stream.pipe(zlib.createGzip()):stream;
      stream.on('error',()=>res.destroy());output.on('error',()=>res.destroy());
      res.on('close',()=>{stream.destroy();if(output!==stream)output.destroy();});
      output.pipe(res);
    }
  } catch { res.writeHead(404).end('Not found'); }
});
server.listen(Number(process.env.PORT || 8795), '127.0.0.1', () => console.log(`Project page: http://127.0.0.1:${server.address().port}`));
