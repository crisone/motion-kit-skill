import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const bin=path.dirname(require.resolve('@remotion/compositor-darwin-arm64/package.json'));
export function ff(tool,args){return new Promise((resolve,reject)=>{const p=spawn(path.join(bin,tool),args,{env:{...process.env,DYLD_LIBRARY_PATH:bin}});let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err=(err+d).slice(-6000));p.on('error',reject);p.on('close',c=>c?reject(Object.assign(new Error('视频处理失败：'+err),{status:422})):resolve(out))})}
export function mediaStore(root){
 const dir=path.join(root,'data','media');fs.mkdirSync(dir,{recursive:true});const running=new Map();
 const get=id=>{if(typeof id!=='string'||!/^[a-f0-9]{20}$/.test(id)||!fs.existsSync(path.join(dir,id,'media.json')))throw Object.assign(new Error('视频素材不存在。'),{status:404});return JSON.parse(fs.readFileSync(path.join(dir,id,'media.json'),'utf8'))};
 async function ingest(file,name=path.basename(file)){
  if(!path.isAbsolute(file)||!fs.statSync(file).isFile()||fs.statSync(file).size>500*1024*1024)throw Object.assign(new Error('请提供不超过 500MB 的本地视频。'),{status:400});
  const hash=crypto.createHash('sha256');for await(const chunk of fs.createReadStream(file))hash.update(chunk);const id=hash.digest('hex').slice(0,20),target=path.join(dir,id);
  if(fs.existsSync(path.join(target,'media.json')))return get(id);if(running.has(id))return running.get(id);
  const task=(async()=>{const probe=JSON.parse(await ff('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));const v=probe.streams.find(s=>s.codec_type==='video'&&!s.disposition?.attached_pic);const duration=Number(v?.duration||probe.format?.duration);if(!v||!Number.isFinite(duration)||duration<.5||duration>60)throw Object.assign(new Error('第一版支持每段 0.5–60 秒的视频；请先裁出需要衔接的片段。'),{status:400});
   fs.mkdirSync(target,{recursive:true});await ff('ffmpeg',['-v','error','-y','-i',file,'-map','0:v:0','-an','-vf','scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080','-r','30','-fps_mode','cfr','-q:v','2','-frames:v','1800',path.join(target,'%06d.jpg')]);
   const frames=fs.readdirSync(target).filter(f=>/^\d{6}\.jpg$/.test(f)).length;const audio=probe.streams.some(s=>s.codec_type==='audio');if(audio)await ff('ffmpeg',['-v','error','-y','-i',file,'-vn','-t',String(frames/30),'-ar','48000','-ac','2','-c:a','pcm_s16le',path.join(target,'audio.wav')]);
   const m={id,name,width:1920,height:1080,frames,duration:frames/30,fps:30,baseUrl:'/media/'+id,audioUrl:audio?'/media/'+id+'/audio.wav':null,originalWidth:v.width,originalHeight:v.height};fs.writeFileSync(path.join(target,'media.json'),JSON.stringify(m,null,2));return m;
  })();running.set(id,task);try{return await task}finally{running.delete(id)}
 }
 return {dir,get,ingest,list:()=>fs.readdirSync(dir).filter(id=>fs.existsSync(path.join(dir,id,'media.json'))).map(get)};
}
