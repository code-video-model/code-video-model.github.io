import * as THREE from './vendor/three.module.js';
import {buildScene} from './scene.mjs';
const timeline=await (await fetch('./timeline.json')).json();
const canvas=document.getElementById('proxy'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const renderCanvas=document.createElement('canvas');
const renderer=new THREE.WebGLRenderer({canvas:renderCanvas,antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1280,720);renderer.setPixelRatio(1);
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.autoClear=false;
renderer.info.autoReset=false;
const built=buildScene(timeline);
let time=0,playing=false,clockBase=0;
const audio=document.getElementById('audio');
const capture=new URLSearchParams(location.search).has('capture');
if(capture)document.getElementById('controls').style.display='none';
function hud(s) {
  ctx.save();
  ctx.fillStyle='rgba(13,22,27,.69)';ctx.fillRect(26,24,148,143);
  ctx.strokeStyle='rgba(224,227,212,.4)';ctx.lineWidth=1;ctx.strokeRect(26.5,24.5,147,142);
  ctx.translate(36,34);
  ctx.fillStyle='#56605d';
  ctx.beginPath();ctx.moveTo(16,112);ctx.lineTo(16,70);ctx.lineTo(40,70);ctx.lineTo(40,20);ctx.lineTo(108,20);ctx.lineTo(108,95);ctx.lineTo(80,95);ctx.lineTo(80,113);ctx.closePath();ctx.fill();
  ctx.fillStyle='#adb19c';
  ctx.fillRect(45,27,19,69);ctx.fillRect(45,27,55,15);ctx.fillRect(62,79,36,12);ctx.fillRect(23,94,41,13);
  ctx.fillStyle='#737968';ctx.fillRect(69,50,15,14);ctx.fillRect(91,54,10,18);
  ctx.fillStyle='#d5b66a';ctx.fillRect(91,29,5,5);
  ctx.translate(45+(s.cameraPosition[0]+.7)*5,99+(s.cameraPosition[2]-4.3)*4);
  ctx.fillStyle='#d8f4e8';ctx.beginPath();ctx.moveTo(0,-6);ctx.lineTo(-4,4);ctx.lineTo(0,2);ctx.lineTo(4,4);ctx.closePath();ctx.fill();
  ctx.restore();
  ctx.strokeStyle='rgba(8,14,12,.95)';ctx.lineWidth=3;
  function cross(){ctx.beginPath();ctx.moveTo(630,360);ctx.lineTo(636,360);ctx.moveTo(644,360);ctx.lineTo(650,360);ctx.moveTo(640,350);ctx.lineTo(640,356);ctx.moveTo(640,364);ctx.lineTo(640,370);ctx.stroke();}
  cross();ctx.strokeStyle='#cef5cc';ctx.lineWidth=1;cross();
  ctx.fillStyle='rgba(13,22,27,.65)';ctx.fillRect(28,652,130,43);ctx.fillRect(1090,652,162,43);
  ctx.fillStyle='#d9e3dc';ctx.fillRect(43,666,14,4);ctx.fillRect(48,661,4,14);
  ctx.font='600 27px monospace';ctx.fillText('100',70,683);
  ctx.fillStyle='#8abbaa';ctx.fillRect(40,689,101,2);
  ctx.fillStyle='#eef0db';ctx.font='600 27px monospace';ctx.textAlign='right';ctx.fillText(String(s.ammo),1150,683);
  ctx.fillStyle='#abb8b7';ctx.font='17px monospace';ctx.fillText('/ 90',1229,682);
  ctx.textAlign='left';
  if(s.killFeed){
    ctx.fillStyle='rgba(16,24,28,.81)';ctx.fillRect(1008,30,244,32);
    ctx.fillStyle='#c9b580';ctx.font='13px monospace';ctx.fillText('YOU',1021,51);
    ctx.fillStyle='#d4ddd9';ctx.fillRect(1073,43,33,4);ctx.fillRect(1100,42,16,2);ctx.fillRect(1071,46,8,5);ctx.fillRect(1090,47,5,7);
    ctx.fillStyle='#b6cad8';ctx.fillText('DEFENDER',1132,51);
  }
}
function seek(t){
  if(!Number.isFinite(t))throw new Error('Time must be finite');
  time=Math.min(5,Math.max(0,t));built.setTime(time);
  renderer.info.reset();renderer.clear(true,true,true);renderer.render(built.scene,built.camera);renderer.clearDepth();renderer.render(built.viewScene,built.viewCamera);
  ctx.drawImage(renderCanvas,0,0);hud(built.state());
  document.getElementById('scrub').value=String(time);
  document.getElementById('clock').textContent=`${time.toFixed(2)} / 5.00 s`;
}
function pause(){playing=false;audio.pause();}
function play(){
  if(time>=5)seek(0);
  audio.currentTime=time;audio.play().catch(()=>{});
  clockBase=performance.now()-time*1000;playing=true;
}
function animate(now){
  if(playing){seek((now-clockBase)/1000);if(time>=5)pause();}
  requestAnimationFrame(animate);
}
document.getElementById('play').onclick=()=>playing?pause():play();
document.getElementById('restart').onclick=()=>{pause();seek(0);play();};
document.getElementById('scrub').oninput=e=>{pause();seek(Number(e.target.value));audio.currentTime=time;};
function diagnostics(){
  const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
  return {...built.state(),world:built.worldSignature(),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
}
async function streamFrame(index){
  const bytes=ctx.getImageData(0,0,1280,720).data;
  const response=await fetch(`/__frame?index=${index}`,{method:'POST',headers:{'Content-Type':'application/octet-stream'},body:bytes});
  if(!response.ok)throw new Error(await response.text());
}
window.reconstruction={ready:true,pause,play,seek,diagnostics,streamFrame};
seek(0);requestAnimationFrame(animate);
