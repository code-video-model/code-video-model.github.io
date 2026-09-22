import * as T from './vendor/three.module.js';

// All detail is constructed once. No animation, random state, texture or network input.
export function furnish({world,statics,box,ell,rod,mesh,material,oak,walnut,ivory,linen,teal,terra,metal,green}){
  const added=[],modified=[],groups={};
  let category='';
  const clay=material('muted warm-grey ceramic','#aaa79d');
  const paper=material('uncoated paper clay','#ded7c3');
  const fabric=material('soft stone textile','#aaa897');
  const soil=material('dry soil clay','#756953');
  const leafLight=material('sage leaf clay','#83947b');
  const bookMats=[linen,teal,clay,terra,ivory,walnut];
  const register=o=>{added.push(o);(groups[category]??=[]).push(o);return o;};
  const b=(name,p,s,m=oak)=>register(box(`env/${category}/${name}`,p,s,m));
  const e=(name,p,s,m=linen)=>register(ell(`env/${category}/${name}`,p,s,m));
  const r=(name,a,c,radius,m=walnut)=>register(rod(`env/${category}/${name}`,a,c,radius,m));
  const m=(name,g,p,s,mat)=>register(mesh(g,mat,p,s,world,`env/${category}/${name}`));
  function ring(name,p,radius,tube,mat=ivory){
    const o=m(name,new T.TorusGeometry(radius,tube,8,28),p,[1,1,1],mat);
    o.rotation.x=Math.PI/2;return o;
  }
  function cup(name,p,radius,height,mat,handle=false){
    const profile=[[0,0],[radius*.88,0],[radius,height],[radius-.012,height],[radius-.014,.016],[0,.016]];
    m(name+' hollow cup',new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),24),p,[1,1,1],mat);
    if(handle){
      const o=m(name+' handle',new T.TorusGeometry(height*.28,.011,8,20),[p[0]+radius,p[1]+height*.56,p[2]],[1,1,1],mat);
      o.rotation.y=Math.PI/2;
    }
  }
  function book(name,p,s,mat,angle=0){
    const o=b(name+' page block',p,[s[0]-.012,s[1]-.010,s[2]-.014],paper);o.rotation.y=angle;
    for(const sign of[-1,1]){
      const cover=b(name+' cover',[p[0],p[1]+sign*s[1]/2,p[2]],[s[0],.008,s[2]],mat);cover.rotation.y=angle;
    }
  }
  function planter(name,x,y,z,size){
    const profile=[[0,0],[size*.63,0],[size,.95*size],[size-.018,.95*size],[size-.018,.82*size],[0,.82*size]];
    m(name+' pot',new T.LatheGeometry(profile.map(v=>new T.Vector2(...v)),20),[x,y,z],[1,1,1],clay);
    e(name+' soil',[x,y+size*.83,z],[size*.88,.013,size*.88],soil);
    for(let i=0;i<7;i++){
      const a=i*2.399,tip=[x+size*1.5*Math.cos(a),y+size*(2.1+(i%3)*.45),z+size*1.5*Math.sin(a)];
      r(name+' stem',[x,y+size*.9,z],tip,.006,green);
      const leaf=e(name+' leaf',tip,[size*.85,.018,size*.33],i%2?green:leafLight);
      leaf.rotation.set(.19*Math.cos(a),-a,.24*Math.sin(a));
    }
  }

  category='sideboard';
  b('low narrow cabinet',[1.78,.47,-3.91],[2.32,.66,.48],oak);
  b('overhanging top',[1.78,.823,-3.91],[2.40,.046,.54],walnut);
  for(const x of[.79,2.78])for(const z of[-4.06,-3.75])b('short inset leg',[x,.105,z],[.08,.21,.08],walnut);
  for(let i=0;i<3;i++){
    b('front panel',[1.01+i*.755,.475,-3.66],[.723,.58,.026],i===2?linen:oak);
    r('handle',[1.18+i*.755,.57,-3.638],[1.30+i*.755,.57,-3.638],.012,metal);
  }
  book('slightly offset magazine',[1.26,.866,-3.87],[.39,.033,.27],teal,.07);
  book('second magazine',[1.29,.902,-3.88],[.37,.027,.26],linen,-.09);
  e('shallow everyday bowl',[1.83,.891,-3.83],[.14,.045,.11],ivory);
  e('bowl keys',[1.83,.924,-3.83],[.065,.009,.019],metal);
  planter('small console plant',2.57,.852,-3.89,.12);

  category='floor-lamp';
  e('weighted base',[.63,.055,-3.27],[.235,.055,.235],metal);
  r('fixed stem',[.63,.08,-3.27],[.63,1.57,-3.27],.019,metal);
  const shade=new T.LatheGeometry([new T.Vector2(.29,0),new T.Vector2(.18,.37)],32);
  const shadeMat=linen.clone();shadeMat.name='fixed linen lampshade';shadeMat.side=T.DoubleSide;
  m('static tapered shade',shade,[.63,1.46,-3.27],[1,1,1],shadeMat);
  ring('bottom shade binding',[.63,1.46,-3.27],.29,.009,ivory);
  ring('top shade binding',[.63,1.83,-3.27],.18,.007,ivory);
  r('short retained cord',[.64,.018,-3.30],[.63,.018,-4.15],.008,walnut);

  category='bookshelf';
  b('recessed back',[-5.24,.82,-4.025],[1.22,1.58,.035],walnut);
  for(const x of[-5.86,-4.62])b('upright',[x,.82,-3.86],[.045,1.62,.37],oak);
  for(const y of[.08,.57,1.06,1.61])b('shelf',[-5.24,y,-3.86],[1.28,.044,.40],oak);
  for(let row=0;row<3;row++){
    let x=-5.77;
    const count=row===1?7:10;
    for(let i=0;i<count;i++){
      const w=.054+(i%3)*.018,h=.27+((i*7+row)%5)*.033,z=-3.825+(i%3)*.006;
      const o=b('uneven book spine',[x+w/2,.107+row*.49+h/2,z],[w,h,.26],bookMats[(i+row*2)%bookMats.length]);
      if(i===count-1){o.rotation.z=-.09;o.position.x+=.012;}
      b('subtle spine band',[x+w/2,.15+row*.49,z+.133],[w*.75,.008,.004],paper);
      x+=w+.012;
    }
  }
  book('shelf horizontal book',[-4.84,.63,-3.84],[.26,.055,.26],linen,.05);
  book('shelf top book',[-4.82,.69,-3.84],[.29,.05,.25],teal,-.05);
  e('small shelf ceramic',[-4.80,1.185,-3.87],[.093,.099,.082],ivory);

  category='textiles';
  const cushions=statics.filter(o=>o.name==='soft sofa cushion');
  for(let i=0;i<cushions.length;i++){
    const o=cushions[i],g=o.geometry.clone(),a=g.attributes.position;
    for(let k=0;k<a.count;k++){
      const v=new T.Vector3().fromBufferAttribute(a,k);
      v.set(Math.sign(v.x)*Math.abs(v.x)**.72,Math.sign(v.y)*Math.abs(v.y)**.72,v.z);
      a.setXYZ(k,v.x,v.y,v.z);
    }
    g.computeVertexNormals();o.geometry=g;
    o.position.set([-3.44,-2.21,-.94][i],[1.015,.955,1.045][i],[-3.48,-3.39,-3.46][i]);
    o.scale.set([.33,.31,.365][i],[.32,.265,.305][i],.16);
    o.rotation.set(.1*(i-1),.1*(i-1),[-.17,.11,-.065][i]);modified.push(o);
  }
  const lumbar=e('off-center lumbar cushion',[-.36,.895,-3.21],[.235,.125,.12],fabric);
  lumbar.rotation.set(-.15,.18,-.07);
  const oldThrow=statics.find(o=>o.name==='sofa throw'),g=new T.PlaneGeometry(.73,1.24,28,42),a=g.attributes.position;
  for(let k=0;k<a.count;k++){
    const x=a.getX(k),u=(a.getY(k)+.62)/1.24,z=-3.80+u*1.24;
    const drop=.36*Math.max(0,(u-.70)/.30)**.7;
    const y=.835-drop+.014*Math.sin(x*34+u*5)+.007*Math.sin(u*31+x*9);
    a.setXYZ(k,x-3.43,y,z+.025*Math.sin(x*8+u*6));
  }
  g.computeVertexNormals();oldThrow.geometry=g;oldThrow.position.set(0,0,0);oldThrow.scale.set(1,1,1);oldThrow.rotation.set(0,0,0);
  oldThrow.material=linen.clone();oldThrow.material.name='rumpled static woven throw';oldThrow.material.side=T.DoubleSide;modified.push(oldThrow);
  for(let i=0;i<11;i++)r('throw short fringe',[-3.77+i*.066,.477,-2.554],[-3.772+i*.066,.437,-2.544],.003,linen);

  category='coffee-table';
  const oldMug=statics.find(o=>o.name==='mug');
  oldMug.geometry=new T.CylinderGeometry(.09,.09,.014,24);oldMug.scale.set(1,1,1);oldMug.position.set(-1.25,.682,-1.6);
  oldMug.material=fabric;oldMug.name='mug coaster';modified.push(oldMug);
  cup('used ceramic mug',[-1.25,.694,-1.60],.067,.115,terra,true);
  e('mug still tea surface',[-1.25,.788,-1.60],[.052,.003,.052],walnut);
  const remote=b('remote',[-2.62,.690,-1.22],[.07,.029,.23],metal);remote.rotation.y=-.23;
  for(let i=0;i<3;i++)e('remote buttons',[-2.62+(i-1)*.015,.708,-1.22+(i-1)*.062],[.009,.004,.014],clay);
  const paper1=b('loose paper',[-1.59,.676,-1.27],[.29,.004,.205],paper);paper1.rotation.y=-.15;
  const paper2=b('offset receipt',[-1.54,.680,-1.26],[.12,.003,.21],ivory);paper2.rotation.y=.11;
  e('small reading-glasses case',[-2.67,.697,-1.85],[.045,.023,.135],fabric).rotation.y=.20;
  book('low table magazine',[-1.84,.148,-1.62],[.47,.034,.31],teal,.16);
  b('small lower table shelf',[-1.98,.105,-1.58],[1.82,.038,.77],oak);

  category='bird-storage';
  b('low supply cabinet',[-5.58,.355,1.45],[.79,.57,1.00],oak);
  b('supply top',[-5.58,.663,1.45],[.84,.045,1.04],walnut);
  for(const z of[1.215,1.69]){
    b('closed supply drawer',[-5.166,.365,z],[.024,.48,.445],linen);
    r('drawer pull',[-5.143,.40,z-.06],[-5.143,.40,z+.06],.010,metal);
  }
  for(const z of[1.12,1.49]){
    m('sealed seed storage jar',new T.CylinderGeometry(.103,.101,.23,20),[-5.58,.802,z],[1,1,1],clay);
    m('seed jar lid',new T.CylinderGeometry(.109,.109,.025,20),[-5.58,.928,z],[1,1,1],ivory);
    b('small blank jar label',[-5.475,.805,z],[.008,.078,.095],paper);
  }
  const folded=b('folded care cloth',[-5.60,.722,1.81],[.31,.069,.24],ivory);folded.rotation.y=.1;
  category='basket';
  const basketProfile=[[0,0],[.27,0],[.34,.32],[.318,.32],[.252,.035],[0,.035]];
  m('low storage basket',new T.LatheGeometry(basketProfile.map(v=>new T.Vector2(...v)),28),[-5.32,.01,3.14],[1,1,1],fabric);
  for(let i=0;i<6;i++)ring('restrained horizontal weave',[-5.32,.045+i*.051,3.14],.276+i*.009,.005,linen);
  for(const s of[-1,1])r('fixed basket handle',[-5.32+s*.265,.31,3.01],[-5.32+s*.265,.39,3.20],.015,linen);
  b('folded basket textile',[-5.31,.245,3.13],[.32,.075,.28],ivory).rotation.y=-.18;

  category='plants';
  e('existing pot soil',[4.27,.474,-3.40],[.201,.018,.201],soil);
  for(let i=0;i<12;i++){
    const a=i*2.399+.3,base=[4.27,.58+i*.048,-3.40],tip=[4.27+.28*Math.cos(a),.61+i*.068,-3.4+.28*Math.sin(a)];
    r('branch',base,tip,.007,green);
    const leaf=e('slightly cupped leaf',tip,[.18,.031,.077],i%3?green:leafLight);leaf.rotation.set(.18*Math.sin(a),-a,.25*Math.cos(a));
    const tip2=[tip[0]+.08*Math.cos(a),tip[1]+.025,tip[2]+.08*Math.sin(a)];
    r('quiet leaf vein',tip,tip2,.0026,leafLight);
  }
  category='wall-details';
  for(const z of[-4.205,5.305])b('continuous baseboard',[-.70,.077,z],[11.19,.154,.027],ivory);
  b('continuous east baseboard',[4.905,.077,.55],[.027,.154,9.43],ivory);
  b('west baseboard north of hall opening',[-6.305,.077,-.475],[.027,.154,7.45],ivory);
  b('west baseboard south of hall opening',[-6.305,.077,5.125],[.027,.154,.35],ivory);
  for(const [x,y,w,h]of[[-2.81,2.28,.73,.92],[-1.79,2.38,.68,.73]]){
    b('understated frame',[x,y,-4.18],[w,h,.045],walnut);
    b('matte art mount',[x,y,-4.149],[w-.065,h-.065,.012],ivory);
    e('abstract clay field',[x-.06,y-.06,-4.135],[w*.31,h*.26,.007],linen);
    e('abstract muted shape',[x+.06,y+.10,-4.122],[w*.17,h*.12,.006],teal);
  }
  b('small outlet plate',[.63,.24,-4.198],[.095,.125,.017],ivory);

  category='cage-essentials';
  const oldWater=statics.find(o=>o.name==='water cup');
  oldWater.geometry=new T.CylinderGeometry(.099,.096,.012,24);oldWater.position.set(-4.39,1.402,1.38);oldWater.scale.set(1,1,1);modified.push(oldWater);
  cup('water',[-4.39,1.408,1.38],.091,.091,ivory);
  e('still water',[-4.39,1.481,1.38],[.075,.003,.075],clay);
  cup('food',[-4.43,1.335,2.53],.099,.095,ivory);
  e('seed cup fill',[-4.43,1.409,2.53],[.081,.008,.081],linen);
  for(const [z,y]of[[1.38,1.431],[2.53,1.363]])r('short back mount',[-4.42,y,z],[-4.34,y,z],.012,metal);
  for(let i=0;i<19;i++){
    const x=-4.47+((i*7)%13)*.060,z=1.13+((i*11)%17)*.088;
    const seed=e('restrained tray seed trace',[x,1.1767,z],[.009+(i%3)*.002,.0025,.0045],i%4?oak:linen);
    seed.rotation.y=i*1.9;
  }
  // A rigid short wooden chew is fixed behind the perch; no swinging loop or cord.
  r('fixed toy back bracket',[-4.60,2.33,2.55],[-4.40,2.33,2.55],.012,metal);
  r('simple fixed chew core',[-4.43,2.15,2.55],[-4.43,2.37,2.55],.016,oak);
  for(const [y,angle]of[[2.20,.22],[2.30,-.17]]){
    const o=b('rounded clay chew block',[-4.43,y,2.55],[.081,.050,.065],y<2.25?linen:terra);o.rotation.y=angle;
  }
  return {added,modified,groups};
}
