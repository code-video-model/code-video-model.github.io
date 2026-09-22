import {clamp,lerp,position,direction,articulation} from './motion.mjs';
import {entryInterval,entryCoefficients} from './entry-curve.mjs';

// Absolute-time, fixed-step spring solution; seeking never integrates from the
// previous displayed frame. Quintic Hermite reconstruction preserves P/V/A.
const hz=960,dt=1/hz,table=[];
const unwrap=(x,reference)=>reference+Math.atan2(Math.sin(x-reference),Math.cos(x-reference));
const omega=[30,30,30,26,18,22];
let lastYaw=Math.PI/2;
function forcing(t){
  const p=position(t),d=direction(t),a=articulation(t);
  const yaw=unwrap(Math.atan2(d[0],d[2]),lastYaw);lastYaw=yaw;
  return [...p,yaw,a.bank*.16,a.bob*.30];
}
let f=forcing(0),x=f.slice(),v=f.map(()=>0);
const acceleration=(p,w,g)=>p.map((q,i)=>omega[i]**2*(g[i]-q)-2*omega[i]*w[i]);
for(let n=0;n<=15*hz;n++){
  const t=n*dt,g=forcing(t),a=acceleration(x,v,g);
  table.push({x:x.slice(),v:v.slice(),a});
  const gm=forcing(t+dt/2),gn=forcing(t+dt);
  const x2=x.map((q,i)=>q+v[i]*dt/2),v2=v.map((q,i)=>q+a[i]*dt/2),a2=acceleration(x2,v2,gm);
  const x3=x.map((q,i)=>q+v2[i]*dt/2),v3=v.map((q,i)=>q+a2[i]*dt/2),a3=acceleration(x3,v3,gm);
  const x4=x.map((q,i)=>q+v3[i]*dt),v4=v.map((q,i)=>q+a3[i]*dt),a4=acceleration(x4,v4,gn);
  x=x.map((q,i)=>q+dt/6*(v[i]+2*v2[i]+2*v3[i]+v4[i]));
  v=v.map((q,i)=>q+dt/6*(a[i]+2*a2[i]+2*a3[i]+a4[i]));
}
function spring(t){
  const i=Math.min(table.length-2,Math.floor(clamp(t,0,15)*hz)),u=clamp((t-i*dt)/dt);
  const a=table[i],b=table[i+1];
  return a.x.map((p,k)=>{
    const c0=p,c1=a.v[k]*dt,c2=a.a[k]*dt*dt/2;
    const r=b.x[k]-c0-c1-c2,s=b.v[k]*dt-c1-2*c2,z=b.a[k]*dt*dt-2*c2;
    return c0+u*(c1+u*(c2+u*((10*r-4*s+z/2)+u*((-15*r+7*s-z)+u*(6*r-3*s+z/2)))));
  });
}
// C3 envelopes also remove endpoint jerk jumps at the shot-phase boundaries.
const blend=(a,b,t)=>{const u=clamp((t-a)/(b-a));return u**4*(35-84*u+70*u*u-20*u**3);};
const vector=yaw=>[Math.sin(yaw),0,Math.cos(yaw)];
const forward=(yaw,pitch)=>[Math.sin(yaw)*Math.cos(pitch),Math.sin(pitch),Math.cos(yaw)*Math.cos(pitch)];
const detachEnd=9.65,landingClose=11.35;
function aim(p,target){
  const d=target.map((q,i)=>q-p[i]);return {yaw:Math.atan2(d[0],d[2]),pitch:Math.atan2(d[1],Math.hypot(d[0],d[2]))};
}
function cross(a,b,u){
  return {position:lerp(a.position,b.position,u),yaw:a.yaw+u*(unwrap(b.yaw,a.yaw)-a.yaw),
    pitch:a.pitch+u*(b.pitch-a.pitch),roll:a.roll+u*(b.roll-a.roll),fov:a.fov+u*(b.fov-a.fov)};
}
function intimate(t,closing=false){
  const u=closing?t-landingClose:t;
  const damping=closing?Math.exp(-u*1.05):1;
  const p=closing?[-2.40+.037*damping,2.16+.019*damping,2.43+.026*damping]:
    [-2.40-.022*t,2.16+.012*Math.sin(t*.6),2.43+.011*t];
  return {position:p,...aim(p,[-3.96,1.87,1.835]),roll:0,fov:43};
}
export function riderState(t){
  const s=spring(t),d=vector(s[3]);
  const p=[s[0]-.50*d[0],s[1]+.24+s[5],s[2]-.50*d[2]];
  return {position:p,yaw:s[3],pitch:-.035,roll:s[4],fov:43};
}
// Offline design endpoint jets use the actual right-hand Hermite polynomial,
// not finite differences across its 960 Hz knot.
export function riderJet(t){
  const i=Math.min(table.length-2,Math.floor(clamp(t,0,15)*hz)),u=clamp((t-i*dt)/dt);
  const a=table[i],b=table[i+1],s=[[],[],[],[]];
  for(let k=0;k<a.x.length;k++){
    const c0=a.x[k],c1=a.v[k]*dt,c2=a.a[k]*dt*dt/2;
    const r=b.x[k]-c0-c1-c2,w=b.v[k]*dt-c1-2*c2,z=b.a[k]*dt*dt-2*c2;
    const c=[c0,c1,c2,10*r-4*w+z/2,-15*r+7*w-z,6*r-3*w+z/2];
    for(let n=0;n<4;n++){
      let value=0;
      for(let j=5;j>=n;j--){
        let factor=1;for(let m=0;m<n;m++)factor*=j-m;
        value=value*u+c[j]*factor;
      }
      s[n][k]=value/dt**n;
    }
  }
  const q=s[0][3],q1=s[1][3],q2=s[2][3],q3=s[3][3],sin=Math.sin(q),cos=Math.cos(q);
  return [
    [s[0][0]-.5*sin,s[0][1]+.24+s[0][5],s[0][2]-.5*cos,q,-.035,s[0][4]],
    [s[1][0]-.5*cos*q1,s[1][1]+s[1][5],s[1][2]+.5*sin*q1,q1,0,s[1][4]],
    [s[2][0]-.5*cos*q2+.5*sin*q1*q1,s[2][1]+s[2][5],s[2][2]+.5*sin*q2+.5*cos*q1*q1,q2,0,s[2][4]],
    [s[3][0]-.5*cos*q3+1.5*sin*q1*q2+.5*cos*q1**3,s[3][1]+s[3][5],
      s[3][2]+.5*sin*q3+1.5*cos*q1*q2-.5*sin*q1**3,q3,0,s[3][4]],
  ];
}
function external(t){
  const s=spring(t),d=vector(s[3]),right=[d[2],0,-d[0]];
  const p=[s[0]-1.20*d[0]+.90*right[0],s[1]+.54,s[2]-1.20*d[2]+.90*right[2]];
  const target=[s[0]+.65*d[0],s[1]+.035,s[2]+.65*d[2]];
  return {position:p,...aim(p,target),roll:s[4]*.30,fov:43};
}
export function cameraState(t){
  t=clamp(t,0,15);
  let c;
  if(t<entryInterval[0])c=intimate(t);
  else if(t<entryInterval[1]){
    const u=(t-entryInterval[0])/(entryInterval[1]-entryInterval[0]);
    const p=entryCoefficients.reduceRight((v,c)=>v.map((x,i)=>x*u+c[i]),Array(6).fill(0));
    c={position:p.slice(0,3),yaw:p[3],pitch:p[4],roll:p[5],fov:43};
  }
  else if(t<8.25)c=riderState(t);
  else if(t<detachEnd)c=cross(riderState(t),external(t),blend(8.25,detachEnd,t));
  else if(t<landingClose){
    c=cross(external(t),intimate(t,true),blend(detachEnd,landingClose,t));
    c.pitch-=.085*Math.sin(Math.PI*(t-detachEnd)/(landingClose-detachEnd))**4;
  }
  else c=intimate(t,true);
  return {...c,target:c.position.map((x,i)=>x+3*forward(c.yaw,c.pitch)[i])};
}
export const cameraContract={sampleHz:hz,translationSpringOmega:30,yawSpringOmega:26,rollSpringOmega:18,
  verticalSpringOmega:22,rollBankGain:.16,heaveGain:.30,nearPlane:.025,cameraRadius:.075,
  riderInterval:[3.8,8.25],boundaries:[2.25,3.8,8.25,detachEnd,landingClose],
  fovDegrees:43,zoom:'fixed lens throughout; no FOV breathing',
  entryInterval,entryTargets:{maximumYawRateDegreesPerSecond:135,maximumPitchRateDegreesPerSecond:85,maximumAccelerationMps2:14},
  interpolation:'P/V/A/jerk-matched polynomial entry, quintic P/V/A spring table, C3 detach/landing envelopes',
  note:'Camera-only deterministic kinematic inertial rig; no physical camera simulation.'};
