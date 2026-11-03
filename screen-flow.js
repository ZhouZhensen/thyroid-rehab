// Order of self-report questions. Keep urgent symptoms first.
export const screenSteps=['emergency','review','clearance','special','stable'];
export function blockedAnswer(v){
 if(v.emergency==='yes')return 'emergency';
 if(v.review==='yes')return 'review';
 if(v.clearance==='no'||v.special==='yes'||v.stable==='no')return 'hold';
 return null;
}
export function canAdvance(v,index){
 const key=screenSteps[index];
 const options={emergency:['no','yes'],review:['no','yes'],clearance:['yes','no'],special:['no','reviewed','yes'],stable:['yes','no']};
 const answered=Object.fromEntries(screenSteps.slice(0,index+1).map(k=>[k,v[k]]));
 return Boolean(key)&&!blockedAnswer(answered)&&screenSteps.slice(0,index+1).every(k=>options[k].includes(v[k]));
}
