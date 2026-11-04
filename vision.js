import{features,summarize,messages}from'./vision-rules.js?v=20261104-visual';
const $=id=>document.getElementById(id);let model=null,run=0,report=null,controller=null,lastTimestamp=0;
const LIMIT_MS=30000;
function say(t){$('ai-status').textContent=t;}
function controls(busy){$('ai-start').disabled=busy;$('ai-cancel').disabled=!busy;if($('ai-prepare'))$('ai-prepare').disabled=busy;}
function check(signal){if(signal.aborted)throw new Error(signal.reason||'操作已取消');}
function bounded(promise,signal){return new Promise((resolve,reject)=>{const fail=()=>reject(new Error(signal.reason||'操作已取消'));if(signal.aborted)return fail();signal.addEventListener('abort',fail,{once:true});promise.then(v=>{signal.removeEventListener('abort',fail);resolve(v);},e=>{signal.removeEventListener('abort',fail);reject(e);});});}
async function init(update,signal){
 if(model)return model;
 update('正在准备AI…');
 const{FilesetResolver,PoseLandmarker}=await bounded(import('./vision_bundle.mjs'),signal);check(signal);
 const vision=await bounded(FilesetResolver.forVisionTasks(new URL('./',import.meta.url).href.replace(/\/$/,'')),signal);check(signal);
 update('正在下载AI…');
 const response=await fetch(new URL('./pose_landmarker_lite.task',import.meta.url),{signal});if(!response.ok)throw new Error('模型下载失败（'+response.status+'）');
 const total=Number(response.headers.get('Content-Length')),reader=response.body?.getReader();let bytes;
 if(reader){const chunks=[];let received=0;while(true){check(signal);const{value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;update('下载AI '+(total?Math.min(100,Math.round(received/total*100))+'%':(received/1048576).toFixed(1)+' MB'));}bytes=new Uint8Array(received);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}}
 else bytes=new Uint8Array(await response.arrayBuffer());
 check(signal);update('正在启动AI，首次使用请稍等…');
 const creating=PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetBuffer:bytes,delegate:'CPU'},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5});
 creating.then(m=>{if(signal.aborted)m.close();},()=>{});
 const m=await bounded(creating,signal);check(signal);model=m;lastTimestamp=0;return model;
}
export async function prepareModel(){
 cancelAnalysis();const id=run,abort=new AbortController();controller=abort;controls(true);const start=performance.now();let stage='正在准备AI…';
 const update=t=>{stage=t;if(id===run)say(stage+' · '+Math.floor((performance.now()-start)/1000)+'秒');};
 const ticker=setInterval(()=>update(stage),500),timer=setTimeout(()=>abort.abort('准备AI超过30秒。请检查网络后重试，也可先回放视频。'),LIMIT_MS);
 try{await init(update,abort.signal);if(id===run)say('AI已准备好，可以开始分析。');}
 catch(e){if(id===run){say('AI还没准备好。请检查网络后重试，或先回放视频。');detail(abort.signal.aborted?abort.signal.reason:e.message,'查看原因');}}
 finally{clearInterval(ticker);clearTimeout(timer);if(id===run){controller=null;controls(false);}}
}
function seek(video,time){return new Promise((resolve,reject)=>{if(Math.abs(video.currentTime-time)<.01&&video.readyState>=2)return resolve();const timer=setTimeout(()=>{video.removeEventListener('seeked',done);reject(new Error('视频读取超时，请换用MP4视频。'));},7000);function done(){clearTimeout(timer);resolve();}video.addEventListener('seeked',done,{once:true});video.currentTime=time;});}
export function cancelAnalysis(){run++;controller?.abort('操作已取消');controller=null;report=null;$('ai-result').replaceChildren();$('ai-canvas').hidden=true;controls(false);$('video').controls=true;say('尚未分析。');}
export function aiSummary(){return report?JSON.stringify(report):'';}
function block(text){const p=document.createElement('p');p.textContent=text;$('ai-result').append(p);}
function detail(text,label='分析详情'){const d=document.createElement('details');const s=document.createElement('summary');s.textContent=label;const p=document.createElement('p');p.textContent=text;d.append(s,p);$('ai-result').append(d);}
function overlay(canvas,points){const c=$('ai-canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);ctx.strokeStyle='#00ffe3';ctx.fillStyle='#00ffe3';ctx.lineWidth=3;
 for(const[a,b]of[[11,12],[11,23],[12,24],[23,24]]){ctx.beginPath();ctx.moveTo(points[a].x*c.width,points[a].y*c.height);ctx.lineTo(points[b].x*c.width,points[b].y*c.height);ctx.stroke();}
 for(const i of[0,11,12,23,24]){ctx.beginPath();ctx.arc(points[i].x*c.width,points[i].y*c.height,4,0,Math.PI*2);ctx.fill();}c.hidden=false;}
export async function analyze({allowed,exercise}){
 cancelAnalysis();const id=run,video=$('video');
 if(!allowed()){say('先完成练前确认。有不舒服时不要开始分析。');return;}
 if(![1,2,3].includes(exercise)){say('这个动作请回放自查。AI只支持低头、转头和侧屈。');return;}
 if(!video.src||!Number.isFinite(video.duration)||video.duration<6||video.duration>45){say('先选6～45秒的视频，开头2秒坐正。不要为拍摄加练。');return;}
 if(!$('ai-consent').checked||!$('ai-baseline').checked){say('请勾选上面的两项确认，再开始。');return;}
 const abort=new AbortController();controller=abort;const started=performance.now();let stage='正在准备分析…';const update=t=>{stage=t;if(id===run)say(stage+' · '+Math.floor((performance.now()-started)/1000)+'秒');};const ticker=setInterval(()=>update(stage),500),timer=setTimeout(()=>abort.abort('超过30秒，已停止，未生成判断。先准备AI，再用6～15秒视频重试。'),LIMIT_MS);controls(true);video.pause();video.controls=false;$('video-status').textContent='视频只在本设备分析，不会上传。';const original=video.currentTime,canvas=document.createElement('canvas');canvas.width=Math.min(480,video.videoWidth);canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);const ctx=canvas.getContext('2d');const frames=[],snapshots=new Map();
 try{const m=await init(update,abort.signal);if(id!==run||!allowed())return;const count=Math.floor(video.duration*3);
  for(let i=0;i<count;i++){
   if(id!==run||!allowed())return;
   check(abort.signal);if(performance.now()-started>=LIMIT_MS)throw new Error('超过30秒，未生成判断。请用6～15秒视频重试。');const time=i/3;await bounded(seek(video,time),abort.signal);if(id!==run||!allowed())return;ctx.drawImage(video,0,0,canvas.width,canvas.height);lastTimestamp=Math.max(performance.now(),lastTimestamp+1);const r=m.detectForVideo(canvas,lastTimestamp);const people=r.landmarks.length;const points=r.landmarks[0];const f=people===1?features(points,canvas.width,canvas.height):null;frames.push({time,people,features:f});
   if(people>1)break;
   // Keep only landmark arrays; video frames stay local and are drawn on demand.
   if(f)snapshots.set(time,points);update(`正在分析 ${Math.round((i+1)/count*100)}%`);await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(id!==run||!allowed())return;check(abort.signal);if(performance.now()-started>=LIMIT_MS)throw new Error('超过30秒，未生成判断。请用短视频重试。');clearInterval(ticker);clearTimeout(timer);const s=summarize(frames);report={...s,exercise,source:'MediaPipe关键点＋探索性工程触发规则',clinicalValidation:false};$('ai-result').replaceChildren();
  if(s.status==='refused'){say('无法分析');block(s.reason);await seek(video,original);return;}
  say(s.events.length?'分析完成，请回看标出的片段。':'分析完成。');
  if(!s.events.length)block('没有找到需要标记的片段。');
  for(const event of s.events){const message=messages[event.kind],item=document.createElement('div');item.className='ai-event';const h=document.createElement('strong');h.textContent=message.title;const p=document.createElement('p');p.textContent=message.text;const b=document.createElement('button');b.textContent=`回看 ${event.time.toFixed(1)} 秒`;b.onclick=async()=>{if(id!==run)return;try{await seek(video,event.time);ctx.drawImage(video,0,0,canvas.width,canvas.height);overlay(canvas,snapshots.get(event.time));}catch(e){say(e.message);}};item.append(h,p,b);$('ai-result').append(item);}
  block('AI不能判断动作是否合格或安全。请让医护复核，不要自行加量。');detail(`看清的画面：${s.validFrames}/${s.totalFrames}帧。仅用于检查画面可分析性，不是动作评分。\n提示采用未经临床验证的工程规则；不能评估吞咽、用药或是否可以加练。`);await seek(video,original);
 }catch(e){if(id===run){report=null;const reason=abort.signal.aborted?abort.signal.reason:(e.message||'模型或视频不可用');say(String(reason).includes('超过30秒')?'分析超过30秒，已停止。先准备AI，再用6～15秒视频重试。':'分析未完成。请重试，或先回放视频自查。');detail(reason,'查看原因');}}
 finally{clearTimeout(timer);clearInterval(ticker);if(id===run){controller=null;video.controls=true;controls(false);}}
}
