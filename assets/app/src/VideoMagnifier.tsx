import React from 'react';
import {AbsoluteFill,Img,Html5Audio,useCurrentFrame,useVideoConfig} from 'remotion';
import type {Project} from './types';
const ease=(t:number)=>{const x=Math.max(0,Math.min(1,t));return x*x*(3-2*x)};
export function VideoMagnifier({project}:{project:Project}){
 const {width,height,fps}=useVideoConfig(),frame=useCurrentFrame(),t=frame/fps,s=project.settings,video=project.video!;
 const cue=ease((t-s.start)/.15),expand=ease((t-s.start-s.cueDuration)/s.entrance),m=1+(s.zoom-1)*expand;
 const sampleX=s.sampleX*width/100,sampleY=s.sampleY*height/100,targetW=s.lensWidth*width/100,targetH=s.lensHeight*height/100;
 const w=targetW*m/s.zoom,h=targetH*m/s.zoom,cx=sampleX+(s.lensX*width/100-sampleX)*expand,cy=sampleY+(s.lensY*height/100-sampleY)*expand;
 const src=`${video.baseUrl}/${String(Math.min(video.frames-1,frame)+1).padStart(6,'0')}.jpg`;
 return <AbsoluteFill style={{background:'#111',overflow:'hidden'}}>
  <Img src={src} style={{position:'absolute',inset:0,width,height}}/>
  <AbsoluteFill style={{background:'black',opacity:s.dim*expand}}/>
  <div style={{position:'absolute',left:sampleX-targetW/s.zoom/2,top:sampleY-targetH/s.zoom/2,width:targetW/s.zoom,height:targetH/s.zoom,background:s.highlightColor+'30',outline:`4px solid ${s.highlightColor}`,boxShadow:`0 0 24px ${s.highlightColor}66`,opacity:cue*(1-expand),borderRadius:4}}/>
  <div style={{position:'absolute',left:cx-w/2,top:cy-h/2,width:w,height:h,overflow:'hidden',borderRadius:4,opacity:expand>0?1:0,boxShadow:`0 18px 65px rgba(0,0,0,${s.shadow*expand})`,outline:`${2*expand}px solid white`}}>
   <Img src={src} style={{position:'absolute',width:width*m,height:height*m,left:w/2-m*sampleX,top:h/2-m*sampleY,maxWidth:'none'}}/>
  </div>
  {video.audioUrl&&s.audioMode!=='mute'&&<Html5Audio src={video.audioUrl}/>}
 </AbsoluteFill>
}
