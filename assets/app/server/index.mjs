import {validateTimeline} from '../shared/timeline.js';
import express from 'express';
import {mediaStore} from './media.mjs';
import {transitionSettings} from './model.mjs';
import templates from '../shared/templates.json' with {type:'json'};
import {z} from 'zod';
import {settingsSchema} from './model.mjs';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createServer as createViteServer} from 'vite';
import {bundle} from '@remotion/bundler';
import {selectComposition,renderMedia} from '@remotion/renderer';
import {defaults,editableKeys,applyChange,validateSettings,validateMagnifier,validateVideoMagnifier} from './model.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=path.join(root,'data'),docs=path.join(data,'documents'),projects=path.join(data,'projects'),outputs=path.join(root,'outputs');
for(const d of [docs,projects,outputs])fs.mkdirSync(d,{recursive:true});
const port=Number(process.env.PORT||4317),origin=`http://127.0.0.1:${port}`;
const python=process.env.PAPER_PYTHON||'python3';
const media=mediaStore(root);
const app=express();app.disable('x-powered-by');
app.use((req,res,next)=>{
 if(req.headers.host!==`127.0.0.1:${port}`&&req.headers.host!==`localhost:${port}`)return res.status(403).json({error:'仅允许本机访问。'});
 if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&!([origin,`http://localhost:${port}`].includes(req.headers.origin)))return res.status(403).json({error:'不接受跨站修改。'});
 next();
});
app.use(express.json({limit:'2mb'}));
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:40*1024*1024,files:1}});
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function safeId(id){if(typeof id!=='string')fail('缺少标识。');if(!/^[a-f0-9-]{8,40}$/.test(id))fail('无效标识。');return id;}
function read(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function write(file,value){fs.writeFileSync(file+'.tmp',JSON.stringify(value,null,2));fs.renameSync(file+'.tmp',file);}
function getDoc(id){const file=path.join(docs,safeId(id),'document.json');if(!fs.existsSync(file))fail('文档不存在。',404);return read(file);}
const workspaces=path.join(data,'workspaces');fs.mkdirSync(workspaces,{recursive:true});
const defaultWorkspace='00000000-0000-4000-8000-000000000001';
if(!fs.existsSync(path.join(workspaces,defaultWorkspace+'.json')))write(path.join(workspaces,defaultWorkspace+'.json'),{id:defaultWorkspace,name:'我的第一个项目',revision:1,createdAt:new Date().toISOString()});
function getWorkspace(id){const f=path.join(workspaces,safeId(id)+'.json');if(!fs.existsSync(f))fail('项目不存在。',404);return read(f)}
function normalize(p){return {...p,name:p.name||p.documentName||'未命名特效',workspaceId:p.workspaceId||defaultWorkspace,status:p.status||'active',settings:{...defaults,...p.settings}}}
function event(p,old,type='update'){const changes={};for(const k of ['settings','name','workspaceId','status','locks']){if(k==='settings'){for(const key of Object.keys(p.settings))if(JSON.stringify(old?.settings?.[key])!==JSON.stringify(p.settings[key]))changes['settings.'+key]={before:old?.settings?.[key]??null,after:p.settings[key]}}else if(JSON.stringify(old?.[k])!==JSON.stringify(p[k]))changes[k]={before:old?.[k]??null,after:p[k]??null}}fs.appendFileSync(path.join(projects,p.id+'.events.jsonl'),JSON.stringify({revision:p.revision,actor:p.lastActor,type,time:p.updatedAt,changes})+'\n')}
function getProject(id){const file=path.join(projects,safeId(id)+'.json');if(!fs.existsSync(file))fail('镜头不存在。',404);return normalize(read(file));}
function saveProject(p,old){if(old)fs.appendFileSync(path.join(projects,p.id+'.history.jsonl'),JSON.stringify(old)+'\n');write(path.join(projects,p.id+'.json'),p);event(p,old,old?'update':'create');return p;}
function pdf(args,input){return new Promise((resolve,reject)=>{
 const proc=spawn(python,[path.join(root,'server/pdf.py'),...args],{cwd:root,stdio:['pipe','pipe','pipe']});let out='',err='';
 proc.stdout.on('data',d=>out+=d);proc.stderr.on('data',d=>err+=d);proc.on('error',reject);proc.on('close',code=>{if(code)return reject(Object.assign(new Error(err.trim()||'PDF 处理失败。'),{status:422}));try{resolve(JSON.parse(out))}catch{reject(new Error('PDF 返回格式无效。'))}});proc.stdin.end(input?JSON.stringify(input):'');
});}
const importing=new Map();
async function importDocument(buffer,name){
 if(buffer.length>40*1024*1024)fail('PDF 限制为40MB。');if(!buffer.subarray(0,1024).includes(Buffer.from('%PDF-')))fail('请选择有效 PDF 文件。');
 const id=crypto.createHash('sha256').update(buffer).digest('hex').slice(0,20),dir=path.join(docs,id);
 if(fs.existsSync(path.join(dir,'document.json')))return getDoc(id);
 if(importing.has(id))return importing.get(id);
 const task=(async()=>{fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'source.pdf'),buffer);const index=await pdf(['extract',path.join(dir,'source.pdf')]);write(path.join(dir,'index.json'),index);
 const document={id,name:path.basename(name),title:index.title==='source'?path.basename(name,'.pdf'):index.title,pageCount:index.pageCount,warnings:index.warnings,pages:index.pages.map(({number,width,height,text})=>({number,width,height,textLength:text.length})),createdAt:new Date().toISOString()};write(path.join(dir,'document.json'),document);return document;})();importing.set(id,task);try{return await task}finally{importing.delete(id)}
}
const renderingPages=new Map();
async function ensurePage(documentId,pageNumber){
 const doc=getDoc(documentId);if(!Number.isInteger(pageNumber)||pageNumber<1||pageNumber>doc.pageCount)fail('页码超出范围。');const dir=path.join(docs,documentId),image=path.join(dir,`page-${pageNumber}.png`);
 if(!fs.existsSync(image)){
  if(!renderingPages.has(image))renderingPages.set(image,pdf(['render',path.join(dir,'source.pdf'),String(pageNumber),image]));
  try{await renderingPages.get(image)}finally{renderingPages.delete(image)}
 }
 return {...doc.pages[pageNumber-1],imageUrl:`/assets/${documentId}/page-${pageNumber}.png`};
}
const wrap=fn=>(req,res,next)=>Promise.resolve().then(()=>fn(req,res)).catch(next);
// Canonical instance API; /projects remains a compatibility alias for v0.1 shots.
app.use((q,_r,next)=>{q.url=q.url.replace(/^\/api\/instances(?=\/|\?|$)/,'/api/projects');next()});
const videoUpload=multer({dest:path.join(data,'uploads'),limits:{fileSize:500*1024*1024,files:1}});
app.get('/api/media',(_q,r)=>r.json(media.list()));
app.post('/api/media/import',wrap(async(q,r)=>{if(typeof q.body.path!=='string'||!path.isAbsolute(q.body.path))fail('请输入本地视频绝对路径。');r.json(await media.ingest(q.body.path))}));
app.post('/api/media',videoUpload.single('file'),wrap(async(q,r)=>{if(!q.file)fail('请选择视频。');try{r.json(await media.ingest(path.resolve(q.file.path),q.file.originalname))}finally{fs.unlinkSync(q.file.path)}}));
app.get('/api/templates',(_q,r)=>r.json(templates));
app.get('/api/templates/:id',wrap((q,r)=>{const t=templates.find(t=>t.id===q.params.id);if(!t)fail('模板不存在。',404);r.json({...t,settingsSchema:z.toJSONSchema(settingsSchema),requiredInput:t.input==='video'?['video']:t.input==='videos'?['videoA','videoB','transitionDuration']:t.input==='pdf'?['documentId','query']:['settings'],previewUrl:origin+'/#templates'})}));
app.get('/api/workspaces',(_q,r)=>r.json(fs.readdirSync(workspaces).filter(f=>f.endsWith('.json')).map(f=>read(path.join(workspaces,f)))));
app.post('/api/workspaces',wrap((q,r)=>{const name=z.string().trim().min(1).max(80).parse(q.body.name);const w={id:crypto.randomUUID(),name,revision:1,createdAt:new Date().toISOString()};write(path.join(workspaces,w.id+'.json'),w);r.json(w)}));
app.patch('/api/workspaces/:id',wrap((q,r)=>{const w=getWorkspace(q.params.id);if(w.revision!==q.body.revision)fail('项目版本已变化。',409);const next={...w,name:z.string().trim().min(1).max(80).parse(q.body.name),revision:w.revision+1};write(path.join(workspaces,w.id+'.json'),next);r.json(next)}));
app.get('/api/projects/:id/adjustments',wrap((q,r)=>{getProject(q.params.id);const f=path.join(projects,q.params.id+'.events.jsonl');const events=fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean).map(JSON.parse):[];r.json({instanceId:q.params.id,coverage:'Events recorded since toolkit v0.2; earlier history is not included.',events:events.filter(e=>e.revision>Number(q.query.sinceRevision||0)&&(!q.query.actor||e.actor===q.query.actor)),preferencePolicy:'User adjustments describe this instance only; do not infer permanent preferences without confirmation.'})}));
app.patch('/api/projects/:id/metadata',wrap((q,r)=>{const old=getProject(q.params.id);const changes=z.object({name:z.string().trim().min(1).max(100).optional(),workspaceId:z.string().optional(),status:z.enum(['active','archived']).optional()}).strict().parse(q.body.patch);if(changes.workspaceId)getWorkspace(changes.workspaceId);const p=applyChange(old,{revision:q.body.revision,actor:q.body.actor});r.json(saveProject({...p,...changes},old))}));
app.post('/api/projects/:id/duplicate',wrap((q,r)=>{const old=getProject(q.params.id);if(old.revision!==q.body.revision)fail('版本已变化。',409);const workspaceId=q.body.workspaceId||old.workspaceId;getWorkspace(workspaceId);const now=new Date().toISOString();r.json(saveProject({...old,id:crypto.randomUUID(),name:old.name+' · 副本',workspaceId,revision:1,createdAt:now,updatedAt:now,lastActor:q.body.actor==='user'?'user':'agent'}))}));
app.get('/api/health',(_q,r)=>r.json({ok:true,version:'0.2.0',capabilities:['pdf-text-search','line-coordinate-highlights','remotion-preview','patch-with-revision','locks','undo','mp4','prores'],limitations:['no-ocr','no-in-app-llm','one-page-per-shot']}));
app.get('/api/schema',(_q,r)=>r.json({defaults,editableKeys,patch:{revision:'required current integer',actor:'agent | user',patch:'partial settings',locks:'user only'},coordinates:'rotated PDF page points, origin top-left',naturalLanguage:'Agent interprets the user request and calls these endpoints. No built-in LLM service.'}));
app.get('/api/documents',(_q,r)=>r.json(fs.readdirSync(docs).filter(id=>fs.existsSync(path.join(docs,id,'document.json'))).map(getDoc)));
app.post('/api/documents',upload.single('file'),wrap(async(q,r)=>{if(!q.file)fail('缺少 PDF 文件。');r.json(await importDocument(q.file.buffer,q.file.originalname));}));
app.post('/api/documents/import',wrap(async(q,r)=>{if(typeof q.body.path!=='string'||!path.isAbsolute(q.body.path))fail('请提供 PDF 的绝对路径。');r.json(await importDocument(fs.readFileSync(q.body.path),path.basename(q.body.path)));}));
app.get('/api/documents/:id',wrap((q,r)=>r.json(getDoc(q.params.id))));
app.get('/api/documents/:id/pages/:page',wrap(async(q,r)=>{const p=await ensurePage(q.params.id,Number(q.params.page));const index=read(path.join(docs,q.params.id,'index.json'));r.json({...p,text:index.pages[p.number-1].text});}));
app.post('/api/documents/:id/search',wrap(async(q,r)=>{getDoc(q.params.id);if(typeof q.body.query!=='string'||q.body.query.length>4000)fail('请输入引用原句，最多4000字符。');if(q.body.page!==undefined&&(!Number.isInteger(q.body.page)||q.body.page<1))fail('页码应为正整数。');r.json(await pdf(['search',path.join(docs,q.params.id,'index.json')],q.body));}));
app.get('/api/projects',(q,r)=>r.json(fs.readdirSync(projects).filter(f=>f.endsWith('.json')).map(f=>normalize(read(path.join(projects,f)))).filter(p=>(!q.query.workspaceId||p.workspaceId===q.query.workspaceId)&&(!q.query.status||p.status===q.query.status)).sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt))));
app.get('/api/projects/:id',wrap((q,r)=>r.json(getProject(q.params.id))));
app.post('/api/projects',wrap(async(q,r)=>{
 const template=templates.find(t=>t.id===(q.body.template||'paper-highlight-v1'));if(!template)fail('模板不存在。');
 const workspaceId=q.body.workspaceId||defaultWorkspace;getWorkspace(workspaceId);
 const name=z.string().trim().min(1).max(100).parse(q.body.name||template.name);
 let documentId='',query='',selection={page:1,startChar:0,endChar:0,quote:'',rects:[],context:'',method:'manual'},page={number:1,width:1920,height:1080,imageUrl:''},documentName='',sourceLabel='';
 if(template.input==='pdf'){
  documentId=q.body.documentId;query=q.body.query;const doc=getDoc(documentId),matchIndex=q.body.matchIndex??0;
  if(typeof query!=='string'||query.length>4000||!query.trim())fail('缺少有效原句。');if(!Number.isInteger(matchIndex)||matchIndex<0)fail('matchIndex 应为非负整数。');
  const found=await pdf(['search',path.join(docs,documentId,'index.json')],{query,page:q.body.page});
  if(found.total>1&&q.body.matchIndex===undefined)fail('多处匹配，请明确选择 matchIndex。',409);
  selection=found.matches[matchIndex];if(!selection)fail('未找到原句。',422);page=await ensurePage(documentId,selection.page);documentName=doc.name;sourceLabel=doc.title.slice(0,80);
 }
 let videoMedia,video;
 if(template.input==='video'){video=typeof q.body.video==='string'&&path.isAbsolute(q.body.video)?await media.ingest(q.body.video):media.get(q.body.video)}
 if(template.input==='videos'){const resolve=async v=>typeof v==='string'&&path.isAbsolute(v)?media.ingest(v):media.get(v);videoMedia={a:await resolve(q.body.videoA),b:await resolve(q.body.videoB)}}
 const now=new Date().toISOString();let settings=validateSettings({...defaults,sourceLabel,...template.defaults,...q.body.settings},template.input==='videos'||template.id==='timeline-v1');
 if(video){const duration=video.frames/30;settings=validateVideoMagnifier(validateSettings({...settings,start:Math.min(.5,duration*.1),cueDuration:Math.min(.6,Math.max(.15,duration*.25)),entrance:Math.min(.5,Math.max(.15,duration*.25)),...q.body.settings,duration},true))}
 if(videoMedia)settings=transitionSettings({...settings,transitionDuration:q.body.transitionDuration??settings.transitionDuration},videoMedia);
 if(template.id==='paper-magnifier-v1'){
  const r=selection.rects,base=Math.min(900/page.height,1680/page.width),cx=(Math.min(...r.map(r=>r.x))+Math.max(...r.map(r=>r.x+r.width)))/2,cy=(Math.min(...r.map(r=>r.y))+Math.max(...r.map(r=>r.y+r.height)))/2;
  const x=((1920-page.width*base)/2+cx*base)/1920*100,y=((1080-page.height*base)/2+cy*base)/1080*100;
  settings=validateMagnifier(validateSettings({...settings,sampleX:x,sampleY:y,lensX:Math.max(20,Math.min(80,x)),lensY:Math.max(25,Math.min(70,y)),...q.body.settings}));
 }
 if(template.id==='timeline-v1')validateTimeline(settings);
 if(template.input==='text'&&!settings.quote.trim())fail('引用卡需要 quote。');
 const p={id:crypto.randomUUID(),name,workspaceId,status:'active',version:2,template:template.id,...(videoMedia?{media:videoMedia}:{}),...(video?{video}:{}),revision:1,documentId,documentName,page,selection,query,settings,locks:[],createdAt:now,updatedAt:now,lastActor:q.body.actor==='user'?'user':'agent'};saveProject(p);r.json(p);
}));
app.patch('/api/projects/:id',wrap((q,r)=>{const old=getProject(q.params.id);r.json(saveProject(applyChange(old,q.body),old));}));
app.post('/api/projects/:id/undo',wrap((q,r)=>{const current=getProject(q.params.id);if(q.body.revision!==current.revision)fail('版本已变化，请刷新后重试。',409);if(q.body.actor!=='user')fail('撤销需要用户操作。',403);const f=path.join(projects,current.id+'.history.jsonl');const history=fs.existsSync(f)?fs.readFileSync(f,'utf8').trim().split('\n').filter(Boolean):[];if(!history.length)fail('没有可撤销的修改。');const previous=normalize(JSON.parse(history.pop()));const p={...previous,revision:current.revision+1,updatedAt:new Date().toISOString(),lastActor:'user'};write(path.join(projects,p.id+'.json'),p);event(p,current,'undo');fs.writeFileSync(f,history.length?history.join('\n')+'\n':'');r.json(p);}));
const jobsFile=path.join(data,'jobs.json');
const jobs=new Map((fs.existsSync(jobsFile)?read(jobsFile):[]).map(j=>[j.id,['done','error'].includes(j.status)?j:{...j,status:'error',error:'服务已重启，请重新导出。'}]));let bundling;
function persistJobs(){write(jobsFile,[...jobs.values()]);}
async function runRender(job,p){
 try{
  job.status='bundling';if(!bundling)bundling=bundle({entryPoint:path.join(root,'src/remotion.tsx'),outDir:path.join(root,'.remotion-bundle'),publicDir:path.join(root,'public')}).catch(e=>{bundling=null;throw e});
  const serveUrl=await bundling;job.status='rendering';
  const inputProps={project:{...p,...(p.video?{video:{...p.video,baseUrl:origin+p.video.baseUrl,audioUrl:p.video.audioUrl?origin+p.video.audioUrl:null}}:{}),...(p.media?{media:Object.fromEntries(Object.entries(p.media).map(([k,m])=>[k,{...m,baseUrl:origin+m.baseUrl,audioUrl:m.audioUrl?origin+m.audioUrl:null}]))}:{}),page:{...p.page,imageUrl:p.page.imageUrl?origin+p.page.imageUrl:''}}};
  const browserExecutable=process.env.PAPER_CHROME||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const common={serveUrl,inputProps,browserExecutable,chromeMode:'chrome-for-testing'};
  const composition=await selectComposition({...common,id:'PaperHighlight'});
  const ext=job.format==='mp4'?'mp4':'mov',file=`${p.id}-r${p.revision}-${job.id}.${ext}`;
  await renderMedia({...common,composition,colorSpace:'bt709',imageFormat:'png',codec:job.format==='mp4'?'h264':'prores',...(job.format==='prores'?{proResProfile:'hq',pixelFormat:'yuv422p10le'}:{crf:18}),outputLocation:path.join(outputs,file),concurrency:2,overwrite:false,onProgress:({progress})=>job.progress=progress});
  job.status='done';job.progress=1;job.url='/outputs/'+file;job.outputPath=path.join(outputs,file);
  write(path.join(outputs,file+'.project.json'),p);
 }catch(e){job.status='error';job.error=e.message;console.error('Render failed:',e)}finally{persistJobs()}
}
app.post('/api/projects/:id/render',wrap((q,r)=>{const p=getProject(q.params.id);if(q.body.revision!==p.revision)fail('请保存并读取最新版本后导出。',409);if(!['mp4','prores'].includes(q.body.format??'mp4'))fail('format 必须是 mp4 或 prores。');if([...jobs.values()].some(j=>['queued','bundling','rendering'].includes(j.status)))fail('已有导出正在进行，请等待完成。',409);const job={id:crypto.randomUUID().slice(0,8),projectId:p.id,revision:p.revision,format:q.body.format??'mp4',status:'queued',progress:0};jobs.set(job.id,job);persistJobs();r.json(job);void runRender(job,p);}));
app.get('/api/projects/:id/jobs',wrap((q,r)=>{getProject(q.params.id);r.json([...jobs.values()].filter(j=>j.projectId===q.params.id).reverse());}));
app.get('/api/jobs/:id',wrap((q,r)=>{const job=jobs.get(q.params.id);if(!job)fail('任务不存在。',404);r.json(job);}));
app.use('/media',(_q,r,next)=>{r.setHeader('Access-Control-Allow-Origin','*');next()},express.static(media.dir,{dotfiles:'deny'}));
app.use('/assets',express.static(docs,{dotfiles:'deny'}));app.use('/outputs',express.static(outputs));
app.use('/api',(_q,r)=>r.status(404).json({error:'未知接口。'}));
app.use((err,_q,r,_next)=>r.status(err.status||((err.name==='ZodError'||err.code==='LIMIT_FILE_SIZE')?400:500)).json({error:err.message}));
const vite=await createViteServer({root,server:{middlewareMode:true,hmr:{port:port+1,host:'127.0.0.1'},watch:{ignored:['**/.remotion-bundle/**','**/data/**','**/outputs/**','**/dist/**']}},appType:'spa'});app.use(vite.middlewares);
app.listen(port,'127.0.0.1',(err)=>{if(err){console.error(err);process.exitCode=1;}else console.log(`Paper Motion: ${origin}`)});
