import React,{useEffect,useState} from 'react';
import type {Settings} from './types';
import {timelineStyleSchema,timelineEventsSchema,timelineStyle,validateTimeline} from '../shared/timeline';
type Props={settings:Settings;change:<K extends keyof Settings>(key:K,value:Settings[K])=>void;locks:(keyof Settings)[];toggleLock:(key:keyof Settings)=>void;seek:(time:number)=>void};
export function TimelineInspector({settings:s,change,locks,toggleLock,seek}:Props){
 const [events,setEvents]=useState(s.timelineEvents),[duration,setDuration]=useState(s.duration),[entrance,setEntrance]=useState(s.entrance),[dirty,setDirty]=useState(false);
 const [code,setCode]=useState(JSON.stringify(s.timelineStyle,null,2)),[codeDirty,setCodeDirty]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const guard=(e:BeforeUnloadEvent)=>{if(dirty||codeDirty){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',guard);return()=>window.removeEventListener('beforeunload',guard)},[dirty,codeDirty]);
 const eventsKey=JSON.stringify(s.timelineEvents),styleKey=JSON.stringify(s.timelineStyle);
 useEffect(()=>{if(!dirty){setEvents(s.timelineEvents);setDuration(s.duration);setEntrance(s.entrance)}},[eventsKey,s.duration,s.entrance,dirty]);
 useEffect(()=>{if(!codeDirty)setCode(JSON.stringify(s.timelineStyle,null,2))},[styleKey,codeDirty]);
 const lock=(key:keyof Settings)=><button onClick={()=>toggleLock(key)}>{locks.includes(key)?'已锁':'锁定 Agent'}</button>;
 function applyEvents(){try{const parsed=timelineEventsSchema.parse(events);validateTimeline({...s,timelineEvents:parsed,duration,entrance});change('timelineEvents',parsed);change('duration',duration);change('entrance',entrance);setDirty(false);setError('')}catch(e){setError((e as Error).message)}}
 function applyStyle(){try{const parsed=timelineStyleSchema.parse({...s.timelineStyle,...timelineStyleSchema.partial().parse(JSON.parse(code))});change('timelineStyle',parsed);setCodeDirty(false);setError('')}catch(e){setError((e as Error).message)}}
 return <>
  <div className="section-label">标题与标注</div>
  <label className="label">标题<input aria-label="时间线标题" maxLength={80} value={s.caption} onChange={e=>change('caption',e.target.value)}/></label>
  <label className="label">顶部标注<input aria-label="时间线标注" maxLength={100} value={s.sourceLabel} onChange={e=>change('sourceLabel',e.target.value)}/></label>
  <div className="section-label">节点与节奏 {lock('timelineEvents')}</div>
  <p className="muted">2–5 个节点，等距排列；出现时间以秒表示。编辑后点“应用节点与时间”。</p>
  {events.map((event,i)=><fieldset className="timeline-event" key={i}><legend>节点 {i+1}</legend>
   <div className="timings">{(['at','date'] as const).map(key=><label key={key}>{key==='at'?'出现时间':'日期 / 阶段'}<input aria-label={`节点 ${i+1} ${key}`} type={key==='at'?'number':'text'} step={.1} value={event[key]} onChange={e=>{setDirty(true);setEvents(events.map((v,j)=>j===i?{...v,[key]:key==='at'?Number(e.target.value):e.target.value}:v))}}/></label>)}</div>
   {(['value','label'] as const).map(key=><label className="label" key={key}>{key==='value'?'重点文字 / 数值':'说明'}<input aria-label={`节点 ${i+1} ${key}`} maxLength={key==='value'?24:60} value={event[key]} onChange={e=>{setDirty(true);setEvents(events.map((v,j)=>j===i?{...v,[key]:e.target.value}:v))}}/></label>)}
   <button disabled={dirty} onClick={()=>seek(event.at+s.entrance)}>预览节点</button> <button disabled={events.length<=2} onClick={()=>{setEvents(events.filter((_,j)=>j!==i));setDirty(true)}}>移除</button>
  </fieldset>)}
  <button disabled={events.length>=5} onClick={()=>{const at=events[events.length-1].at+2;setEvents([...events,{at,date:'新阶段',value:'新进展',label:''}]);setDuration(Math.max(duration,at+entrance+1));setDirty(true)}}>＋ 添加节点</button>
  <div className="timings"><label>总时长<input aria-label="时间线总时长" type="number" min={1} max={120} step={.1} value={duration} onChange={e=>{setDuration(Number(e.target.value));setDirty(true)}}/></label><label>节点入场<input aria-label="节点入场时长" type="number" min={.15} max={5} step={.1} value={entrance} onChange={e=>{setEntrance(Number(e.target.value));setDirty(true)}}/></label></div>
  <button disabled={!dirty} className="primary" onClick={applyEvents}>应用节点与时间</button>{dirty&&<button onClick={()=>setDirty(false)}>放弃草稿</button>}
  <div className="section-label">样式 {lock('timelineStyle')}</div>
  <label className="label">布局<select aria-label="时间线布局" value={s.timelineStyle.orientation} onChange={e=>change('timelineStyle',{...s.timelineStyle,orientation:e.target.value as 'vertical'|'horizontal'})}><option value="vertical">竖向 · 参考视频风格</option><option value="horizontal">横向 · 发展历程</option></select></label>
  {(['backgroundColor','accentColor','textColor'] as const).map((key,i)=><div className="color-row" key={key}><label>{['背景颜色','强调颜色','文字颜色'][i]}</label><input aria-label={['背景颜色','强调颜色','文字颜色'][i]} type="color" value={s.timelineStyle[key]} onChange={e=>change('timelineStyle',{...s.timelineStyle,[key]:e.target.value})}/></div>)}
  {([{key:'pastOpacity',label:'旧节点亮度',min:.1,max:1,step:.01},{key:'lineWidth',label:'线条粗细',min:1,max:12,step:1},{key:'nodeSize',label:'节点大小',min:8,max:32,step:1},{key:'fontSize',label:'重点字号',min:24,max:64,step:1}] as const).map(c=><label className="label" key={c.key}>{c.label} · {s.timelineStyle[c.key]}<input aria-label={c.label} type="range" min={c.min} max={c.max} step={c.step} value={s.timelineStyle[c.key]} onChange={e=>change('timelineStyle',{...s.timelineStyle,[c.key]:Number(e.target.value)})}/></label>)}
  <details className="timeline-code"><summary>样式代码 · Agent / 进阶</summary><p className="muted">JSON，可只填要修改的字段，应用时与当前样式合并。未应用草稿不会保存，也不会被外部更新覆盖。</p><textarea aria-label="时间线样式代码" rows={14} value={code} onChange={e=>{setCode(e.target.value);setCodeDirty(true)}}/><button onClick={applyStyle}>应用样式代码</button> <button onClick={()=>{setCodeDirty(false);setCode(JSON.stringify(s.timelineStyle,null,2))}}>读取当前样式</button></details>
  <button onClick={()=>{change('timelineStyle',timelineStyle);setCodeDirty(false)}}>恢复默认样式</button>
  {(dirty||codeDirty)&&<p role="status" className="muted">有未应用草稿；预览和导出使用已应用的参数。</p>}
  {error&&<p className="error" role="alert">{error}</p>}
 </>;
}
