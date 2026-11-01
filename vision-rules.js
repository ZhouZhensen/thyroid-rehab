// Engineering review triggers, not clinical diagnostic or training thresholds.
export const CONFIG={visibility:.7,minCoverage:.7,minFrames:12,baselineSeconds:2,slopeChange:8,widthChange:.25,centerChange:.18};
const median=a=>{const s=[...a].sort((x,y)=>x-y);return s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2;};
export function features(landmarks,width,height){
 if(!landmarks||landmarks.length<25)return null;
 const ids=[0,11,12,23,24];
 if(ids.some(i=>!Number.isFinite(landmarks[i]?.x)||!Number.isFinite(landmarks[i]?.y)||(landmarks[i].visibility??0)<CONFIG.visibility||landmarks[i].x<.02||landmarks[i].x>.98||landmarks[i].y<.02||landmarks[i].y>.98))return null;
 const p=i=>({x:landmarks[i].x*width,y:landmarks[i].y*height});
 const a=p(11),b=p(12),c=p(23),d=p(24),nose=p(0);
 const sw=Math.abs(a.x-b.x),sx=(a.x+b.x)/2,sy=(a.y+b.y)/2,hx=(c.x+d.x)/2,hy=(c.y+d.y)/2;
 if(sw<width*.12||sw>width*.85||hy-sy<height*.1||nose.y>=sy)return null;
 return{width:sw,slope:Math.atan2(a.y-b.y,Math.abs(a.x-b.x))*180/Math.PI,lean:Math.atan2(sx-hx,hy-sy)*180/Math.PI,center:(sx-hx)/sw,front:Math.abs(nose.x-sx)/sw};
}
export function summarize(frames){
 if(frames.some(f=>f.people>1))return{status:'refused',reason:'画面中检测到多人，无法可靠确定训练对象。请单人入镜后重新拍摄。'};
 const valid=frames.filter(f=>f.features),base=valid.filter(f=>f.time<CONFIG.baselineSeconds),coverage=valid.length/Math.max(frames.length,1);
 if(base.length<4||valid.length<CONFIG.minFrames||coverage<CONFIG.minCoverage)return{status:'refused',reason:'有效关键点或起始参考帧不足。请固定镜头，完整拍入头部、双肩和腰部；前两秒保持正面中立坐位。画面不清不能判断动作。',coverage};
 if(median(base.map(f=>f.features.front))>.2)return{status:'refused',reason:'起始参考画面可能未正对镜头。请前两秒保持正面中立坐位，勿为拍摄增加训练量。'};
 const baseline={};for(const key of ['width','slope','lean','center'])baseline[key]=median(base.map(f=>f.features[key]));
 if(base.some(f=>Math.abs(f.features.slope-baseline.slope)>5||Math.abs(f.features.lean-baseline.lean)>5))return{status:'refused',reason:'前两秒参考姿势变化较大，无法建立稳定比较。请固定镜头并保持舒适中立坐位后再开始动作。'};
 const events=[];
 for(const f of valid.filter(f=>f.time>=CONFIG.baselineSeconds)){
  const x=f.features,flags=[];
  if(Math.abs(x.lean-baseline.lean)>CONFIG.slopeChange||Math.abs(x.center-baseline.center)>CONFIG.centerChange)flags.push('trunk');
  if(Math.abs(x.slope-baseline.slope)>CONFIG.slopeChange)flags.push('shoulder');
  if(Math.abs(x.width/baseline.width-1)>CONFIG.widthChange)flags.push('width');
  for(const kind of flags)events.push({kind,time:f.time});
 }
 // Isolated single-frame excursions are not displayed as sustained movement cues.
 const candidates=[];
 for(const kind of ['trunk','shoulder','width']){
  const e=events.filter(x=>x.kind===kind);let streak=[];
  for(const x of e){if(streak.length&&x.time-streak.at(-1).time>.6)streak=[];streak.push(x);if(streak.length===3){candidates.push({kind,time:streak[0].time});break;}}
 }
 return{status:'review',coverage,validFrames:valid.length,totalFrames:frames.length,events:candidates,baseline};
}
export const messages={
trunk:{title:'躯干投影位置变化',text:'相对起始画面，肩部与腰部的位置关系出现变化。请回放核对是否有躯干侧倾、身体移动或镜头移动。确认存在代偿时，先坐稳、减小动作幅度；不适时停止并联系医护。'},
shoulder:{title:'肩线倾斜发生变化',text:'请核对是否出现单侧抬肩或身体侧倾，也可能是视角或关键点误差。放松双肩，按舒适范围轻柔练习；不要为使肩线水平而用力压肩。'},
width:{title:'双肩投影宽度变化',text:'这可能与躯干转动、身体前后移动、遮挡或镜头变化有关，不能单独确定原因。请回放核对胸口是否保持朝前，并固定机位。'}
};
