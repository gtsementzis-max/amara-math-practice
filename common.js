// Shared scoring helpers for Amara's Math Practice.
// One localStorage key holds every lesson's best score: { "<lessonKey>": {best:int, attempts:int, total:int} }
const MATH_STORE_KEY = 'amaraMath';

function mathLoad(){
  try { return JSON.parse(localStorage.getItem(MATH_STORE_KEY)) || {}; }
  catch(e){ return {}; }
}

function mathSave(lessonKey, score, total){
  const data = mathLoad();
  const prev = data[lessonKey] || { best:0, attempts:0, total };
  data[lessonKey] = {
    best: Math.max(prev.best, score),
    attempts: prev.attempts + 1,
    total
  };
  localStorage.setItem(MATH_STORE_KEY, JSON.stringify(data));
  window.dispatchEvent(new CustomEvent('amara-math-updated'));
  return data[lessonKey];
}

function mathReset(){
  localStorage.removeItem(MATH_STORE_KEY);
  window.dispatchEvent(new CustomEvent('amara-math-updated'));
}
