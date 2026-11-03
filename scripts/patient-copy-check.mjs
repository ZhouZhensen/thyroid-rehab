// Run from any directory: node /path/to/scripts/patient-copy-check.mjs
// No packages, model downloads, patient data or browser required.
import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../rules.js', import.meta.url), 'utf8');
const { assess, exercises, answerQuestion } = await import(
  'data:text/javascript;base64,' + Buffer.from(source).toString('base64')
);

// Frozen pre-copy-edit decision oracle: only the return level is compared.
function legacyLevel(v) {
  if (v.emergency === 'yes') return 'emergency';
  if (v.review === 'yes') return 'review';
  if (v.clearance !== 'yes' || !['no', 'reviewed'].includes(v.special) || v.stable !== 'yes') return 'hold';
  if (v.emergency !== 'no' || v.review !== 'no') return 'hold';
  return 'ready';
}
const values = [undefined, 'yes', 'no', 'reviewed', 'other'];
let combinations = 0;
for (const emergency of values)
for (const review of values)
for (const clearance of values)
for (const special of values)
for (const stable of values) {
  const v = { emergency, review, clearance, special, stable };
  assert.equal(assess(v).level, legacyLevel(v), JSON.stringify(v));
  combinations++;
}
assert.equal(combinations, 3125);

const urgent = ['呼吸困难', '喉鸣', '明显出血', '喘不过气', '喘不上气', '吸气有尖锐响声', '脖子越来越紧', '脖子突然肿起来'];
const review = ['声哑', '手指麻木', '手指发麻', '嘴周发麻', '声音哑', '声音变哑', '声音带水声', '心慌', '口水不好咽', '口水难咽', '明显疲劳', '显著疲劳', '明显累', '很累'];
for (const q of urgent) {
  assert.equal(answerQuestion(q).level, 'emergency', q);
  assert.equal(answerQuestion(q + '，训练几次，怎么拍视频？').level, 'emergency', q + ' priority');
}
for (const q of review) {
  assert.equal(answerQuestion(q).level, 'review', q);
  assert.equal(answerQuestion(q + '，训练几次，怎么拍视频？').level, 'review', q + ' priority');
  assert.equal(answerQuestion(q + '，而且喘不上气').level, 'emergency', q + ' urgent priority');
  assert.match(answerQuestion(q).text, /如果是您现在新出现或加重/, q + ' conditional advice');
}
for (const q of ['训练几次', '转头肩膀跟着动', '怎样拍摄视频', '可以自己做吞咽训练吗', '未知问题', '明显做得好']) {
  assert.equal(answerQuestion(q).level, 'info', q);
}

const original = [
  ['颈肩放松', '颈部训练参考：每动作 5～10 次，每日 3 次；首次从可耐受的少量开始。', '原护理方案 [2,4]。当前训练量以医护确认为准。'],
  ['口唇活动', '口面部训练参考：每动作 10 次，每日 2 次；按耐受减量。', '原护理方案 [1] 的基础动作；不是完整研究方案。'],
  ['面颊活动', '口面部训练参考：每动作 10 次，每日 2 次；按耐受减量。', '原护理方案 [1]；联合方案的基础动作。'],
  ['舌部活动', '口面部训练参考：每动作 10 次，每日 2 次；分方向示教、按耐受减量。', '原护理方案 [1]；不要求用力伸舌。'],
  ['轻柔低头', '颈部训练参考：每动作 5～10 次，每日 3 次；循序渐进。', '原护理方案 [2,4]；不要求达到示范幅度。'],
  ['左右转头', '颈部训练参考：每侧 5～10 次，每日 3 次；按许可与耐受执行。', '原护理方案 [2,4]；左右按患者自身方向。'],
  ['左右侧屈', '颈部训练参考：每侧 5～10 次，每日 3 次；按许可与耐受执行。', '原护理方案 [2,4]；侧屈与转头分别练习。']
];
assert.equal(exercises.length, 7);
exercises.forEach((ex, i) => {
  assert.deepEqual([ex.name, ex.dose, ex.source], original[i], 'exercise ' + i);
  assert.equal(ex.steps.length, 3, ex.name + ' steps');
  assert.equal(ex.checks.length, 3, ex.name + ' checks');
  assert.equal(ex.issues.length, 2, ex.name + ' issues');
  assert.ok(ex.how.length && ex.steps.every(s => typeof s === 'string' && s.length), ex.name + ' copy');
});

console.log(JSON.stringify({ pass: true, assessCombinations: combinations, emergencyPhrases: urgent.length, reviewPhrases: review.length, exercises: exercises.length }));
