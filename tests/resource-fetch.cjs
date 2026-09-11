const assert=require('node:assert/strict');
(async()=>{const {readResource}=await import('../project-page-template/static/js/resource-fetch.mjs');const original=global.fetch;try{
 let calls=0;global.fetch=async()=>{if(++calls===1)throw new TypeError('Failed to fetch');return new Response('{"ok":true}');};
 assert.deepEqual(await readResource('/test',{label:'Catalog'}),{ok:true});assert.equal(calls,2);
 calls=0;global.fetch=async()=>{calls++;return calls===1?{ok:true,blob:async()=>{throw new TypeError('terminated')}}:new Response('video');};
 assert.equal(await (await readResource('/video',{type:'blob'})).text(),'video');assert.equal(calls,2);
 calls=0;global.fetch=async()=>{calls++;return new Response('',{status:503});};
 await assert.rejects(readResource('/scene',{label:'Scene metadata'}),e=>e.resource==='/scene'&&e.attempts===3&&e.message.includes('HTTP 503'));assert.equal(calls,3);
 calls=0;global.fetch=async()=>{calls++;return new Response('',{status:404});};
 await assert.rejects(readResource('/missing'),e=>e.attempts===1);assert.equal(calls,1);
 calls=0;global.fetch=async()=>{calls++;return new Response('invalid json');};
 await assert.rejects(readResource('/bad'),e=>e.attempts===1);assert.equal(calls,1);
 calls=0;const c=new AbortController();global.fetch=async()=>{calls++;throw new TypeError('offline');};
 const pending=readResource('/cancel',{signal:c.signal});setTimeout(()=>c.abort(),30);await assert.rejects(pending,e=>e.name==='AbortError');assert.equal(calls,1);
 global.fetch=(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
 await assert.rejects(readResource('/slow',{timeoutMs:15,retries:0}),e=>e.message.includes('timed out'));
 console.log('PASS network/body retry, bounded 503, no retry on 404/invalid JSON, abort and timeout');
}finally{global.fetch=original;}})().catch(e=>{console.error(e);process.exitCode=1;});
