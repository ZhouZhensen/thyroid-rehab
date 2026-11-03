import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const root=new URL('../',import.meta.url);
const code=await readFile(new URL('screen-flow.js',root),'utf8');
const {screenSteps,blockedAnswer,canAdvance}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const safe={emergency:'no',review:'no',clearance:'yes',special:'no',stable:'yes'};
assert.deepEqual(screenSteps,['emergency','review','clearance','special','stable']);
screenSteps.forEach((key,i)=>{
 const partial=Object.fromEntries(screenSteps.slice(0,i+1).map(k=>[k,safe[k]]));
 assert.equal(canAdvance(partial,i),true,key+' can continue only after completed answers');
 assert.equal(canAdvance({...partial,[key]:undefined},i),false,key+' missing answer');
 assert.equal(canAdvance({...partial,[key]:'unknown'},i),false,key+' unknown answer');
});
assert.equal(canAdvance({},0),false);
for(const [key,value,level] of [['emergency','yes','emergency'],['review','yes','review'],['clearance','no','hold'],['special','yes','hold'],['stable','no','hold']]){
 const v={...safe,[key]:value},i=screenSteps.indexOf(key);
 assert.equal(blockedAnswer(v),level);
 assert.equal(canAdvance(v,i),false);
}
assert.equal(blockedAnswer({...safe,emergency:'yes',review:'yes'}),'emergency');
assert.equal(canAdvance({...safe,special:'yes'},1),true,'Back can reach and correct a later blocked answer');
assert.equal(canAdvance({...safe,special:'reviewed'},4),true);
assert.equal(canAdvance({...safe,emergency:undefined},4),false,'Cannot skip urgent question');
const html=await readFile(new URL('index.html',root),'utf8');
assert.match(html,/data-question="emergency"/);
assert.equal((html.match(/class="screen-step"/g)||[]).length,5);
const js=await readFile(new URL('app.js',root),'utf8');
assert.match(js,/ready=a.level==='ready'/);
assert.match(js,/screenSteps.slice\(screenIndex\+1\)/);
console.log(JSON.stringify({pass:true,questions:5,checked:'missing answers, all stop branches, backward correction, prior answer requirements'}));
