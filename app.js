import{analyze,cancelAnalysis,aiSummary,prepareModel}from'./vision.js?v=20261103-easy';
import{assess,exercises,answerQuestion}from'./rules.js?v=20261103-easy';
import{screenSteps,blockedAnswer,canAdvance}from'./screen-flow.js?v=20261103-easy';
const $=id=>document.getElementById(id);
let ready=false,url=null,feedback=null,records=[],screenState='未完成',screenIndex=0;
const screeningForm=$('screen-form'),screenFields=[...screeningForm.querySelectorAll('.screen-step')];
const values=()=>Object.fromEntries(new FormData(screeningForm));
const currentValues=()=>Object.fromEntries(screenSteps.slice(0,screenIndex+1).map(k=>[k,values()[k]]));

function tab(id){
 document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!==id);
 document.querySelectorAll('.nav').forEach(n=>{n.classList.toggle('active',n.dataset.tab===id);if(n.dataset.tab===id)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current');});
 if(id==='record')renderRecords();
 window.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
}
document.querySelectorAll('.nav').forEach(b=>b.onclick=()=>tab(b.dataset.tab));
document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>tab(b.dataset.go));
function result(id,title,text,error=false){
 const el=$(id),h=document.createElement('h3'),p=document.createElement('p');
 h.textContent=title;p.textContent=text;el.replaceChildren(h,p);el.hidden=false;el.classList.toggle('error',error);
}
function refreshPractice(){
 const supported=[4,5,6].includes(+$('exercise').value);
 $('workspace').hidden=!ready;$('locked').hidden=ready;
 $('ai-capture').hidden=!ready||!supported;
 $('ai-panel').hidden=!ready||!supported||!url;
 $('video-tools').hidden=!url;
}
function refreshLock(){if(!ready)cancelAnalysis();refreshPractice();}
function renderStep(focus=false){
 $('screen-questions').hidden=false;
 screenFields.forEach(f=>f.hidden=f.dataset.question!==screenSteps[screenIndex]);
 $('screen-count').textContent='第'+(screenIndex+1)+'题，共5题';
 $('screen-progress').value=screenIndex+1;
 $('screen-hint').hidden=true;
 const blocked=blockedAnswer(currentValues());
 $('screen-back').hidden=screenIndex===0;
 $('screen-next').hidden=screenIndex===screenSteps.length-1||Boolean(blocked);
 $('screen-submit').hidden=screenIndex!==screenSteps.length-1||Boolean(blocked);
 if(blocked){
  const a=assess(currentValues()),key=screenSteps[screenIndex];
  const shortAdvice={
   emergency:'先停止训练。\n马上叫身边医护；院外立即拨打当地急救电话（中国大陆120）。\n不要等网页回复。',
   clearance:'先问医护：能做哪些动作、每次做多少。\n医护确认后再开始。',
   special:'先请医护单独确认这些动作是否适合您。\n不要直接套用常规训练。',
   stable:'先按医护要求坐稳，保护好伤口和管子。\n准备好前不要练习。'
  };
  screenState=a.title;result('screen-result',a.title,shortAdvice[key]||a.text,true);
 }
 else $('screen-result').hidden=true;
 if(focus)screenFields[screenIndex].querySelector('legend').focus({preventScroll:true});
}
function resetScreening(){
 ready=false;feedback=null;screenState='未完成';screeningForm.reset();screenIndex=0;
 refreshLock();renderStep();
}
function validStep(){
 if(!canAdvance(values(),screenIndex)){
  if(!blockedAnswer(currentValues())){$('screen-hint').hidden=false;screenFields[screenIndex].querySelector('input').focus();}
  return false;
 }
 return true;
}
screeningForm.addEventListener('change',e=>{
 ready=false;feedback=null;refreshLock();
 // A changed answer invalidates later confirmations; past answers stay visible on Back.
 for(const key of screenSteps.slice(screenIndex+1))screeningForm.querySelectorAll('[name="'+key+'"]').forEach(input=>input.checked=false);
 renderStep();
 if(blockedAnswer(currentValues()))$('screen-result').scrollIntoView({block:'nearest',behavior:'smooth'});
});
$('screen-next').onclick=()=>{if(validStep()){screenIndex++;renderStep(true);}};
$('screen-back').onclick=()=>{if(screenIndex>0){screenIndex--;renderStep(true);}};
screeningForm.onsubmit=e=>{
 e.preventDefault();if(screenIndex!==screenSteps.length-1||!validStep())return;
 const a=assess(values());ready=a.level==='ready';screenState=a.title;refreshLock();
 result('screen-result',a.title,a.text,!ready);
 if(ready){
  $('screen-questions').hidden=true;$('discomfort').checked=false;
  const tools=document.createElement('div');tools.className='tools';
  const go=document.createElement('button');go.className='primary';go.type='button';go.textContent='开始练习';go.onclick=()=>tab('practice');
  const restart=document.createElement('button');restart.type='button';restart.textContent='重新确认';restart.onclick=resetScreening;
  tools.append(go,restart);$('screen-result').append(tools);
 }
};
$('urgent').onclick=()=>{resetScreening();screenState='已打开不适提醒';$('urgent-dialog').showModal();};
$('close-urgent').onclick=()=>$('urgent-dialog').close();
renderStep();

exercises.forEach((ex,i)=>{const o=document.createElement('option');o.value=i;o.textContent=ex.name;$('exercise').append(o);});
function loadExercise(){
 cancelAnalysis();const ex=exercises[+$('exercise').value];feedback=null;
 $('exercise-title').textContent=ex.name;$('exercise-how').replaceChildren();
 ex.steps.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('exercise-how').append(li);});
 $('exercise-dose').textContent=ex.dose;$('exercise-source').textContent=ex.source;
 $('checkpoints').replaceChildren();ex.checks.forEach(t=>{const li=document.createElement('li');li.textContent=t;$('checkpoints').append(li);});
 $('issues').replaceChildren();
 [...ex.issues.map(x=>x[0]),'视频看不清','没发现这些问题'].forEach((t,j)=>{
  const label=document.createElement('label');label.className='check';
  const inp=document.createElement('input');inp.type='checkbox';inp.name='issue';inp.value=j;
  inp.addEventListener('change',()=>{
   feedback=null;$('feedback-result').hidden=true;$('record-session').disabled=true;
   if(inp.checked)document.querySelectorAll('input[name=issue]').forEach(other=>{if(other!==inp&&(j===3||other.value==='3'))other.checked=false;});
  });
  label.append(inp,document.createTextNode(t));$('issues').append(label);
 });
 $('discomfort').checked=false;$('ai-baseline').checked=false;$('ai-consent').checked=false;
 $('selfcheck-details').open=false;$('feedback-result').hidden=true;$('record-session').disabled=true;
 $('ai-status').textContent='首次先点“准备AI”，再开始分析。';refreshPractice();
}
$('exercise').onchange=loadExercise;loadExercise();
function clearVideo(){
 cancelAnalysis();if(url)URL.revokeObjectURL(url);url=null;
 $('video').pause();$('video').removeAttribute('src');$('video').load();$('video').hidden=true;
 $('video-file').value='';$('video-status').textContent='还没有选择视频';$('ai-baseline').checked=false;refreshPractice();
}
$('video-file').onchange=()=>{
 cancelAnalysis();$('ai-baseline').checked=false;const f=$('video-file').files[0];if(!f)return;
 if(!f.type.startsWith('video/')||f.size>200*1024*1024){clearVideo();$('video-status').textContent='请选择不超过200 MB的视频。';return;}
 if(url)URL.revokeObjectURL(url);url=URL.createObjectURL(f);$('video').src=url;$('video').hidden=false;
 $('video-status').textContent='视频已选好。可先播放、慢放，再自查或分析。';refreshPractice();
};
$('video').onerror=()=>$('video-status').textContent='这个视频无法播放，请换成MP4格式。';
$('remove-video').onclick=clearVideo;$('slow').onclick=()=>$('video').playbackRate=.5;$('normal').onclick=()=>$('video').playbackRate=1;
$('feedback').onclick=()=>{
 if(!ready)return;const ex=exercises[+$('exercise').value];
 if($('discomfort').checked){
  resetScreening();screenState='练习中出现不适';tab('screen');
  result('screen-result','先停下，联系医护','新出现或加重的不舒服，先停止训练，联系医护。\n喘不过气、吸气有尖锐声、脖子突然肿起或明显出血：马上求助，不等网页回复。',true);return;
 }
 const selected=[...document.querySelectorAll('input[name=issue]:checked')].map(x=>+x.value),unclear=selected.includes(2),none=selected.includes(3);
 if(!selected.length||none&&selected.length>1){feedback=null;result('feedback-result','先选一项','选出看到的问题，或选择“没发现这些问题”。');return;}
 const messages=selected.filter(i=>i<2).slice(0,2).map(i=>ex.issues[i][1]);
 if(unclear)messages.push('先调整手机位置。看不清就不判断，可请护士帮忙看。');
 if(none)messages.push('没发现问题，不等于动作合格。仍按医护交代的次数和幅度练习，不自行加量。');
 feedback={exercise:ex.name,observed:selected.map(i=>i<2?ex.issues[i][0]:i===2?'视频不清':'自报未发现所列问题'),guidance:messages.join('\n'),time:new Date().toLocaleString('zh-CN')};
 result('feedback-result','自查建议',feedback.guidance+'\n这些建议来自您的勾选，不是AI判定。');$('record-session').disabled=false;
};
$('discomfort').onchange=()=>{feedback=null;$('feedback-result').hidden=true;$('record-session').disabled=true;if($('discomfort').checked)$('feedback').click();};
$('record-session').onclick=()=>{
 if(!ready||!feedback)return;records.push({...feedback});feedback=null;renderRecords();$('record-session').disabled=true;$('record-session').textContent='已记下';
 setTimeout(()=>$('record-session').textContent='记到我的记录',2000);
};
function recordControls(){
 const hasAI=Boolean(aiSummary());$('ai-record-note').hidden=!hasAI;
 $('record-tools').hidden=!records.length&&!hasAI&&!$('note').value.trim();
}
function renderRecords(){
 $('records').replaceChildren();
 if(!records.length){
  const box=document.createElement('div');box.className='empty-record';const p=document.createElement('p');p.textContent='还没有练习记录。';
  const b=document.createElement('button');b.type='button';b.textContent='去练习';b.onclick=()=>tab('practice');box.append(p,b);$('records').append(box);
 }
 records.forEach(r=>{
  const div=document.createElement('div');div.className='record-row';
  const h=document.createElement('strong');h.textContent=r.exercise;
  const time=document.createElement('p');time.className='muted';time.textContent=r.time;
  const observed=document.createElement('p');observed.textContent='自查：'+r.observed.map(t=>t==='自报未发现所列问题'?'没发现这些问题':t).join('；');
  const details=document.createElement('details'),summary=document.createElement('summary'),g=document.createElement('p');summary.textContent='查看当次建议';g.textContent=r.guidance;details.append(summary,g);
  div.append(h,time,observed,details);$('records').append(div);
 });
 recordControls();
}
$('note').addEventListener('input',recordControls);renderRecords();
const topics=['一天练几次？','转头带着肩膀动？','视频怎么拍？','能自己练吞咽吗？'];
function referenceDetail(container,a){
 if(a.detail){const d=document.createElement('details'),s=document.createElement('summary'),p=document.createElement('p');s.textContent='查看参考说明';p.textContent=a.detail;d.append(s,p);container.append(d);}
}
topics.forEach(q=>{
 const row=document.createElement('details');row.className='topic';
 const title=document.createElement('summary'),body=document.createElement('div');title.textContent=q;body.className='topic-answer';row.append(title,body);
 row.addEventListener('toggle',()=>{
  if(!row.open)return;
  document.querySelectorAll('#topics > details').forEach(other=>{if(other!==row)other.open=false;});
  $('answer').hidden=true;const a=answerQuestion(q),p=document.createElement('p');p.textContent=a.text;body.replaceChildren(p);referenceDetail(body,a);
  if(a.level!=='info'){resetScreening();screenState='咨询中提示需评估';}
 });
 $('topics').append(row);
});
function ask(q){
 const a=answerQuestion(q);result('answer',q,a.text,a.level!=='info');
 referenceDetail($('answer'),a);
 if(a.level!=='info'){resetScreening();screenState='咨询中提示需评估';}
 $('answer').scrollIntoView({block:'nearest',behavior:'smooth'});
}
$('ask-form').onsubmit=e=>{e.preventDefault();const q=$('question').value.trim();if(q)ask(q);};
$('export').onclick=()=>{
 const text=['甲状腺术后康复自查反馈单','训练自查来自患者自报；AI辅助筛查另列，未临床验证且未经医护复核。','练前核对状态：'+screenState,'生成时间：'+new Date().toLocaleString('zh-CN'),...records.map((r,i)=>(i+1)+'. '+r.exercise+'\n'+r.time+'\n自查：'+r.observed.join('；')+'\n建议：'+r.guidance),'AI辅助筛查（未临床验证）：'+(aiSummary()||'未进行/结果已清除'),'补充情况：'+($('note').value.trim()||'未填写'),'此文件尚未发送，请通过医院认可渠道联系医护。'].join('\n\n');
 const u=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=u;a.download='康复自查反馈单.txt';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);
};
$('clear-record').onclick=()=>{
 if(confirm('清空本次记录、备注、视频和练前确认？')){
  records=[];$('note').value='';$('question').value='';$('answer').hidden=true;
  resetScreening();clearVideo();loadExercise();renderRecords();
 }
};
window.addEventListener('beforeunload',()=>{if(url)URL.revokeObjectURL(url);});
$('ai-start').onclick=()=>analyze({allowed:()=>ready&&!$('discomfort').checked,exercise:+$('exercise').value});
$('ai-cancel').onclick=cancelAnalysis;$('ai-consent').onchange=cancelAnalysis;$('ai-baseline').onchange=cancelAnalysis;
$('ai-prepare').onclick=prepareModel;
