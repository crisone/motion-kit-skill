import {z} from 'zod';
const color=z.string().regex(/^#[0-9a-f]{6}$/i);
export const timelineStyleSchema=z.object({
 orientation:z.enum(['vertical','horizontal']).default('vertical'),
 backgroundColor:color.default('#141b20'),accentColor:color.default('#f29b51'),
 textColor:color.default('#f3f1eb'),lineColor:color.default('#56616a'),
 lineWidth:z.number().min(1).max(12).default(4),nodeSize:z.number().min(8).max(32).default(15),
 fontSize:z.number().min(24).max(64).default(42),
 fontFamily:z.enum(['sans','serif','mono']).default('sans'),
 pastOpacity:z.number().min(.1).max(1).default(.3),
}).strict();
export const timelineEventsSchema=z.array(z.object({
 at:z.number().min(0).max(119),date:z.string().trim().min(1).max(24),
 value:z.string().max(24).default(''),label:z.string().max(60).default(''),
}).strict()).min(2).max(5);
export const timelineStyle=timelineStyleSchema.parse({});
export const timelineEvents=[
 {at:.5,date:'2020',value:'起步',label:'提出问题，建立研究方向'},
 {at:3,date:'2022',value:'突破',label:'关键实验，验证核心假设'},
 {at:5.5,date:'2024',value:'应用',label:'成果落地，开启下一阶段'},
];
export function validateTimeline(s){
 z.object({duration:z.number().min(.2).max(120),entrance:z.number().min(.15).max(5)}).parse(s);
 const events=timelineEventsSchema.parse(s.timelineEvents);
 timelineStyleSchema.parse(s.timelineStyle);
 for(let i=0;i<events.length;i++){
  if(events[i].at+s.entrance>s.duration-.25)throw Object.assign(new Error('每个节点的入场须在结束前至少 0.25 秒完成。'),{status:400});
  if(i&&events[i].at<events[i-1].at+s.entrance)throw Object.assign(new Error('节点按时间排序，间隔至少为节点入场时长。'),{status:400});
 }
 return s;
}
