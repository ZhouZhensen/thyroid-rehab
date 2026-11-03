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
 if(frames.some(f=>f.people>1))return{status:'refused',reason:'画面里有不止1个人。请只拍练习者，再试一次。'};
 const valid=frames.filter(f=>f.features),base=valid.filter(f=>f.time<CONFIG.baselineSeconds),coverage=valid.length/Math.max(frames.length,1);
 if(base.length<4||valid.length<CONFIG.minFrames||coverage<CONFIG.minCoverage)return{status:'refused',reason:'画面没拍清，无法分析。固定手机，拍全头、双肩和腰部；开头2秒正面坐稳。',coverage};
 if(median(base.map(f=>f.features.front))>.2)return{status:'refused',reason:'开头可能没正对镜头。请先正面坐稳2秒，再做动作；不要加练。'};
 const baseline={};for(const key of ['width','slope','lean','center'])baseline[key]=median(base.map(f=>f.features[key]));
 if(base.some(f=>Math.abs(f.features.slope-baseline.slope)>5||Math.abs(f.features.lean-baseline.lean)>5))return{status:'refused',reason:'开头2秒晃动较多。请固定手机，正面坐稳后再开始动作。'};
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
trunk:{title:'回看：身体位置变了？',text:'看看身体有没有歪斜或移动，也可能是镜头动了。若确实有，先坐稳、动作小一点；不舒服就停下联系医护。'},
shoulder:{title:'回看：一侧肩膀抬高了？',text:'也可能是身体歪了或画面误差。先看视频，别用力压肩；双肩自然放松。'},
width:{title:'回看：身体跟着转了？',text:'也可能是前后移动、遮挡或镜头变化。请核对胸口是否朝前，手机是否固定。'}
};
