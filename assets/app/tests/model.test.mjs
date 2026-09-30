import {test} from 'node:test';import assert from 'node:assert/strict';
import {defaults,applyChange,validateSettings} from '../server/model.mjs';
const p=()=>({revision:5,settings:{...defaults,dim:.47},locks:[]});
test('agent timing patch preserves manual brightness',()=>{const v=applyChange(p(),{revision:5,actor:'agent',patch:{duration:8}});assert.equal(v.settings.dim,.47);assert.equal(v.settings.duration,8);assert.equal(v.revision,6)});
test('stale revisions rejected',()=>assert.throws(()=>applyChange(p(),{revision:4,patch:{dim:.8}}),e=>e.status===409));
test('agent cannot modify locked parameter or unlock it',()=>{const v={...p(),locks:['dim']};assert.throws(()=>applyChange(v,{revision:5,actor:'agent',patch:{dim:.8}}),e=>e.status===423);assert.throws(()=>applyChange(v,{revision:5,actor:'agent',locks:[]}),e=>e.status===403)});
test('user can adjust own lock and undo remains explicit',()=>{const v={...p(),locks:['dim']};assert.equal(applyChange(v,{revision:5,actor:'user',patch:{dim:.2}}).settings.dim,.2)});
test('invalid duration, unknown properties and nonfinite input rejected',()=>{assert.throws(()=>validateSettings({...defaults,start:5.9}));assert.throws(()=>applyChange(p(),{revision:5,patch:{notAParameter:1}}));assert.throws(()=>validateSettings({...defaults,zoom:Infinity}))});

test('graphic settings reject unsupported numeric values',()=>{assert.throws(()=>validateSettings({...defaults,decimals:1.5}));assert.throws(()=>validateSettings({...defaults,value:Infinity}));assert.throws(()=>validateSettings({...defaults,quote:'x'.repeat(241)}));assert.equal(validateSettings({...defaults,value:-12.5,decimals:1}).value,-12.5)});

test('magnifier rejects a scroll outside the visible hold interval',()=>{const p={template:'paper-magnifier-v1',revision:1,settings:{...defaults},locks:[]};assert.throws(()=>applyChange(p,{revision:1,patch:{scrollY:20,scrollStart:.5}}),e=>e.status===400);assert.throws(()=>applyChange(p,{revision:1,patch:{scrollY:20,scrollStart:5.8,scrollDuration:1}}),e=>e.status===400);assert.equal(applyChange(p,{revision:1,patch:{scrollY:20,scrollStart:3,scrollDuration:.6}}).settings.scrollY,20)});

test('video magnifier reserves time for cue before zoom and rejects duration edits',()=>{const p={template:'video-magnifier-v1',revision:1,settings:{...defaults,duration:3,start:.3,cueDuration:.6,entrance:.5},locks:[]};assert.equal(applyChange(p,{revision:1,patch:{sampleX:40}}).settings.sampleX,40);assert.throws(()=>applyChange(p,{revision:1,patch:{cueDuration:3}}),e=>e.status===400);assert.throws(()=>applyChange(p,{revision:1,patch:{duration:5}}),e=>e.status===400)});
