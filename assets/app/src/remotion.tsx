import {timelineStyle,timelineEvents} from '../shared/timeline';
import React from 'react';
import {Composition,registerRoot} from 'remotion';
import {PaperScene} from './Scene';
import type {Project} from './types';
const placeholder:Project={id:'',version:1,template:'paper-highlight-v1',revision:1,documentId:'',documentName:'',page:{number:1,width:612,height:792,imageUrl:''},selection:{page:1,startChar:0,endChar:1,quote:'',context:'',method:'',rects:[{x:72,y:300,width:468,height:20}]},query:'',settings:{timelineStyle,timelineEvents,cueDuration:.6,lensX:50,lensY:46,lensWidth:25,lensHeight:30,sampleX:50,sampleY:50,scrollY:0,scrollStart:3,scrollDuration:0.6,transitionDuration:1,focusBlur:0,curl:.5,shadow:.4,direction:'left',audioMode:'crossfade',quote:'',value:95,fromValue:0,decimals:0,unit:'%',dim:.62,highlightOpacity:.34,highlightColor:'#f4c95d',zoom:2.15,padding:3,focusX:0,focusY:0,duration:6,start:1,entrance:.7,caption:'',sourceLabel:'',fontSize:34},locks:[],createdAt:'',updatedAt:'',lastActor:'agent'};
registerRoot(()=> <Composition id="PaperHighlight" component={PaperScene} width={1920} height={1080} fps={30} durationInFrames={180} defaultProps={{project:placeholder}} calculateMetadata={({props})=>({durationInFrames:Math.round(props.project.settings.duration*30)})}/>);
