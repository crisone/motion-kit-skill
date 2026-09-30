import {z} from 'zod';
import {timelineStyleSchema,timelineEventsSchema,timelineStyle,timelineEvents,validateTimeline} from '../shared/timeline.js';
export const settingsSchema=z.object({
 timelineStyle:timelineStyleSchema.default(timelineStyle),
 timelineEvents:timelineEventsSchema.default(timelineEvents),
  cueDuration:z.number().min(.15).max(5).default(.6),
  lensX:z.number().min(0).max(100).default(50),
  lensY:z.number().min(0).max(100).default(46),
  lensWidth:z.number().min(5).max(85).default(25),
  lensHeight:z.number().min(5).max(75).default(30),
  sampleX:z.number().min(0).max(100).default(50),
  sampleY:z.number().min(0).max(100).default(50),
  scrollY:z.number().min(-1500).max(1500).default(0),
  scrollStart:z.number().min(0).max(115).default(3),
  scrollDuration:z.number().min(0.15).max(10).default(0.6),
  transitionDuration:z.number().min(.2).max(10).default(1),
  focusBlur:z.number().min(0).max(40).default(0),
  curl:z.number().min(.1).max(1).default(.5),
  shadow:z.number().min(0).max(1).default(.4),
  direction:z.enum(['left','right','bottom-right']).default('left'),
  audioMode:z.enum(['crossfade','mute']).default('crossfade'),
  quote:z.string().max(240).default(''),
  value:z.number().min(-1e9).max(1e9).default(95),
  fromValue:z.number().min(-1e9).max(1e9).default(0),
  decimals:z.number().int().min(0).max(3).default(0),
  unit:z.string().max(12).default('%'),
  dim:z.number().min(0).max(.92).default(.62),
  highlightOpacity:z.number().min(0).max(.8).default(.34),
  highlightColor:z.string().regex(/^#[0-9a-f]{6}$/i).default('#f4c95d'),
  zoom:z.number().min(1).max(4).default(2.15),
  padding:z.number().min(0).max(20).default(3),
  focusX:z.number().min(-300).max(300).default(0),
  focusY:z.number().min(-300).max(300).default(0),
  duration:z.number().min(.2).max(120).default(6),
  start:z.number().min(0).max(120).default(1),
  entrance:z.number().min(.15).max(5).default(.7),
  caption:z.string().max(80).default(''),
  sourceLabel:z.string().max(100).default(''),
  fontSize:z.number().min(24).max(60).default(34)
}).strict();
export function validateSettings(data,transition=false){const s=settingsSchema.parse(data);if(!transition&&s.start+s.entrance>s.duration-.25)throw Object.assign(new Error('入场结束后至少留 0.25 秒阅读；请加长镜头或提前入场。'),{status:400});return s;}
export const defaults=validateSettings({});
export const editableKeys=Object.keys(defaults);
export function applyChange(project,{revision,patch={},actor='agent',locks}){
 if(revision!==project.revision)throw Object.assign(new Error('版本已变化，请读取最新配置后重试，保留用户的手调。'),{status:409});
 if(!['agent','user'].includes(actor))throw Object.assign(new Error('actor 必须是 agent 或 user。'),{status:400});
 if(locks!==undefined&&actor!=='user')throw Object.assign(new Error('只有用户可以修改参数锁定。'),{status:403});
 for(const key of Object.keys(patch)){
  if(!editableKeys.includes(key))throw Object.assign(new Error('未知参数：'+key),{status:400});
  if(actor==='agent'&&project.locks.includes(key))throw Object.assign(new Error('用户已锁定参数：'+key),{status:423});
 }
 if(locks!==undefined&&(!Array.isArray(locks)||locks.some(k=>!editableKeys.includes(k))))throw Object.assign(new Error('无效锁定列表。'),{status:400});
 if(project.template==='video-magnifier-v1'&&'duration' in patch)throw Object.assign(new Error('视频放大镜时长由视频素材决定。'),{status:400});
 if(project.template==='page-turn-v1'&&['duration','start','entrance'].some(k=>k in patch))throw Object.assign(new Error('翻页总时长由素材和 transitionDuration 自动计算。'),{status:400});
 const merged={...project.settings,...patch,...(patch.timelineStyle?{timelineStyle:{...project.settings.timelineStyle,...patch.timelineStyle}}:{})};
 const settings=project.template==='page-turn-v1'?transitionSettings(merged,project.media):validateSettings(merged,project.template==='timeline-v1');
 if(project.template==='timeline-v1')validateTimeline(settings);
 if(project.template==='video-magnifier-v1')validateVideoMagnifier(settings);
 if(project.template==='paper-magnifier-v1')validateMagnifier(settings);
 return {...project,settings,locks:locks??project.locks,revision:project.revision+1,updatedAt:new Date().toISOString(),lastActor:actor};
}

export function transitionSettings(data,media){const s=validateSettings(data,true);const n=Math.round(s.transitionDuration*30);if(!media?.a||!media?.b||n>Math.min(media.a.frames,media.b.frames))throw Object.assign(new Error('过渡时间不能长于任一视频。'),{status:400});return {...s,transitionDuration:n/30,duration:(media.a.frames+media.b.frames-n)/30,start:(media.a.frames-n)/30,entrance:n/30};}

export function validateMagnifier(s){if(s.scrollY!==0&&(s.scrollStart<s.start+s.entrance||s.scrollStart+s.scrollDuration>s.duration-.15))throw Object.assign(new Error('滚动应在放大窗展开后开始，并在镜头结束前至少 0.15 秒完成。'),{status:400});return s;}

export function validateVideoMagnifier(s){if(s.start+s.cueDuration+s.entrance>s.duration-.1)throw Object.assign(new Error('请给高亮提示、放大过程和至少 0.1 秒保持留出时间。'),{status:400});return s;}
