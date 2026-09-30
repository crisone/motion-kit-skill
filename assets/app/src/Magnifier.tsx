import React from 'react';
import {AbsoluteFill,Img,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Project} from './types';
const ease=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x)};
export function Magnifier({project}:{project:Project}){
 const {width,height,fps}=useVideoConfig(),time=useCurrentFrame()/fps,s=project.settings,page=project.page;
 const appear=ease((time-s.start)/s.entrance),scroll=ease((time-s.scrollStart)/s.scrollDuration)*s.scrollY;
 const base=Math.min((height-180)/page.height,(width-240)/page.width),bgX=(width-page.width*base)/2,bgY=(height-page.height*base)/2-scroll;
 const sampleX=s.sampleX*width/100,sampleY=s.sampleY*height/100,m=1+(s.zoom-1)*appear;
 const targetW=width*s.lensWidth/100,targetH=height*s.lensHeight/100,w=targetW*(1/s.zoom+(1-1/s.zoom)*appear),h=targetH*(1/s.zoom+(1-1/s.zoom)*appear);
 const centerX=sampleX+(s.lensX*width/100-sampleX)*appear,centerY=sampleY+(s.lensY*height/100-sampleY)*appear;
 return <AbsoluteFill style={{background:'#172021',overflow:'hidden',fontFamily:'Arial, "PingFang SC", sans-serif'}}>
  <Img src={page.imageUrl} style={{position:'absolute',left:bgX,top:bgY,width:page.width*base,height:page.height*base}}/>
  <AbsoluteFill style={{background:'black',opacity:s.dim*appear}}/>
  <div style={{position:'absolute',left:centerX-w/2,top:centerY-h/2,width:w,height:h,overflow:'hidden',borderRadius:4,opacity:appear,background:'white',boxShadow:`0 18px 65px rgba(0,0,0,${s.shadow*appear})`,outline:`${2*appear}px solid rgba(255,255,255,.8)`}}>
   {/* Lens and background share scroll; magnification scales movement inside the crop. */}
   <Img src={page.imageUrl} style={{position:'absolute',left:w/2+m*(bgX-sampleX),top:h/2+m*(bgY-sampleY),width:page.width*base*m,height:page.height*base*m,maxWidth:'none'}}/>
  </div>
  <div style={{position:'absolute',left:64,right:64,top:32,color:'#e9eee9',fontSize:22,textShadow:'0 2px 6px #000'}}>{s.sourceLabel}</div>
  {s.caption&&<div style={{position:'absolute',left:100,right:100,bottom:40,textAlign:'center',fontSize:s.fontSize,color:'white',opacity:appear,textShadow:'0 2px 8px #000',whiteSpace:'pre-wrap'}}>{s.caption}</div>}
 </AbsoluteFill>
}
