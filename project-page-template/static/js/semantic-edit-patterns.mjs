// Read-only, constrained source projections. No eval, generated scene state, or
// case-number lookup table: every displayed value/call is extracted from source.
function source(snapshot){return snapshot.files.filter(f=>!f.generatedAdapter).map(f=>f.text).join('\n');}
const compact=s=>s.trim().replace(/\s+/g,' ');
function reference(snapshot,fragment){
 for(const file of snapshot.files){const index=file.text.indexOf(fragment);if(index>=0)return {path:file.path,line:file.text.slice(0,index).split('\n').length,text:fragment};}
 throw new Error('Semantic excerpt has no source evidence');
}
function field(snapshot,text,evidence){return {text,reference:reference(snapshot,evidence)};}
function commonLines(a,b,pattern,limit=2){
 return source(a).split('\n').filter(l=>pattern.test(l)&&source(b).includes(l)).slice(0,limit).map(l=>compact(l));
}
function result(title,a,b,leading=[],trailing=[],notes=[]){
 const rows=leading.map(text=>({kind:'context',text}));const evidence=[];
 for(const key of [...new Set([...Object.keys(a),...Object.keys(b)])].sort()){
  if(a[key]?.text===b[key]?.text)continue;
  for(const [side,kind,entry] of [['before','remove',a[key]],['after','add',b[key]]])if(entry){rows.push({kind,text:entry.text,changeKey:key,reference:{side,...entry.reference}});evidence.push({side,...entry.reference});}
 }
 if(!evidence.length)return null;
 rows.push(...notes.map(text=>({kind:'context',text})),...trailing.map(text=>({kind:'context',text})));
 return {title,rows,evidence};
}

function selectedVisibility(snapshot){
 const text=source(snapshot),variant=String(snapshot.variant||'');if(!/^\d+$/.test(variant))return null;
 const fields={};let selected=false;
 for(const m of text.matchAll(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)\.visible\s*=\s*(variant|activeVariant|id)\s*===\s*['"](\d+)['"]/g)){
  if(!['humanoid','quadruped','human','dog','archState','doorState','rectangularState'].some(name=>m[1]===name||m[1].startsWith(name+'.')))continue;
  fields[m[1]]=field(snapshot,`${m[1]}.visible = ${variant===m[3]};`,m[0]);
  selected ||= variant===m[3];
 }
 if(Object.keys(fields).length>=2&&selected)return {fields,context:[]};
 const rigs=text.match(/const rigs\s*=\s*\{([^}]+)\}/);
 const loop=text.match(/rig\.(rig|group)\.visible\s*=\s*id\s*===\s*(?:activeVariant|variant)/);
 if(rigs&&loop){
  const context=[];
  for(const m of rigs[1].matchAll(/['"](\d+)['"]\s*:\s*(humanoid|quadruped)\(\)/g)){
   const key=`rigs['${m[1]}']`;
   context.push(`${key} = ${m[2]}();`);
   fields[key]=field(snapshot,`${key}.${loop[1]}.visible = ${variant===m[1]};`,m[0]);
   selected ||= variant===m[1];
  }
  if(Object.keys(fields).length===2&&selected)return {fields,context};
 }
 return null;
}

function objectPose(snapshot,tableName,root){
 const text=source(snapshot),id=String(snapshot.variant||'');if(!/^\d+$/.test(id))return null;
 const table=text.match(new RegExp('const '+tableName+'\\s*=\\s*\\{([\\s\\S]*?)\\n\\};'));
 if(!table||!text.includes(root+'.position.set('))return null;
 const pose=table[1].match(new RegExp("'"+id+"':\\s*\\{\\s*position:\\s*\\[([^\\]]+)\\],\\s*yaw:\\s*([^}]+)\\}"));
 if(!pose||!text.includes(root+'.rotation.set('))return null;
 return {position:field(snapshot,`${root}.position.set(${pose[1].replace(/\s/g,'')});`,pose[0]),rotation:field(snapshot,`${root}.rotation.y = ${pose[2].trim()};`,pose[0])};
}

function routeState(snapshot){
 const text=source(snapshot),variant=String(snapshot.variant||'');
 if(/^\d+$/.test(variant)&&/const paths\s*=\s*\{/.test(text)&&text.includes('paths[variant]')){
  const m=text.match(new RegExp("'"+variant+"':\\s*new THREE.CatmullRomCurve3\\(\\[([\\s\\S]*?)\\]"));
  if(m){
   const points=[...m[1].matchAll(/v3\(([^)]+)\)/g)].map(p=>`v3(${p[1].replace(/\s/g,'')})`);
   return {points,prefix:'path.points',offset:1,evidence:m[0],context:'// Selected path · control-point excerpt'};
  }
 }
 // Gallery route: selected arrays are x/z ground-plane control points.
 const dictionary=text.match(/const routePoints\s*=\s*\{([\s\S]*?)\n\};/);
 if(dictionary&&/^\d+$/.test(variant)&&/routePoints\[id\]\.map\(p=>new THREE.Vector3\(p\[0\],0,p\[1\]\)\)/.test(text)){
  const m=dictionary[1].match(new RegExp("'"+variant+"':\\s*(\\[\\[[^\\n]+\\]\\])"));
  if(!m)return null;
  const points=[...m[1].matchAll(/\[(-?[\d.]+),\s*(-?[\d.]+)\]/g)].map(p=>p[0]);
  return {points,prefix:'routePoints[variant]',evidence:m[0],context:'// Selected ground-plane route (x, z)'};
 }
 // Older individually authored source has a concrete array, not a variant API.
 const array=text.match(/const routePoints\s*=\s*\[([\s\S]*?)\n\];/);
 if(array&&text.includes('routeCurve.getPointAt')){
  const points=[...array[1].matchAll(/new THREE\.Vector3\(([^)]+)\)/g)].map(p=>`new THREE.Vector3(${p[1].replace(/\s/g,'')})`);
  return {points,prefix:'routePoints',evidence:array[0],context:'// Route control points (x, y, z)'};
 }
 return null;
}

function legacyRobot(snapshot){
 const text=source(snapshot);
 const constructor=text.match(/const (robot|dog|humanoid)\s*=\s*((?:create|add)(?:RobotDog|HumanoidRobot|Humanoid))\(\);/);
 if(!constructor)return null;
 const fields={constructor:field(snapshot,compact(constructor[0]),constructor[0])};
 const motion=text.match(/^\s*(updateDog|updateHumanoid)\(time\);/m);
 if(motion)fields.motion=field(snapshot,compact(motion[0]),motion[0]);
 return fields;
}

export function expandedSemanticDiff(before,after){
 const a=source(before),b=source(after);
 const visibleA=selectedVisibility(before),visibleB=selectedVisibility(after);
 if(visibleA&&visibleB){
  const architecture=Object.hasOwn(visibleA.fields,'archState');
  const heading=architecture?'Partition opening geometry':'Robot embodiment';
  const motion=architecture?[]:commonLines(before,after,/^\s*robot(?:Rig|Root)\.position\.(?:copy|fromArray)\([^;]+\);\s*$/,1);
  return result(heading,visibleA.fields,visibleB.fields,visibleA.context.length?visibleA.context:[...motion,architecture?'// Partition opening geometry':'// Select the visible robot rig'],
   commonLines(before,after,/^\s*(?:renderer\.render\(scene,\s*camera\)|(?:poseRobots|animateRig)\([^;]+\));\s*$/,1));
 }
 for(const [table,root,title] of [['chairStates','chair','Chair position & orientation'],['variantPoses','movedCarRoot','Car position & orientation']]){
  const poseA=objectPose(before,table,root),poseB=objectPose(after,table,root);
  if(poseA&&poseB){
   const construction=root==='chair'?commonLines(before,after,/^const chair = makeChair\(scene\);$/,1):[];
   return result(title,poseA,poseB,[...construction,`// ${root}: selected transform`],commonLines(before,after,/^\s*(?:render\(time\)|renderer.render\(scene,\s*camera\));$/,1));
  }
 }

 const routeA=routeState(before),routeB=routeState(after);
 if(routeA&&routeB&&routeA.prefix===routeB.prefix){
  const indices=routeA.points.map((p,i)=>p!==routeB.points[i]?i:-1).filter(i=>i>=0).slice(0,2);
  const fieldsA={},fieldsB={};
  for(const i of indices){if(!routeB.points[i])return null;
   fieldsA[i]=field(before,`${routeA.prefix}[${i+(routeA.offset||0)}]=${routeA.points[i]};`,routeA.evidence);
   fieldsB[i]=field(after,`${routeB.prefix}[${i+(routeB.offset||0)}]=${routeB.points[i]};`,routeB.evidence);
  }
  return result('Route control points',fieldsA,fieldsB,[routeA.context],[],['// Excerpt · remaining points in source']);
 }

 const robotA=legacyRobot(before),robotB=legacyRobot(after);
 if(robotA&&robotB)return result('Robot model & locomotion',robotA,robotB,['// Build the articulated robot'],commonLines(before,after,/^\s*(?:buildRouteGuide|addHospitalEnvironment|renderer\.render)\(/,2));

 // Dining set addition/removal: only actual constructor calls differ. Absence
 // stays absence; never invent a visibility=false line that was not in source.
 if(a.includes('function makeTableSet(')&&b.includes('function makeTableSet(')){
  const get=s=>Object.fromEntries([...source(s).matchAll(/^makeTableSet\([^\n]+\);/gm)].map(m=>[m[0],field(s,m[0],m[0])]));
  const fa=get(before),fb=get(after),shared=Object.keys(fa).filter(k=>fb[k]);
  return result('Dining layout',fa,fb,['// Dining sets: placement and identity',...shared.slice(0,2)],[],['// Each set includes its table and chairs']);
 }
 if(a.includes('const shutterBottom')&&b.includes('const shutterBottom')){
  const get=s=>Object.fromEntries(['shutterBottom','slatCount'].map(name=>{const m=source(s).match(new RegExp('const '+name+'\\s*=\\s*[^;]+;'));return [name,m?field(s,compact(m[0]),m[0]):null];}).filter(([,v])=>v));
  return result('Loading-door opening',get(before),get(after),['// Shutter lower edge and panel count'],commonLines(before,after,/^const shutterTop\s*=/,1));
 }
 if(a.includes('leftDoor.rotation.y')&&b.includes('leftDoor.rotation.y')&&a.includes('rightDoor.rotation.y')&&b.includes('rightDoor.rotation.y')){
  const get=s=>Object.fromEntries(['leftDoor','rightDoor'].map(name=>{const m=source(s).match(new RegExp(name+'\\.rotation\\.y\\s*=\\s*[^;]+;'));return [name,m?field(s,compact(m[0]),m[0]):null];}).filter(([,v])=>v));
  const angle=(a+'\n'+b).match(/const angle\s*=\s*opening\s*\*\s*THREE.MathUtils.degToRad\((\d+)\)/)?.[1];
  return result('Double-door motion',get(before),get(after),[angle?`// Opening angle ramps up to ${angle}°`:'// Hinged door angles'],[],['// Zero rotation keeps the doors closed']);
 }
 return null;
}
