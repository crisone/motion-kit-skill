import {Timeline} from './Timeline';
import React from 'react';
import {VideoMagnifier} from './VideoMagnifier';
import {Magnifier} from './Magnifier';
import {PageTurn} from './PageTurn';
import {AbsoluteFill,Img,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Project} from './types';
function PdfScene({project}:{project:Project}){
 const maskId=React.useId();
 const frame=useCurrentFrame(),{fps,width,height}=useVideoConfig();
 const {settings:s,page,selection}=project;
 const t=frame/fps,progress=Math.max(0,Math.min(1,(t-s.start)/s.entrance));
 const ease=progress*progress*(3-2*progress);
 const all=selection.rects;
 const rects=project.template==='paper-focus-v1'?[{x:Math.min(...all.map(r=>r.x)),y:Math.min(...all.map(r=>r.y)),width:Math.max(...all.map(r=>r.x+r.width))-Math.min(...all.map(r=>r.x)),height:Math.max(...all.map(r=>r.y+r.height))-Math.min(...all.map(r=>r.y))}]:all;
 const minX=Math.min(...rects.map(r=>r.x)),minY=Math.min(...rects.map(r=>r.y));
 const maxX=Math.max(...rects.map(r=>r.x+r.width)),maxY=Math.max(...rects.map(r=>r.y+r.height));
 const base=Math.min((height-180)/page.height,(width-240)/page.width);
 const desired=Math.min(base*s.zoom,(width-240)/(maxX-minX+2*s.padding),(height-380)/(maxY-minY+2*s.padding));
 const scale=base+(desired-base)*ease;
 const startX=(width-page.width*base)/2,startY=(height-page.height*base)/2;
 const endX=width/2-((minX+maxX)/2+s.focusX)*desired;
 const endY=height*.46-((minY+maxY)/2+s.focusY)*desired;
 const x=startX+(endX-startX)*ease,y=startY+(endY-startY)*ease;
 return <AbsoluteFill style={{background:'#172021',overflow:'hidden',fontFamily:'Arial, "PingFang SC", sans-serif'}}>
  <AbsoluteFill style={{background:'radial-gradient(ellipse at 50% 45%, #33423e 0%, #172021 70%)'}}/>
  <div style={{position:'absolute',left:0,top:0,width:page.width,height:page.height,transform:`translate(${x}px, ${y}px) scale(${scale})`,transformOrigin:'0 0',boxShadow:'0 10px 55px #0006',background:'white'}}>
   <Img src={page.imageUrl} style={{width:'100%',height:'100%',display:'block'}}/>
   <svg viewBox={`0 0 ${page.width} ${page.height}`} width={page.width} height={page.height} style={{position:'absolute',inset:0}}>
    <defs><mask id={maskId}><rect width={page.width} height={page.height} fill="white"/>{rects.map((r,i)=>{
      const reveal=Math.max(0,Math.min(1,progress*rects.length-i));
      return <rect key={i} x={r.x-s.padding} y={r.y-s.padding/2} width={(r.width+s.padding*2)*reveal} height={r.height+s.padding} rx={1} fill="black"/>;
    })}</mask></defs>
    <rect width={page.width} height={page.height} fill="black" opacity={s.dim*ease} mask={`url(#${maskId})`}/>
    {rects.map((r,i)=>{const reveal=Math.max(0,Math.min(1,progress*rects.length-i));return <rect key={i} x={r.x-s.padding} y={r.y-s.padding/2} width={(r.width+s.padding*2)*reveal} height={r.height+s.padding} rx={1} stroke={project.template==='paper-focus-v1'?s.highlightColor:'none'} strokeWidth={1} fill={project.template==='paper-focus-v1'?'none':s.highlightColor} opacity={project.template==='paper-focus-v1'?ease:s.highlightOpacity} style={{mixBlendMode:'multiply'}}/>})}
   </svg>
  </div>
  <div style={{position:'absolute',inset:'0 0 auto',height:140,background:'linear-gradient(#172021dd,transparent)'}}/>
  <div style={{position:'absolute',left:64,top:38,right:64,display:'flex',justifyContent:'space-between',alignItems:'center',color:'#edf4ef',fontSize:22,letterSpacing:1}}><div style={{maxWidth:1500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.sourceLabel}</div><div style={{opacity:.7}}>PDF · {page.number}</div></div>
  {s.caption&&<div style={{position:'absolute',left:110,right:110,bottom:54,display:'flex',justifyContent:'center',opacity:ease}}><div style={{fontSize:s.fontSize,lineHeight:1.55,color:'#f3f6f1',background:'#14201ef0',padding:'20px 34px',borderLeft:`4px solid ${s.highlightColor}`,maxWidth:1600,textAlign:'center',boxShadow:'0 12px 32px #0002',whiteSpace:'pre-wrap'}}>{s.caption}</div></div>}
 </AbsoluteFill>;
}

function GraphicScene({project}:{project:Project}){
 const frame=useCurrentFrame(),{fps}=useVideoConfig(),s=project.settings;
 const t=Math.max(0,Math.min(1,(frame/fps-s.start)/s.entrance)),ease=1-Math.pow(1-t,3);
 const numeric=project.template==='stat-counter-v1';
 return <AbsoluteFill style={{textAlign:'left',boxSizing:'border-box',background:'#172021',color:'#f4f5ef',fontFamily:'Arial, "PingFang SC", sans-serif',padding:110}}>
  <AbsoluteFill style={{background:`radial-gradient(ellipse at 75% 30%, ${s.highlightColor}28, transparent 65%)`,opacity:1-s.dim}}/>
  <div style={{fontSize:24,letterSpacing:3,opacity:.7}}>{s.sourceLabel}</div>
  <div style={{position:'absolute',left:140,right:140,top:235,opacity:ease,transform:`translateY(${(1-ease)*55}px)`,borderLeft:`8px solid ${s.highlightColor}`,padding:'30px 70px'}}>
   {numeric?<div style={{fontSize:180,fontWeight:700,color:s.highlightColor,fontVariantNumeric:'tabular-nums'}}>{(s.fromValue+(s.value-s.fromValue)*ease).toFixed(s.decimals)}<span style={{fontSize:64,marginLeft:20}}>{s.unit}</span></div>:<><div style={{fontSize:110,lineHeight:.7,color:s.highlightColor}}>“</div><div style={{fontSize:s.fontSize*1.8,lineHeight:1.5,whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{s.quote}</div></>}
   <div style={{fontSize:s.fontSize,lineHeight:1.6,marginTop:38,opacity:.7,whiteSpace:'pre-wrap'}}>{s.caption}</div>
  </div>
 </AbsoluteFill>
}
export function PaperScene({project}:{project:Project}){return project.template==='timeline-v1'?<Timeline project={project}/>:project.template==='video-magnifier-v1'?<VideoMagnifier project={project}/>:project.template==='paper-magnifier-v1'?<Magnifier project={project}/>:project.template==='page-turn-v1'?<PageTurn project={project}/>:project.template.startsWith('paper-')?<PdfScene project={project}/>:<GraphicScene project={project}/>}
