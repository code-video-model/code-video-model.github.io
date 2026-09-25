import { cameraIntrinsics, INSPECTOR_HORIZONTAL_FOV, perspectiveIntrinsics, verticalFov } from './camera-intrinsics.mjs';
import { resolvePublishedScene } from './published-scenes.mjs?v=1';
import {setupComparison} from './diagonal-comparison.js';
import {paintGlass} from './liquid-glass.js?v=1';
import {readResource} from './resource-fetch.mjs';
import {codePresentation} from './code-presentation.mjs';
import {editVariantLabels} from './code-display-names.mjs';

const $ = (id) => document.getElementById(id);
const video = $('result-video');
const slider = $('timeline');
const status = $('status');
let runtime;
let inspector;
let stopped = true;
let playIntent = 0;
let ready = false;
let currentFrame = 0;
let pendingFrame = null;
let seeking = false;
let videoCallback = null;
let animationCallback = null;
let section = 'camera';
let sourceLines = [];
let resizeObserver;
let videoObjectURL;
let FPS = 24;
let LAST_FRAME = 123;
let phaseNames = ['Full sequence'];
let phaseFrames = [0];
let frameHost;
let metadata;
let selectedSource;
let sourceFiles;
let sourcePresentation;
let sceneAPI;
let sourceBase;
let displayName = 'Selected_Result';
let trace = new Set();
let currentTime = 0;
const caseId = new URLSearchParams(location.search).get('case') || '505';
const selectionId = new URLSearchParams(location.search).get('selection') || '';
const embedded = new URLSearchParams(location.search).get('embed') === 'bubbles';
const displayVariantNames=editVariantLabels(
  new URLSearchParams(location.search).get('display_name'),
  new URLSearchParams(location.search).get('case_a'),
  new URLSearchParams(location.search).get('case_b'),
);
let embedObserver;
let disposed = false;
const lifetime = new AbortController();
// Available before initialization, so switching variants also cancels pending loads.
window.behindFrameLifecycle = { dispose };
if (embedded) document.body.dataset.embed = 'bubbles';

// Default to the two views; source and the independent inspector are opt-in.
function disclosure(label, nodes, className) {
  const details=document.createElement('details');details.className=className;
  const summary=document.createElement('summary');summary.textContent=label;
  nodes[0].before(details);details.append(summary,...nodes);return details;
}
const sourcePanel=document.querySelector('.source-panel');
const codeDetails=disclosure('View code',[sourcePanel],'code-disclosure');
codeDetails.open=new URLSearchParams(location.search).get('code')==='1';
document.querySelector('.panels').after(codeDetails);
const inspectorStart=document.querySelector('.inspector-heading');
const inspectorNodes=[];for(let node=inspectorStart;node;node=node.nextElementSibling)inspectorNodes.push(node);
const inspectorDetails=disclosure('Explore in 3D',inspectorNodes,'inspector-disclosure');
const resultPanel=$('result-heading').parentElement;
const stateNodes=[...resultPanel.children].slice(2);
const stateDetails=disclosure('Scene details',stateNodes,'state-disclosure');
stateDetails.addEventListener('toggle',()=>{if(stateDetails.open&&ready&&!inspectorLoading)draw(currentTime);});
for(const [id,title] of [['source-heading','Scene code'],['proxy-heading','Three.js'],['result-heading','Output']])$(id).firstElementChild.textContent=title;
if(new URLSearchParams(location.search).get('editing')==='1'){
 document.body.dataset.editing='true';
 const panel=document.createElement('section');panel.className='panel editing-comparison-panel';
 const frame=document.createElement('div');frame.className='comparison-frame';
 const pair=document.createElement('div');pair.className='application-video-pair';
 for(const stage of [$('proxy-stage'),video.parentElement]){const figure=document.createElement('figure');figure.append(stage);pair.append(figure);}
 frame.append(pair);
 const tools=document.createElement('div');tools.className='editing-detail-tools';tools.append(inspectorDetails,stateDetails);
 panel.append(frame,tools);document.querySelector('.panels').replaceChildren(panel);setupComparison(panel,Number(new URLSearchParams(location.search).get('reveal')||50));
}
document.querySelector('.timeline-heading strong').textContent='Playback';
let sourceLoading, inspectorLoading;
codeDetails.addEventListener('toggle',()=>{if(codeDetails.open&&metadata)loadCode().catch(error=>{if(!disposed){$('code-note').textContent=`Code unavailable: ${error.message}. Close and reopen to retry.`;}});});
inspectorDetails.addEventListener('toggle',()=>{if(inspectorDetails.open&&ready)prepareInspector().catch(error=>{if(!disposed){$('frustum-info').textContent=`Inspector unavailable: ${error.message}. Close and reopen to retry.`;}});});

function notifyParent(type, details = {}) {
  if (embedded && parent !== window) parent.postMessage({ type, caseId, ...details }, location.origin);
}

function fail(error) {
  if (disposed) return;
  console.error(error);
  if(error.resource)console.error('Case resource failure',{caseId,selectionId,resource:error.resource,attempts:error.attempts});
  stopped = true;
  video.pause();
  status.classList.add('error');
  status.textContent = `Unable to display this case: ${error.message}`;
  document.documentElement.dataset.workbenchState='error';
  document.querySelector('.workbench-boot').textContent=status.textContent;
  document.querySelector('.workbench').inert=true;
  document.querySelector('.workbench').setAttribute('aria-hidden','true');
  $('play').textContent = 'Play';
  notifyParent('bf-error', { message: status.textContent,resource:error.resource||'',attempts:error.attempts||0 });
  dispose();
}

function playbackError(error) {
  if(disposed)return;
  pause();
  // A user pause/seek can reject a pending play promise; that is not a broken scene.
  if(error.name==='AbortError')return;
  status.textContent=`Playback paused: ${error.message}. Try Play again.`;
  notifyParent('bf-warning',{message:status.textContent});
}

async function loadCode(){
 if(sourceFiles)return;
 if(sourceLoading)return sourceLoading;
 sourceLoading=(async()=>{
  sourceFiles=await Promise.all(metadata.sources.map(async entry=>{
   const text=await readResource(sourceBase+entry.path,{signal:lifetime.signal,type:'text',label:`Source ${entry.name}`});
   return {...entry,text};
  }));
  lifetime.signal.throwIfAborted();
  sourcePresentation=codePresentation(sourceFiles,metadata.provenance?.selected_variant,metadata.provenance?.runtime_parameters,displayVariantNames);
  sourceFiles=sourcePresentation.files;
  $('source-file').replaceChildren();
  sourceFiles.forEach((entry,index)=>{const option=document.createElement('option');option.value=index;option.textContent=sourcePresentation.label(entry);$('source-file').append(option);});
  selectedSource=sourceFiles[0];sourceLines=selectedSource.text.split('\n');showCode();
 })();
 try{await sourceLoading;}catch(error){sourceFiles=null;throw error;}finally{sourceLoading=null;}
}

async function prepareInspector(){
 if(inspector||inspectorLoading)return;
 inspectorLoading=true;pause();$('play').disabled=true;slider.disabled=true;
 $('frustum-info').textContent='Preparing 3D view…';
 const savedTime=currentTime,trajectory=[];
 frameHost.contentWindow.__bfSampling=true;
 try{
  // Preserve exact camera samples, but yield between small batches instead of
  // blocking a single task with hundreds of WebGL renders on initial open.
  for(let frame=0;frame<=LAST_FRAME;frame++){
   if(!inspectorDetails.open)return;
   lifetime.signal.throwIfAborted();sceneAPI.seek(frame/FPS);
   trajectory.push({frame,time:frame/FPS,...getCameraState()});
   if(frame%4===3)await new Promise(resolve=>setTimeout(resolve,0));
  }
  lifetime.signal.throwIfAborted();inspector=createInspector(trajectory);
  $('inspector-width').disabled=false;
 }finally{
  inspectorLoading=false;
  if(!disposed){frameHost.contentWindow.__bfSampling=false;sceneAPI.seek(savedTime);$('play').disabled=false;slider.disabled=false;draw(savedTime);}
 }
}

async function json(url) {
  return readResource(url,{signal:lifetime.signal,label:url.endsWith('case.json')?`Case ${caseId} scene metadata`:'Case catalog'});
}

function phase(time) {
  if (caseId === '505') return time <= 1.18 ? 0 : time <= 4.42 ? 1 : 2;
  return 0;
}

function tokenize(line, element) {
  const pattern = /(\/\/.*$|'[^']*'|"[^"]*"|\b(?:const|let|return|if|else|function|new|true|false)\b|\b\d+(?:\.\d+)?\b)/g;
  let offset = 0;
  for (const match of line.matchAll(pattern)) {
    element.append(document.createTextNode(line.slice(offset, match.index)));
    const token = document.createElement('span');
    const text = match[0];
    token.className = 'syntax-' + (text.startsWith('//') ? 'comment'
      : /^['"]/.test(text) ? 'string' : /^\d/.test(text) ? 'number' : 'keyword');
    token.textContent = text;
    element.append(token);
    offset = match.index + text.length;
  }
  element.append(document.createTextNode(line.slice(offset)));
}

function showCode() {
  if(!selectedSource)return;
  $('code-note').textContent=sourcePresentation.note(selectedSource);
  $('source-code').dataset.caseId=caseId;
  $('source-code').dataset.variant=String(metadata.provenance?.selected_variant||'');
  $('source-code').dataset.sourcePath=selectedSource.path;
  const container = $('source-code');
  container.replaceChildren();
  for (let number = 1; number <= sourceLines.length; number++) {
      const line = document.createElement('span');
      line.className = 'code-line';
      line.dataset.line = number;
      const num = document.createElement('span');
      num.className = 'line-number';
      num.textContent = number;
      line.append(num);
      tokenize(sourceLines[number - 1], line);
      container.append(line);
  }
  highlight(currentTime, true);
  navigateSource();
}

let lastHighlight = '';
function categoryPattern() {
  return section === 'camera' ? /camera|renderAt|updateScene|updateAt|seek/i
    : section === 'actor' ? /samurai|actor|robot|object|motion|animate|update/i
      : /light|effect|rain|particle|material/i;
}

function navigateSource() {
  const pattern = categoryPattern();
  const match = selectedSource.functions.find((entry) => pattern.test(entry.name));
  const number = match?.line || sourceLines.findIndex((line) => pattern.test(line)) + 1;
  if (number > 0) scrollToLine(number);
}

function scrollToLine(number) {
  const line = $('source-code').children[number - 1];
  if (line) $('source-code').scrollTop = line.offsetTop - $('source-code').firstElementChild.offsetTop - 30;
}

function highlight(time, force = false) {
  if(!selectedSource||!codeDetails.open)return;
  const key = section + [...trace].join(',');
  if (!force && key === lastHighlight) return;
  lastHighlight = key;
  const entries = selectedSource.functions.filter((entry) => trace.has(entry.line));
  const selected = new Set(entries.map((entry) => entry.line));
  for (const line of $('source-code').children) {
    const active = selected.has(+line.dataset.line);
    line.classList.toggle('active', active);
  }
  const firstActive = entries.find((entry) => categoryPattern().test(entry.name));
  if ($('follow-code').checked && firstActive) {
    scrollToLine(firstActive.line);
  }
}

function draw(time) {
  frameHost.contentWindow.__bfTrace = new Set();
  sceneAPI.seek(time);
  trace = frameHost.contentWindow.__bfTrace;
  currentTime = time;
  currentFrame = Math.min(LAST_FRAME, Math.max(0, Math.floor(time * FPS + 0.00001)));
  if (!seeking) slider.value = currentFrame;
  if(stateDetails.open){
  const cameraState = getCameraState();
  const intrinsics = cameraState.intrinsics;
  const orthographic = intrinsics.projection === 'orthographic';
  $('state-phase').textContent = phaseNames[phase(time)];
  $('state-camera').textContent = cameraState.position.map((v) => v.toFixed(2)).join(', ');
  $('state-fov').textContent = orthographic
    ? `Orthographic · ${intrinsics.viewHeight.toFixed(2)} units high`
    : `${intrinsics.verticalFov.toFixed(2)}°`;
  $('filming-hfov').textContent = orthographic
    ? `Orthographic · ${intrinsics.viewWidth.toFixed(2)} units wide`
    : `${intrinsics.horizontalFov.toFixed(2)}°`;
  $('filming-aspect').textContent = intrinsics.aspect.toFixed(4);
  $('filming-zoom').textContent = intrinsics.zoom.toFixed(3);
  $('filming-clip').textContent = `${intrinsics.near.toFixed(3)} / ${intrinsics.far.toFixed(2)}`;
  $('filming-size').textContent = `${intrinsics.width} × ${intrinsics.height}`;
  $('filming-focal').textContent = `${intrinsics.fx.toFixed(2)} / ${intrinsics.fy.toFixed(2)} ${orthographic ? 'px per unit' : 'px'}`;
  $('filming-center').textContent = `${intrinsics.cx.toFixed(2)} / ${intrinsics.cy.toFixed(2)} px`;
  $('state-world').textContent = `${time.toFixed(3)} s`;
  $('state-rotation').textContent = cameraState.quaternion.map((v) => v.toFixed(2)).join(', ');
  }
  $('time-label').textContent = `${time.toFixed(3)} s / ${((LAST_FRAME + 1) / FPS).toFixed(3)} s`;
  $('frame-label').textContent = `Frame ${currentFrame} / ${LAST_FRAME}`;
  document.querySelectorAll('.phases button').forEach((button, index) => {
    button.classList.toggle('active', index === phase(time));
  });
  highlight(time);
  if(inspectorDetails.open)inspector?.draw();
}

function getCameraState() {
  const { THREE, camera } = runtime;
  const canvas = sceneAPI.displayCanvas || runtime.renderer.domElement;
  camera.updateWorldMatrix(true, false);
  return { position: camera.getWorldPosition(new THREE.Vector3()).toArray(),
    quaternion: camera.getWorldQuaternion(new THREE.Quaternion()).toArray(), fov: camera.fov,
    intrinsics: cameraIntrinsics(camera, canvas.width, canvas.height) };
}

function cancelClock() {
  if (videoCallback !== null) video.cancelVideoFrameCallback(videoCallback);
  if (animationCallback !== null) cancelAnimationFrame(animationCallback);
  videoCallback = animationCallback = null;
}

function pause(preserveIntent=false) {
  if(!preserveIntent)playIntent++;
  stopped = true;
  video.pause();
  cancelClock();
  $('play').textContent = 'Play';
}

function clock() {
  if (stopped) return;
  if ('requestVideoFrameCallback' in video) {
    videoCallback = video.requestVideoFrameCallback((_, frame) => {
      videoCallback = null;
      draw(Math.min(LAST_FRAME / FPS, frame.mediaTime));
      clock();
    });
  } else {
    animationCallback = requestAnimationFrame(() => {
      animationCallback = null;
      draw(Math.min(LAST_FRAME / FPS, video.currentTime));
      clock();
    });
  }
}

async function play() {
  if (!ready || seeking || inspectorLoading) return;
  const intent=++playIntent;
  try {
    if (currentFrame === LAST_FRAME || video.ended) await requestSeek(0,true);
    if(intent!==playIntent||disposed)return;
    lifetime.signal.throwIfAborted();
    stopped = false;
    clock();
    await video.play();
    if(intent!==playIntent||disposed)return;
    if(!stopped){$('play').textContent = 'Pause';notifyParent('bf-warning',{message:''});}
  } catch (error) {
    if(intent!==playIntent||disposed)return;
    cancelClock();
    playbackError(error);
  }
}

function seekVideo(time) {
  if (Math.abs(video.currentTime - time) < 0.0001 && !video.seeking) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Video seek timed out')), 15000);
    const seeked = () => finish();
    const error = () => finish(new Error('Video seek failed'));
    const aborted = () => finish(lifetime.signal.reason);
    function finish(reason) {
      clearTimeout(timeout);
      video.removeEventListener('seeked', seeked);
      video.removeEventListener('error', error);
      lifetime.signal.removeEventListener('abort', aborted);
      if (reason) reject(reason); else resolve();
    }
    video.addEventListener('seeked', seeked);
    video.addEventListener('error', error);
    lifetime.signal.addEventListener('abort', aborted, { once: true });
    video.currentTime = time;
  });
}

async function requestSeek(frame,preservePlayIntent=false) {
  if (!ready || inspectorLoading) return;
  pause(preservePlayIntent);
  pendingFrame = Math.min(LAST_FRAME, Math.max(0, Math.round(frame)));
  if (seeking) return;
  seeking = true;
  $('play').disabled = true;
  try {
    while (pendingFrame !== null) {
      const target = pendingFrame;
      pendingFrame = null;
      await seekVideo(target / FPS);
      lifetime.signal.throwIfAborted();
      draw(target / FPS);
      slider.value = target;
    }
  } catch (error) {
    pendingFrame = null;
    playbackError(error);
  } finally {
    seeking = false;
    $('play').disabled = false;
  }
}

function createInspector(trajectory) {
  const { THREE, scene, camera, renderer } = runtime;
  const stage = $('world-stage');
  const view = new THREE.WebGLRenderer({ antialias: true });
  view.__bfInspector = true;
  view.setPixelRatio(1);
  view.setSize(stage.clientWidth, stage.clientHeight, false);
  view.outputColorSpace = renderer.outputColorSpace;
  view.toneMapping = renderer.toneMapping;
  view.shadowMap.enabled = true;
  view.shadowMap.type = renderer.shadowMap.type;
  stage.append(view.domElement);
  const points = trajectory.map((entry) => new THREE.Vector3(...entry.position));
  const bounds = new THREE.Box3().setFromPoints(points);
  const span = Math.max(3, bounds.getSize(new THREE.Vector3()).length());
  const target = bounds.getCenter(new THREE.Vector3());
  const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.getWorldQuaternion(new THREE.Quaternion()));
  target.addScaledVector(forward, Math.min(span * .25, 4));
  if (caseId === '505') target.set(0, 1.2, 0);
  const referenceDistance = caseId === '505' ? 9 : Math.max(7, span * 1.1);
  let horizontalFov = INSPECTOR_HORIZONTAL_FOV;
  const initialAspect = stage.clientWidth / stage.clientHeight;
  const observer = new THREE.PerspectiveCamera(
    verticalFov(horizontalFov, initialAspect), initialAspect, .1, camera.far
  );
  // Narrow the lens without cropping away the previously visible vertical scene extent.
  const fittedDistance = () => referenceDistance * Math.tan(Math.PI / 8)
    / Math.tan(verticalFov(INSPECTOR_HORIZONTAL_FOV, observer.aspect) * Math.PI / 360);
  let defaultDistance = fittedDistance();
  observer.far = Math.max(camera.far, defaultDistance * 6);
  observer.updateProjectionMatrix();
  observer.layers.enable(31);
  const inspectionLight = new THREE.HemisphereLight(0xddeeff, 0x67788a, 3);
  inspectionLight.layers.set(31);
  scene.add(inspectionLight);
  const inspectionKey = new THREE.DirectionalLight(0xffffff, 5);
  inspectionKey.layers.set(31);
  inspectionKey.position.copy(target).add(new THREE.Vector3(span, span * 2, span));
  inspectionKey.target.position.copy(target);
  scene.add(inspectionKey.target);
  scene.add(inspectionKey);
  const overlay = new THREE.Scene();
  const displayCamera = camera.clone(false);
  const helper = new THREE.CameraHelper(displayCamera);
  overlay.add(helper);
  const grid = new THREE.GridHelper(span * 2, 20, 0x71a9dd, 0x3c4e66);
  grid.position.set(target.x, .03, target.z);
  grid.material.transparent = true;
  grid.material.opacity = .35;
  overlay.add(grid);
  const path = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: 0x42caff })
  );
  overlay.add(path);
  const marker = new THREE.Mesh(
    new THREE.SphereGeometry(span * .012, 12, 8),
    new THREE.MeshBasicMaterial({ color: 0xffc857 })
  );
  overlay.add(marker);
  let azimuth = .25, elevation = .5, distance = defaultDistance;
  function drawInspector() {
    observer.position.set(
      Math.sin(azimuth) * Math.cos(elevation) * distance,
      Math.sin(elevation) * distance,
      Math.cos(azimuth) * Math.cos(elevation) * distance
    ).add(target);
    observer.lookAt(target);
    displayCamera.copy(camera, false);
    displayCamera.far = Math.min(camera.far, Math.max(camera.near * 1.01, 4, span * .6));
    camera.getWorldPosition(displayCamera.position);
    camera.getWorldQuaternion(displayCamera.quaternion);
    displayCamera.updateProjectionMatrix();
    displayCamera.updateMatrixWorld();
    helper.update();
    const observerIntrinsics = perspectiveIntrinsics(observer, view.domElement.width, view.domElement.height);
    $('inspector-width-value').textContent = `${horizontalFov}°`;
    $('inspector-width').setAttribute('aria-valuetext', `${horizontalFov} degrees horizontal field of view`);
    $('inspector-fov').textContent = `${observerIntrinsics.horizontalFov.toFixed(2)}° / ${observerIntrinsics.verticalFov.toFixed(2)}°`;
    $('inspector-aspect').textContent = observerIntrinsics.aspect.toFixed(4);
    $('inspector-zoom').textContent = observerIntrinsics.zoom.toFixed(3);
    $('inspector-clip').textContent = `${observer.near.toFixed(3)} / ${observer.far.toFixed(2)}`;
    $('frustum-info').textContent = `Filming frustum display: ${displayCamera.near.toFixed(3)}–${displayCamera.far.toFixed(2)} units; actual filming far plane: ${camera.far.toFixed(2)}.`;
    camera.getWorldPosition(marker.position);
    view.toneMappingExposure = 1.4;
    view.autoClear = true;
    view.clippingPlanes = $('cutaway').checked
      ? [new THREE.Plane(new THREE.Vector3(0, -1, 0), target.y + 1)] : [];
    const fog = scene.fog;
    try {
      scene.fog = null;
      view.render(scene, observer);
    } finally {
      scene.fog = fog;
    }
    view.clippingPlanes = [];
    view.autoClear = false;
    view.render(overlay, observer);
  }
  let pointer;
  stage.addEventListener('pointerdown', (event) => {
    pointer = { x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
  });
  stage.addEventListener('pointermove', (event) => {
    if (!pointer) return;
    azimuth -= (event.clientX - pointer.x) * .006;
    elevation = Math.max(.08, Math.min(1.4, elevation + (event.clientY - pointer.y) * .006));
    pointer = { x: event.clientX, y: event.clientY };
    drawInspector();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((event) => {
    stage.addEventListener(event, () => { pointer = null; });
  });
  stage.addEventListener('wheel', (event) => {
    event.preventDefault();
    distance = Math.max(defaultDistance * .1, Math.min(defaultDistance * 5, distance * Math.exp(event.deltaY * .001)));
    drawInspector();
  }, { passive: false });
  stage.addEventListener('keydown', (event) => {
    if (!event.key.startsWith('Arrow')) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'ArrowLeft') azimuth -= .1;
    if (event.key === 'ArrowRight') azimuth += .1;
    if (event.key === 'ArrowUp') elevation = Math.min(1.4, elevation + .1);
    if (event.key === 'ArrowDown') elevation = Math.max(.08, elevation - .1);
    drawInspector();
  });
  $('reset-view').addEventListener('click', () => {
    horizontalFov = INSPECTOR_HORIZONTAL_FOV;
    $('inspector-width').value = horizontalFov;
    observer.fov = verticalFov(horizontalFov, observer.aspect);
    observer.updateProjectionMatrix();
    azimuth = .25; elevation = .5; distance = defaultDistance; drawInspector();
  });
  $('inspector-width').addEventListener('input', () => {
    horizontalFov = $('inspector-width').valueAsNumber;
    observer.fov = verticalFov(horizontalFov, observer.aspect);
    observer.updateProjectionMatrix();
    drawInspector();
  });
  $('cutaway').addEventListener('change', drawInspector);
  for (const [id, object] of [['show-frustum', helper], ['show-path', path], ['show-grid', grid]]) {
    $(id).addEventListener('change', () => { object.visible = $(id).checked; drawInspector(); });
  }
  resizeObserver = new ResizeObserver(() => {
    if (!stage.clientWidth || !stage.clientHeight) return;
    const zoomRatio = distance / defaultDistance;
    view.setSize(stage.clientWidth, stage.clientHeight, false);
    observer.aspect = stage.clientWidth / stage.clientHeight;
    observer.fov = verticalFov(horizontalFov, observer.aspect);
    defaultDistance = fittedDistance();
    distance = defaultDistance * zoomRatio;
    observer.far = Math.max(camera.far, defaultDistance * 6);
    observer.updateProjectionMatrix();
    drawInspector();
  });
  resizeObserver.observe(stage);
  return { draw: drawInspector,
    getState: () => ({
      ...perspectiveIntrinsics(observer, view.domElement.width, view.domElement.height),
      distance, displayNear: displayCamera.near, displayFar: displayCamera.far,
      displayAspect: displayCamera.aspect, displayZoom: displayCamera.zoom,
    }),
    dispose: () => {
    scene.remove(inspectionLight);
    scene.remove(inspectionKey);
    scene.remove(inspectionKey.target);
    view.dispose();
    view.forceContextLoss();
  } };
}

async function init() {
  const [catalog, publishedScene] = await Promise.all([
    json('static/interactive/catalog.json'),
    resolvePublishedScene(caseId, selectionId, lifetime.signal)
  ]);
  lifetime.signal.throwIfAborted();
  if (!catalog.cases.some((entry) => entry.case_id === caseId)) throw new Error('Unknown case');
  const { item, selection, asset: experimentAsset, expectedSHA } = publishedScene;
  displayName = selection?.display_name || item.display_name || 'Selected_Result';
  const choices = new Map();
  for (const entry of catalog.cases.filter(entry => entry.display_name)) {
    const choice = entry.case_id === caseId
      ? {...entry, display_name: displayName}
      : entry;
    if (!choices.has(choice.display_name) || choice.case_id === caseId) {
      choices.set(choice.display_name, choice);
    }
  }
  const currentEntry = catalog.cases.find(entry => entry.case_id === caseId);
  if (currentEntry && !choices.has(displayName)) {
    choices.set(displayName, {...currentEntry, display_name: displayName});
  }
  for (const entry of choices.values()) {
    const option = document.createElement('option');
    option.value = entry.case_id;
    option.textContent = entry.display_name;
    option.selected = entry.case_id === caseId;
    $('case-picker').append(option);
  }
  sourceBase = publishedScene.base;
  metadata = await json(sourceBase + 'case.json');
  lifetime.signal.throwIfAborted();
  FPS = metadata.fps;
  LAST_FRAME = metadata.frames - 1;
  slider.max = LAST_FRAME;
  if (caseId === '505') {
    phaseNames = ['Strike', 'Frozen world / orbit', 'Release'];
    phaseFrames = [0, 29, 107];
  }
  if (phaseNames.length > 1) {
    const phases = document.querySelector('.phases');
    phaseNames.forEach((name, index) => {
      const button = document.createElement('button');
      button.textContent = name;
      button.dataset.frame = phaseFrames[index];
      button.addEventListener('click', () => requestSeek(phaseFrames[index]));
      phases.append(button);
    });
    phases.hidden = false;
  }
  if (metadata.case_id !== caseId || expectedSHA !== metadata.threejs_sha256) {
    throw new Error('Published Three.js video no longer matches this source package');
  }
  if (selectionId) {
    if (experimentAsset.frames !== metadata.frames || experimentAsset.fps !== metadata.fps) {
      throw new Error('Experiment selection is unavailable or does not match the original scene');
    }
    if (!experimentAsset.video.startsWith('experiment-pairs/') || experimentAsset.video.includes('..')) {
      throw new Error('Invalid experiment media path');
    }
    video.setAttribute('aria-label', `${displayName} / ${selection.label} / ${experimentAsset.origin}`);
  }
  $('case-heading').textContent = `CODE VIDEO MODEL / ${displayName}`;
  $('cutaway').checked = ['Architectural Cinematics', 'Scene / World Editing'].includes(item.session);
  $('source-file').addEventListener('change', () => {
    selectedSource = sourceFiles[+$('source-file').value];
    sourceLines = selectedSource.text.split('\n');
    showCode();
  });
  if(codeDetails.open)loadCode().catch(error=>{$('code-note').textContent=error.message;});
  const prepareMedia=async()=>{
  const mediaPath = 'static/project-page-cases/' + (experimentAsset?.video || item.display_code_video_model || item.code_video_model_v2 || item.code_video_model);
  const mediaBlob = await readResource(mediaPath,{signal:lifetime.signal,type:'blob',label:`${displayName} result video`,timeoutMs:20000});
  lifetime.signal.throwIfAborted();
  videoObjectURL = URL.createObjectURL(mediaBlob);
  video.dataset.source = mediaPath;
  video.dataset.selection = selectionId;
  const mediaReady = new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('Video loading timed out')), 60000);
    const loaded = () => finish();
    const error = () => finish(new Error('Selected video is unavailable'));
    const aborted = () => finish(lifetime.signal.reason);
    function finish(reason) {
      clearTimeout(timer);
      video.removeEventListener('loadeddata', loaded);
      video.removeEventListener('error', error);
      lifetime.signal.removeEventListener('abort', aborted);
      if (reason) reject(reason); else resolve();
    }
    video.addEventListener('loadeddata', loaded);
    video.addEventListener('error', error);
    lifetime.signal.addEventListener('abort', aborted, { once: true });
  });
  video.src = videoObjectURL;
  await mediaReady;
  };
  await Promise.all([loadScene(), prepareMedia()]);
  lifetime.signal.throwIfAborted();
  if (experimentAsset && (video.videoWidth !== experimentAsset.width || video.videoHeight !== experimentAsset.height)) {
    throw new Error('Experiment video dimensions do not match the published selection');
  }
  if (video.duration + .05 < LAST_FRAME / FPS) throw new Error('Result video is shorter than the scene timeline');
  $('proxy-stage').append(sceneAPI.displayCanvas || runtime.renderer.domElement);
  runtime.renderer.domElement.addEventListener('webglcontextlost', (event) => {
    event.preventDefault(); fail(new Error('WebGL context lost; reload this page'));
  });
  draw(0);
  ready = true;
  for (const id of ['timeline', 'play', 'previous', 'next', 'sound']) $(id).disabled = false;
  if(inspectorDetails.open)prepareInspector().catch(error=>{$('frustum-info').textContent=error.message;});
  status.textContent = `${displayName} · ${FPS} FPS · ${metadata.frames} frames · Original Three.js source`;
  // Expose deterministic controls for browser regression checks.
  window.behindFrame = {
    seek: requestSeek,
    pause,
    dispose,
    getState: () => ({
      frame: currentFrame, seeking, paused: stopped,
      videoTime: video.currentTime,
      caseId, selectionId, displayName, sourceBase, threejsSHA: metadata.threejs_sha256,
      camera: getCameraState(), inspector: inspector?.getState() || null, trace: [...trace],
      world: { time: currentTime }
    })
  };
  // Do not reveal the legacy HTML while the modules/media are still preparing.
  // Opacity preserves geometry and media rendering while the boot cover stays up.
  await new Promise(resolve=>setTimeout(resolve,0));
  lifetime.signal.throwIfAborted();
  paintGlass();
  document.documentElement.dataset.workbenchState='ready';
  document.querySelector('.workbench').inert=false;
  document.querySelector('.workbench').removeAttribute('aria-hidden');
  notifyParent('bf-ready');
}

async function loadScene() {
  frameHost = document.createElement('iframe');
  frameHost.className = 'scene-host';
  frameHost.title = `${displayName} isolated original scene`;
  frameHost.setAttribute('aria-hidden', 'true');
  frameHost.tabIndex = -1;
  frameHost.width = metadata.width;
  frameHost.height = metadata.height;
  frameHost.src = sourceBase + metadata.entry;
  document.body.append(frameHost);
  await new Promise((resolve, reject) => {
    const started = performance.now();
    const aborted = () => finish(lifetime.signal.reason);
    function finish(error) {
      clearInterval(poll);
      lifetime.signal.removeEventListener('abort', aborted);
      if (error) reject(error); else resolve();
    }
    const poll = setInterval(() => {
      const child = frameHost.contentWindow;
      if (child.__bfErrors?.length) { finish(new Error(child.__bfErrors.join('; '))); return; }
      if (child.reconstruction?.seek && child.__bfCapture) {
        child.__bfStopLoops();
        sceneAPI = child.reconstruction;
        runtime = child.__bfCapture;
        finish();
      } else if (performance.now() - started > 60000) {
        finish(new Error('Original scene failed to initialize'));
      }
    }, 100);
    lifetime.signal.addEventListener('abort', aborted, { once: true });
  });
}

slider.addEventListener('input', () => requestSeek(+slider.value));
$('play').addEventListener('click', () => stopped ? play() : pause());
$('previous').addEventListener('click', () => requestSeek(currentFrame - 1));
$('next').addEventListener('click', () => requestSeek(currentFrame + 1));
$('sound').addEventListener('click', () => {
  video.muted = !video.muted;
  $('sound').textContent = video.muted ? 'Sound off' : 'Sound on';
  $('sound').setAttribute('aria-pressed', String(!video.muted));
});
document.querySelectorAll('[data-section]').forEach((button) => {
  button.addEventListener('click', () => {
    if (!ready) return;
    section = button.dataset.section;
    document.querySelectorAll('[data-section]').forEach((tab) => {
      tab.setAttribute('aria-pressed', String(tab === button));
    });
    showCode();
  });
});
video.addEventListener('ended', () => { pause(); draw(LAST_FRAME / FPS); });
video.addEventListener('error', () => { if (ready) fail(new Error('Video playback failed')); });
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
document.addEventListener('keydown', (event) => {
  if(event.defaultPrevented)return;
  if (embedded && event.key === 'Escape') {
    event.preventDefault();
    notifyParent('bf-close');
    return;
  }
  if (!ready || /^(INPUT|BUTTON|SELECT|SUMMARY|A)$/.test(event.target.tagName)) return;
  if (event.code === 'Space') { event.preventDefault(); stopped ? play() : pause(); }
  if (event.key === 'ArrowLeft') { event.preventDefault(); requestSeek(currentFrame - 1); }
  if (event.key === 'ArrowRight') { event.preventDefault(); requestSeek(currentFrame + 1); }
});
function dispose() {
  if (disposed) return;
  disposed = true;
  window.dispatchEvent(new Event('workbench-dispose'));
  lifetime.abort();
  pause();
  ready = false;
  pendingFrame = null;
  embedObserver?.disconnect();
  resizeObserver?.disconnect();
  inspector?.dispose();
  const captured = runtime || frameHost?.contentWindow?.__bfCapture;
  frameHost?.contentWindow?.__bfStopLoops?.();
  captured?.renderer.dispose();
  captured?.renderer.forceContextLoss();
  frameHost?.remove();
  video.removeAttribute('src');
  video.load();
  if (videoObjectURL) URL.revokeObjectURL(videoObjectURL);
}
window.addEventListener('pagehide', dispose);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) location.reload();
});
if (embedded) {
  embedObserver = new ResizeObserver(() => {
    notifyParent('bf-size', { height: Math.ceil(document.querySelector('.workbench').getBoundingClientRect().height) + 4 });
  });
  embedObserver.observe(document.querySelector('.workbench'));
}
init().catch(fail);
