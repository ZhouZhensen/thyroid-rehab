import{features,summarize,messages}from'./vision-rules.js';
const $=id=>document.getElementById(id);let model=null,run=0,report=null,controller=null,lastTimestamp=0;
const LIMIT_MS=30000;
function say(t){$('ai-status').textContent=t;}
function controls(busy){$('ai-start').disabled=busy;$('ai-cancel').disabled=!busy;if($('ai-prepare'))$('ai-prepare').disabled=busy;}
function check(signal){if(signal.aborted)throw new Error(signal.reason||'操作已取消');}
function bounded(promise,signal){return new Promise((resolve,reject)=>{const fail=()=>reject(new Error(signal.reason||'操作已取消'));if(signal.aborted)return fail();signal.addEventListener('abort',fail,{once:true});promise.then(v=>{signal.removeEventListener('abort',fail);resolve(v);},e=>{signal.removeEventListener('abort',fail);reject(e);});});}
async function init(update,signal){
 if(model)return model;
 update('正在加载识别组件…');
 const{FilesetResolver,PoseLandmarker}=await bounded(import('./vision_bundle.mjs'),signal);check(signal);
 const vision=await bounded(FilesetResolver.forVisionTasks(new URL('./',import.meta.url).href.replace(/\/$/,'')),signal);check(signal);
 update('正在下载姿态模型…');
 const response=await fetch(new URL('./pose_landmarker_lite.task',import.meta.url),{signal});if(!response.ok)throw new Error('模型下载失败（'+response.status+'）');
 const total=Number(response.headers.get('Content-Length')),reader=response.body?.getReader();let bytes;
 if(reader){const chunks=[];let received=0;while(true){check(signal);const{value,done}=await reader.read();if(done)break;chunks.push(value);received+=value.byteLength;update('下载姿态模型 '+(total?Math.min(100,Math.round(received/total*100))+'%':(received/1048576).toFixed(1)+' MB'));}bytes=new Uint8Array(received);let offset=0;for(const part of chunks){bytes.set(part,offset);offset+=part.length;}}
 else bytes=new Uint8Array(await response.arrayBuffer());
 check(signal);update('正在启动本地计算组件，首次约需下载14 MB…');
 const creating=PoseLandmarker.createFromOptions(vision,{baseOptions:{modelAssetBuffer:bytes,delegate:'CPU'},runningMode:'VIDEO',numPoses:2,minPoseDetectionConfidence:.5,minPosePresenceConfidence:.5});
 creating.then(m=>{if(signal.aborted)m.close();},()=>{});
 const m=await bounded(creating,signal);check(signal);model=m;lastTimestamp=0;return model;
}
export async function prepareModel(){
 cancelAnalysis();const id=run,abort=new AbortController();controller=abort;controls(true);const start=performance.now();let stage='正在准备模型…';
 const update=t=>{stage=t;if(id===run)say(stage+' · '+Math.floor((performance.now()-start)/1000)+'秒');};
 const ticker=setInterval(()=>update(stage),500),timer=setTimeout(()=>abort.abort('模型准备超过30秒。请检查网络后重试；也可继续视频回放。'),LIMIT_MS);
 try{await init(update,abort.signal);if(id===run)say('模型已就绪，可开始分析。视频只在本设备处理。');}
 catch(e){if(id===run)say('模型未准备好：'+(abort.signal.aborted?abort.signal.reason:e.message));}
 finally{clearInterval(ticker);clearTimeout(timer);if(id===run){controller=null;controls(false);}}
}
function seek(video,time){return new Promise((resolve,reject)=>{if(Math.abs(video.currentTime-time)<.01&&video.readyState>=2)return resolve();const timer=setTimeout(()=>{video.removeEventListener('seeked',done);reject(new Error('视频解码超时，请改用兼容的 MP4 视频。'));},7000);function done(){clearTimeout(timer);resolve();}video.addEventListener('seeked',done,{once:true});video.currentTime=time;});}
export function cancelAnalysis(){run++;controller?.abort('操作已取消');controller=null;report=null;$('ai-result').replaceChildren();$('ai-canvas').hidden=true;controls(false);$('video').controls=true;say('尚未分析。');}
export function aiSummary(){return report?JSON.stringify(report):'';}
function block(text){const p=document.createElement('p');p.textContent=text;$('ai-result').append(p);}
function overlay(canvas,points){const c=$('ai-canvas');c.width=canvas.width;c.height=canvas.height;const ctx=c.getContext('2d');ctx.drawImage(canvas,0,0);ctx.strokeStyle='#00ffe3';ctx.fillStyle='#00ffe3';ctx.lineWidth=3;
 for(const[a,b]of[[11,12],[11,23],[12,24],[23,24]]){ctx.beginPath();ctx.moveTo(points[a].x*c.width,points[a].y*c.height);ctx.lineTo(points[b].x*c.width,points[b].y*c.height);ctx.stroke();}
 for(const i of[0,11,12,23,24]){ctx.beginPath();ctx.arc(points[i].x*c.width,points[i].y*c.height,4,0,Math.PI*2);ctx.fill();}c.hidden=false;}
export async function analyze({allowed,exercise}){
 cancelAnalysis();const id=run,video=$('video');
 if(!allowed()){say('请先完成训练前确认，出现异常时不能开始分析。');return;}
 if(![4,5,6].includes(exercise)){say('本版本仅支持轻柔低头、左右转头、左右侧屈的可见躯干与肩线变化筛查，其他动作仍采用人工自查。');return;}
 if(!video.src||!Number.isFinite(video.duration)||video.duration<6||video.duration>45){say('请载入 6～45 秒的视频，前两秒为正面中立坐位。仅分析已获准的动作，不为分析额外加练。');return;}
 if(!$('ai-consent').checked||!$('ai-baseline').checked){say('请确认理解功能边界，以及视频前两秒符合参考姿势要求。');return;}
 const abort=new AbortController();controller=abort;const started=performance.now();let stage='正在准备分析…';const update=t=>{stage=t;if(id===run)say(stage+' · '+Math.floor((performance.now()-started)/1000)+'秒');};const ticker=setInterval(()=>update(stage),500),timer=setTimeout(()=>abort.abort('本次超过30秒，已停止且不生成判断。请先准备模型，再用6～15秒短视频重试。'),LIMIT_MS);controls(true);video.pause();video.controls=false;$('video-status').textContent='已载入本地视频 · AI处理仅在本浏览器内进行';const original=video.currentTime,canvas=document.createElement('canvas');canvas.width=Math.min(480,video.videoWidth);canvas.height=Math.round(canvas.width*video.videoHeight/video.videoWidth);const ctx=canvas.getContext('2d');const frames=[],snapshots=new Map();
 try{const m=await init(update,abort.signal);if(id!==run||!allowed())return;const count=Math.floor(video.duration*3);
  for(let i=0;i<count;i++){
   if(id!==run||!allowed())return;
   check(abort.signal);if(performance.now()-started>=LIMIT_MS)throw new Error('本次超过30秒，未生成判断。请改用6～15秒短视频重试。');const time=i/3;await bounded(seek(video,time),abort.signal);if(id!==run||!allowed())return;ctx.drawImage(video,0,0,canvas.width,canvas.height);lastTimestamp=Math.max(performance.now(),lastTimestamp+1);const r=m.detectForVideo(canvas,lastTimestamp);const people=r.landmarks.length;const points=r.landmarks[0];const f=people===1?features(points,canvas.width,canvas.height):null;frames.push({time,people,features:f});
   if(people>1)break;
   // Keep only landmark arrays; video frames stay local and are drawn on demand.
   if(f)snapshots.set(time,points);update(`正在分析 ${Math.round((i+1)/count*100)}%`);await new Promise(resolve=>setTimeout(resolve,0));
  }
  if(id!==run||!allowed())return;check(abort.signal);if(performance.now()-started>=LIMIT_MS)throw new Error('本次超过30秒，未生成判断。请用短视频重试。');clearInterval(ticker);clearTimeout(timer);const s=summarize(frames);report={...s,exercise,source:'MediaPipe关键点＋探索性工程触发规则',clinicalValidation:false};$('ai-result').replaceChildren();
  if(s.status==='refused'){say('无法判断');block(s.reason);await seek(video,original);return;}
  say('本地分析完成 · 仅供回放核对，不是动作合格判定');block(`有效帧：${s.validFrames}/${s.totalFrames}。覆盖率只反映画面可分析性，不是动作得分或安全概率。`);
  if(!s.events.length)block('本次未触发所设的躯干/肩线变化规则。不能据此认定动作规范、安全或可以增加训练量；头颈目标动作、呼吸及切口状态仍需人工核对。');
  for(const event of s.events){const message=messages[event.kind],item=document.createElement('div');item.className='ai-event';const h=document.createElement('strong');h.textContent=message.title;const p=document.createElement('p');p.textContent=message.text;const b=document.createElement('button');b.textContent=`回看 ${event.time.toFixed(1)} 秒`;b.onclick=async()=>{if(id!==run)return;try{await seek(video,event.time);ctx.drawImage(video,0,0,canvas.width,canvas.height);overlay(canvas,snapshots.get(event.time));}catch(e){say(e.message);}};item.append(h,p,b);$('ai-result').append(item);}
  block('临床原则见下方证据说明；数值触发阈值为未验证的工程设置，并非指南推荐角度。结果需要医护复核，不能用于吞咽安全、用药或训练进阶。');await seek(video,original);
 }catch(e){if(id===run){report=null;say('分析未完成：'+(abort.signal.aborted?abort.signal.reason:(e.message||'模型或视频不可用'))+'。请继续本地回放或联系医护，不会生成替代评分。');}}
 finally{clearTimeout(timer);clearInterval(ticker);if(id===run){controller=null;video.controls=true;controls(false);}}
}
