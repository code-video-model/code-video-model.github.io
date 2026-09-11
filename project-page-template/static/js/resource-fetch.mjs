// Bounded retries for read-only resources, including interrupted response bodies.
const transientStatus=new Set([408,429,500,502,503,504]);
export async function readResource(url,{signal,type='json',label='Resource',timeoutMs=15000,retries=2,cache='default'}={}){
 for(let attempt=0;attempt<=retries;attempt++){
  signal?.throwIfAborted();
  const controller=new AbortController();let timedOut=false;
  const cancel=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',cancel,{once:true});
  const timer=setTimeout(()=>{timedOut=true;controller.abort();},timeoutMs);
  let retry=false;
  try{
   const response=await fetch(url,{signal:controller.signal,cache});
   if(!response.ok){
    const error=new Error(`HTTP ${response.status}`);error.httpStatus=response.status;
    await response.body?.cancel();throw error;
   }
   const value=await response[type]();signal?.throwIfAborted();return value;
  }catch(cause){
   if(signal?.aborted)throw signal.reason;
   const network=cause instanceof TypeError;
   retry=attempt<retries&&(network||timedOut||transientStatus.has(cause.httpStatus));
   if(!retry){
    const reason=timedOut?'request timed out':cause.httpStatus?`HTTP ${cause.httpStatus}`:network?'network connection interrupted':cause.message;
    const error=new Error(`${label} could not be loaded (${reason}; ${attempt+1} attempt${attempt?'s':''}).`,{cause});
    error.resource=String(url);error.attempts=attempt+1;error.name='ResourceLoadError';
    throw error;
   }
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
  if(retry)await new Promise((resolve,reject)=>{
   const done=()=>{signal?.removeEventListener('abort',abort);resolve();};
   const abort=()=>{clearTimeout(backoff);signal?.removeEventListener('abort',abort);reject(signal.reason);};
   const backoff=setTimeout(done,[250,750][attempt]||1000);
   signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
 }
}
