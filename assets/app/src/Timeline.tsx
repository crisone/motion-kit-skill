import React from 'react';
import {AbsoluteFill,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Project} from './types';
import {timelineStyle,timelineEvents} from '../shared/timeline';
const ease=(v:number)=>{const p=Math.max(0,Math.min(1,v));return p*p*(3-2*p)};
export function Timeline({project}:{project:Project}){
 const {fps}=useVideoConfig(),t=useCurrentFrame()/fps,s=project.settings;
 const style={...timelineStyle,...s.timelineStyle},events=s.timelineEvents||timelineEvents;
 const horizontal=style.orientation==='horizontal',count=events.length;
 const points=events.map((_,i)=>horizontal?{x:190+i*1540/(count-1),y:500}:{x:350,y:290+i*570/(count-1)});
 let active=-1;events.forEach((e,i)=>{if(t>=e.at)active=i});
 const progress=active<0?0:ease((t-events[active].at)/s.entrance);
 const from=points[Math.max(0,active-1)],to=points[Math.max(0,active)];
 const end={x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress};
 const fonts={sans:'Arial,"PingFang SC",sans-serif',serif:'Georgia,"Songti SC",serif',mono:'Menlo,"PingFang SC",monospace'};
 return <AbsoluteFill style={{background:style.backgroundColor,color:style.textColor,fontFamily:fonts[style.fontFamily],overflow:'hidden'}}>
  <div style={{position:'absolute',left:140,top:86,right:140,fontSize:22,letterSpacing:3,opacity:.55}}>{s.sourceLabel||'TIMELINE'}</div>
  <div style={{position:'absolute',left:140,top:136,right:140,fontSize:54,fontWeight:600,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{s.caption||'研究进展'}</div>
  <svg width="1920" height="1080" style={{position:'absolute',inset:0}}>
   <line x1={points[0].x} y1={points[0].y} x2={points[count-1].x} y2={points[count-1].y} stroke={style.lineColor} strokeWidth={style.lineWidth} strokeLinecap="round"/>
   {active>=0&&<line x1={points[0].x} y1={points[0].y} x2={end.x} y2={end.y} stroke={style.accentColor} strokeWidth={style.lineWidth} strokeLinecap="round"/>}
   {events.map((e,i)=>{const p=points[i],reveal=ease((t-e.at)/s.entrance);return <g key={i}>
    {active===i&&<circle cx={p.x} cy={p.y} r={style.nodeSize+20*progress} fill="none" stroke={style.accentColor} strokeWidth={2} opacity={(1-progress)*.6}/>}
    <circle cx={p.x} cy={p.y} r={style.nodeSize} fill={style.backgroundColor} stroke={i<=active?style.accentColor:style.lineColor} strokeWidth={style.lineWidth} opacity={i<active?style.pastOpacity:1}/>
    <circle cx={p.x} cy={p.y} r={style.nodeSize*.42} fill={style.accentColor} opacity={reveal*(i<active?style.pastOpacity:1)}/>
   </g>})}
  </svg>
  {events.map((e,i)=>{const p=points[i],reveal=ease((t-e.at)/s.entrance),fade=i===active-1?1-(1-style.pastOpacity)*progress:i<active?style.pastOpacity:1;
   const width=horizontal?Math.min(340,1540/(count-1)-30):1280;
   const size=Math.min(style.fontSize,horizontal?(count>3?48:64):(count===5?34:count===4?46:64));
   return <div key={i} style={{position:'absolute',left:horizontal?p.x-width/2:p.x+80,top:horizontal?p.y+58:p.y-44,width,opacity:reveal*fade,transform:`translateY(${(1-reveal)*16}px)`,overflowWrap:'anywhere'}}>
    <div style={{fontSize:size*.68,letterSpacing:1,opacity:.7}}>{e.date}</div>
    <div style={{fontSize:size,fontWeight:700,color:style.accentColor,lineHeight:1.25,marginTop:7}}>{e.value}</div>
    <div style={{fontSize:Math.min(28,size*.6),lineHeight:1.45,marginTop:9}}>{e.label}</div>
   </div>})}
 </AbsoluteFill>;
}
