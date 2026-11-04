import {exercises} from './rules.js?v=20261104-visual';
const $=id=>document.getElementById(id);
const paths={home:'M3 10 12 3l9 7M5 9v12h14V9M9 21v-7h6v7',shield:'M12 3 3 7v6c0 5 9 9 9 9s9-4 9-9V7l-9-4ZM8 12l3 3 5-6',exercise:'M6 21v-5l-3-4 3-4h3M18 21v-5l3-4-3-4h-3M9 6a3 3 0 1 0 6 0 3 3 0 0 0-6 0ZM8 12h8',help:'M9.1 9a3 3 0 0 1 5.8 1c0 2-3 2-3 4M12 18h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',record:'M8 3H5v18h14V3h-3M8 2h8v4H8ZM8 11h8M8 15h5',alert:'M12 3 2 21h20L12 3ZM12 9v5M12 17h.01',heart:'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z',seat:'M8 3a2 2 0 1 0 0 4 2 2 0 0 0 0-4ZM7 9v7h9l2 5M4 10v10M4 17h9M18 10v5',play:'m9 5 11 7-11 7V5Z',video:'M3 5h13v14H3ZM16 9l5-3v12l-5-3',sound:'M3 9h4l5-5v16l-5-5H3V9ZM16 8q4 4 0 8M19 5q7 7 0 14',arrow:'m9 5 7 7-7 7',check:'m5 12 5 5L20 6',scan:'M3 9V3h6M15 3h6v6M21 15v6h-6M9 21H3v-6M7 12h10'};
function icon(name){return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name]||paths.help}"/></svg>`;}
function paintIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));}
paintIcons();
const slugs=['relax','nod','turn','tilt'];
const names=['放松双肩','轻轻低头','左右转头','左右侧屈'];
const captions=['双肩轻提，再放松','慢慢向下看，再回正','胸口朝前，慢慢转头','鼻尖朝前，轻轻侧倾'];
let speaking=false,playing=false,sceneRequest=0;
function say(text){
 const status=$('voice-status');
 if(!('speechSynthesis' in window)) {status.textContent='此浏览器不能朗读，请家属或护士帮您看图讲解。';status.hidden=false;return;}
 speechSynthesis.cancel();const utterance=new SpeechSynthesisUtterance(text);utterance.lang='zh-CN';utterance.rate=.82;
 const voices=speechSynthesis.getVoices();const chinese=voices.find(v=>/^zh[-_]CN/i.test(v.lang))||voices.find(v=>/^zh/i.test(v.lang));if(chinese)utterance.voice=chinese;
 if(voices.length&&!chinese){status.textContent='未找到中文语音，请家属或护士帮您看图讲解。';status.hidden=false;return;}
 utterance.onstart=()=>{speaking=true;status.textContent='正在朗读 · 点此停止';status.hidden=false;};
 utterance.onend=()=>{speaking=false;status.hidden=true;};
 utterance.onerror=()=>{speaking=false;status.textContent='暂时无法朗读，请家属或护士帮忙。';status.hidden=false;};
 speechSynthesis.speak(utterance);
}
$('voice-status').onclick=()=>{if('speechSynthesis'in window)speechSynthesis.cancel();speaking=false;$('voice-status').hidden=true;};
function go(id){document.querySelector(`.nav[data-tab="${id}"]`).click();}
function select(i){$('exercise').value=i;$('exercise').dispatchEvent(new Event('change'));go($('workspace').hidden?'screen':'practice');}
for(const [i,ex] of exercises.entries()){
 const home=document.createElement('button');home.type='button';home.className='movement-card';home.innerHTML=`<div class="movement-thumbnail"><img src="assets/movements/${slugs[i]}.svg" alt="${names[i]}动作示意" width="240" height="210"><span class="mini-play">${icon('play')}</span></div><div class="movement-card-label"><strong>${names[i]}</strong><span>${icon('arrow')}</span></div><small>${captions[i]}</small>`;home.onclick=()=>select(i);$('home-exercises').append(home);
 const chip=document.createElement('button');chip.type='button';chip.className='exercise-chip';chip.innerHTML=`<img src="assets/movements/${slugs[i]}.svg" alt="" width="70" height="62"><span>${names[i]}</span>`;chip.onclick=()=>{$('exercise').value=i;$('exercise').dispatchEvent(new Event('change'));};$('exercise-picker').append(chip);
}
function stopDemo(){playing=false;$('patient-scene').classList.remove('playing');$('demo-toggle').innerHTML=icon('play')+'播放动作示意';$('demo-toggle').setAttribute('aria-pressed','false');}
async function updateExercise(){
 stopDemo();const i=+$('exercise').value,ex=exercises[i],request=++sceneRequest;
 $('stage-name').textContent=names[i];$('stage-caption').textContent=captions[i];$('patient-scene').className='patient-scene motion-'+slugs[i];
 $('exercise-picker').querySelectorAll('button').forEach((b,j)=>{b.classList.toggle('selected',j===i);b.setAttribute('aria-pressed',String(j===i));});
 try{const res=await fetch(`assets/movements/${slugs[i]}.svg`);if(!res.ok)throw Error('图示暂未载入');const svg=await res.text();if(request!==sceneRequest)return;$('patient-scene').innerHTML=svg;}
 catch{if(request===sceneRequest)$('patient-scene').innerHTML=`<img src="assets/movements/${slugs[i]}.svg" alt="${ex.name}动作示意">`;}
 $('ai-entry-state').textContent=i===0?'放松双肩支持视频回看；AI辅助分析用于低头、转头和侧屈。':'选择视频后，可用 AI 辅助找回看片段。';
}
$('demo-toggle').onclick=()=>{
 if(matchMedia('(prefers-reduced-motion: reduce)').matches){say(exercises[+$('exercise').value].how);return;}
 playing=!playing;$('patient-scene').classList.toggle('playing',playing);$('demo-toggle').innerHTML=icon('play')+(playing?'暂停动作示意':'播放动作示意');$('demo-toggle').setAttribute('aria-pressed',String(playing));
};
$('listen-exercise').onclick=()=>say(exercises[+$('exercise').value].how+'。次数和幅度以医护交代的为准，不舒服就停下。');
$('listen-home').onclick=()=>say('这里是颈心康复。先请医护告诉您可以做哪些动作。点开始练习，回答五个问题，再点动作图片。您也可以拍一小段视频，回看自己的动作，请医护帮助指导。轻一点，慢一点，不舒服就停下。');
$('listen-safety').onclick=()=>say('只做医护允许的动作和次数。轻柔，缓慢，不用手扳头。出现新的不舒服或不舒服加重，先停练并联系医护。喘不过气、脖子突然肿起或者明显出血，马上求助，不等网页回复。');
$('listen-question').onclick=()=>{const f=[...document.querySelectorAll('.screen-step')].find(f=>!f.hidden);if(f)say(f.innerText);};
$('listen-guide').onclick=()=>say('训练次数以医护交代的为准。身体坐稳，双肩放松。动作轻一点，慢一点。不舒服先停练，再联系医护。');
$('home-review').onclick=()=>{go($('workspace').hidden?'screen':'practice');if(!$('workspace').hidden)$('video-title').scrollIntoView({behavior:'smooth',block:'start'});};
window.addEventListener('rehab-exercise',updateExercise);
window.addEventListener('rehab-tab',()=>{stopDemo();if('speechSynthesis'in window)speechSynthesis.cancel();$('voice-status').hidden=true;});
// A changed video immediately updates the visible AI entry; it never bypasses screening.
$('video-file').addEventListener('change',()=>{if($('video-file').files.length&&+$('exercise').value>0)$('ai-entry-state').textContent='视频已选好，往下准备 AI 并分析。';});
const topicObserver=new MutationObserver(()=>{document.querySelectorAll('.topic-answer').forEach(body=>{if(body.querySelector('p')&&!body.querySelector('.read-answer')){const b=document.createElement('button');b.type='button';b.className='voice-button read-answer';b.innerHTML=icon('sound')+'听这条建议';b.onclick=()=>say(body.querySelector('p').textContent);body.append(b);}});});topicObserver.observe($('topics'),{childList:true,subtree:true});
// Important outcome messages remain available as speech, not only as text.
for(const id of ['screen-result','feedback-result','answer']){
 const target=$(id),observer=new MutationObserver(()=>{
  if(!target.querySelector('p')||target.querySelector('.read-result'))return;
  const b=document.createElement('button');b.type='button';b.className='voice-button read-result';b.innerHTML=icon('sound')+'听这条提醒';b.onclick=()=>say([...target.querySelectorAll('h3,p')].map(e=>e.textContent).join('。'));target.append(b);
 });observer.observe(target,{childList:true,subtree:true});
}
const urgentAudio=document.createElement('button');urgentAudio.type='button';urgentAudio.className='voice-button';urgentAudio.innerHTML=icon('sound')+'听求助提醒';urgentAudio.onclick=()=>say('先停止训练。喘不过气、脖子突然肿起、越来越紧或明显出血，马上叫身边医护，院外立即拨打一二零。不要等网页回复。新发或加重的疼痛、头晕、发麻、抽筋，也要停练并联系医护。');$('urgent-dialog').querySelector('h2').after(urgentAudio);
updateExercise();
