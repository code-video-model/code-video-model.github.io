export const clamp=(x,a=0,b=1)=>Math.min(b,Math.max(a,x));
export const mix=(a,b,u)=>a+(b-a)*u;
export const ease=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u**3*(10-15*u+6*u*u);};
export const lerp=(a,b,u)=>a.map((x,i)=>mix(x,b[i],u));
export const normal=a=>{const d=Math.hypot(...a)||1;return a.map(x=>x/d);};
export const launch=2.25,contact=11.30;
export const perch=[-4,1.805,2],creamPerch=[-4,1.805,1.70];
export const aperture={axis:0,plane:-3.51,minZ:1.58,maxZ:2.38,bottom:1.44,top:2.29};
export const nodes=[
  [launch,...perch],
  [2.70,-3.10,2.025,2],
  [3.10,-2.30,2.17,1.66],
  [3.65,-1.55,2.23,.10],
  [4.35,-.70,2.22,-1.50],
  [5.20,1.20,2.25,-2.0],
  [6.10,3.00,2.28,-1.40],
  [6.90,3.90,2.25,0],
  [7.65,3.55,2.18,1.45],
  [8.50,2.20,2.10,2],
  [9.15,.45,2.08,2],
  [9.78,-1.30,2.03,2],
  [10.25,-2.50,1.99,2],
  [10.62,-3.25,1.94,2],
  [10.86,-3.57,1.88,2],
  [11.08,-3.82,1.84,2],
  [contact,...perch],
];
const deriv=nodes.map((p,i)=>i===0||i===nodes.length-1?[0,0,0]:
  p.slice(1).map((_,k)=>(nodes[i+1][k+1]-nodes[i-1][k+1])/(nodes[i+1][0]-nodes[i-1][0])));
for(let i=9;i<deriv.length;i++)deriv[i][2]=0;
export function position(t){
  if(t<=launch)return perch.slice();
  if(t>=contact)return perch.slice();
  let i=0;while(nodes[i+1][0]<t)i++;
  const a=nodes[i],b=nodes[i+1],dt=b[0]-a[0],u=(t-a[0])/dt;
  return a.slice(1).map((x,k)=>(2*u**3-3*u*u+1)*x+(u**3-2*u*u+u)*dt*deriv[i][k]+
    (-2*u**3+3*u*u)*b[k+1]+(u**3-u*u)*dt*deriv[i+1][k]);
}
export const velocity=t=>position(t+.0005).map((x,i)=>(x-position(t-.0005)[i])/.001);
export const direction=t=>{const v=velocity(clamp(t,launch+.001,contact-.001));return normal([v[0],0,v[2]]);};
const cameraKeys=[
  [0,[-2.40,2.16,2.43],[-3.96,1.87,1.835],43],
  [1.65,[-2.40,2.16,2.43],[-3.96,1.87,1.835],43],
  [3.15,[-.90,2.62,3.85],[-2.55,2.07,1.30],57],
  [4.50,[-.65,2.74,4.75],[-.80,2.10,-1.1],53],
  [6.25,[-.45,2.86,4.98],[2.20,2.13,-.30],55],
  [7.55,[-.40,2.86,5.00],[.65,2.02,1.26],69],
  [8.50,[-.40,2.86,5.00],[-.45,1.99,1.56],70],
  [9.75,[-.65,2.65,4.66],[-1.72,1.90,1.79],64],
  [11.25,[-1.80,2.44,3.40],[-3.35,1.96,1.89],50],
  [12.20,[-2.16,2.30,2.95],[-3.75,1.92,1.835],47],
  [13.10,[-2.40,2.16,2.43],[-3.96,1.87,1.835],43],
  [15,[-2.40,2.16,2.43],[-3.96,1.87,1.835],43],
];
// Smoothstep interpolation has zero velocity and acceleration at each authored
// dolly station. These positions never follow the bird around the oval.
export function cameraState(t){
  let i=0;while(i<cameraKeys.length-2&&cameraKeys[i+1][0]<t)i++;
  const a=cameraKeys[i],b=cameraKeys[i+1],u=ease(a[0],b[0],t);
  return {position:lerp(a[1],b[1],u),target:lerp(a[2],b[2],u),fov:mix(a[3],b[3],u)};
}
const omega=2*Math.PI;
export const frequency=t=>4.15+.32*Math.sin(omega*.19*(t-launch))+.15*Math.sin(omega*.37*(t-launch)+.5);
export const cycles=t=>{
  const u=t-launch;
  return 4.15*u+.32/(omega*.19)*(1-Math.cos(omega*.19*u))+
    .15/(omega*.37)*(Math.cos(.5)-Math.cos(omega*.37*u+.5));
};
export const phase=t=>((cycles(t)%1)+1)%1;
export function articulation(t){
  const p=phase(t),down=p<.43,stroke=down?p/.43:(p-.43)/.57;
  const recovery=down?0:Math.sin(Math.PI*stroke)**2;
  const angle=1.08*(down?Math.cos(Math.PI*stroke):-Math.cos(Math.PI*stroke));
  const active=(.20*ease(1.98,2.20,t)+.80*ease(2.40,2.64,t))*
    (1-.86*ease(10.65,11.12,t))*(1-ease(contact,11.75,t));
  const launchBlend=ease(2.25,2.43,t);
  const arrival=ease(11.02,11.23,t);
  const pulse=ease(6.15,6.85,t)*(1-ease(7.45,8.25,t));
  const flight=ease(launch,2.58,t)*(1-ease(contact,11.62,t));
  const closure=1-ease(contact,11.54,t);
  const tailHalfAngle=mix(.018,.10,pulse)*closure+.12*arrival*closure*(1-.25*pulse)+.018*(1-closure);
  const a=direction(t-.025),b=direction(t+.025);
  const turn=Math.atan2(a[0]*b[2]-a[2]*b[0],a[0]*b[0]+a[2]*b[2])/.05;
  const bank=clamp(-turn*.20,-.43,.43)*ease(2.70,3.05,t)*(1-ease(8.1,8.48,t));
  return {phase:p,cycles:cycles(t),frequency:frequency(t),phaseName:down?'extended-power-downstroke':'folded-twisted-recovery',
    downstrokeFraction:.43,recovery,shoulder:mix(1.08,angle,launchBlend),
    elbowBend:.08+1.03*recovery,wristBend:-.04-.40*recovery,
    aftSweep:.04+.28*recovery,wristTwist:.06+.94*recovery,active,flight,bank,
    bob:.007*flight*(1-ease(11.08,contact,t))*Math.sin(omega*(p-.025)),
    pitchLag:.027*flight*(1-ease(11.08,contact,t))*Math.sin(omega*(p-.075)),
    tailHalfAngle,tailTurn:pulse,tailFlare:arrival*closure,
    tailPitch:mix(-.20,.03,flight)-.12*arrival*closure,tailYaw:.032*pulse,
    feet:ease(10.90,11.20,t),legTuck:flight*(1-ease(10.90,11.20,t)),
    flarePitch:.22*ease(10.98,11.24,t)*(1-ease(contact,11.70,t)),
    crouch:.025*ease(1.83,2.08,t)*(1-ease(2.18,2.37,t)),
    lean:.16*ease(1.70,2.15,t)*(1-ease(launch,2.52,t)),
    settling:.013*ease(contact,11.43,t)*(1-ease(11.48,11.70,t)),
    preen:(1-ease(1.16,1.47,t))+ease(12.15,12.65,t),
  };
}
