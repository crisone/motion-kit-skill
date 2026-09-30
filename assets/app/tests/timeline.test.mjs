import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,applyChange,validateSettings} from '../server/model.mjs';
import {validateTimeline} from '../shared/timeline.js';
const project=()=>({template:'timeline-v1',revision:1,locks:[],settings:{...defaults,duration:8}});
test('timeline rejects overlapping, unordered, and offscreen events',()=>{
 for(const ats of [[.5,.8,4],[3,1,5],[.5,3,7.5]])assert.throws(()=>validateTimeline({...project().settings,timelineEvents:ats.map(at=>({at,date:'示例'}))}));
 assert.equal(validateTimeline(project().settings).duration,8);
});
test('style patches preserve other user styling and honor locks and revision',()=>{
 const p=project();p.settings.timelineStyle={...p.settings.timelineStyle,lineWidth:9};
 const next=applyChange(p,{revision:1,patch:{timelineStyle:{accentColor:'#123456'}}});
 assert.equal(next.settings.timelineStyle.lineWidth,9);assert.equal(next.settings.timelineStyle.accentColor,'#123456');
 assert.throws(()=>applyChange({...p,locks:['timelineStyle']},{revision:1,patch:{timelineStyle:{lineWidth:4}}}),e=>e.status===423);
 assert.throws(()=>applyChange(p,{revision:0,patch:{timelineStyle:{lineWidth:4}}}),e=>e.status===409);
});
test('timeline schema rejects arbitrary styles, invalid values, and excessive nodes',()=>{
 for(const style of [{lineWidth:-1},{backgroundImage:'url(x)'},{orientation:'diagonal'},{pastOpacity:NaN}])assert.throws(()=>validateSettings({...defaults,timelineStyle:style}));
 assert.throws(()=>validateSettings({...defaults,timelineEvents:Array(6).fill({at:0,date:'x'})}));
 assert.throws(()=>applyChange(project(),{revision:1,patch:{duration:5}}));
});
