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

// Shared visuals: one picture icon per number 1-10, reused everywhere a
// multiplication/division fact needs a concrete picture instead of raw digits.
const TABLE_EMOJI = ['⭐','🍎','🎈','🐸','🌸','🍪','⚽','🐝','🚗','🎁'];

// Draws an n-row by k-column grid of the given emoji (the "array model" of n × k).
function renderArrayGrid(el, rows, cols, emoji){
  el.className = 'array-grid';
  el.style.gridTemplateColumns = `repeat(${cols}, minmax(16px, 30px))`;
  el.innerHTML = '';
  for(let i=0;i<rows*cols;i++){
    const cell = document.createElement('div');
    cell.className = 'array-cell';
    cell.textContent = emoji;
    el.appendChild(cell);
  }
}

// Draws numGroups separate dashed boxes, each holding perGroup of the given emoji
// (the "equal groups" model used for division: numGroups × perGroup items total).
function renderGroupsVisual(el, numGroups, perGroup, emoji){
  el.className = 'groups';
  el.innerHTML = '';
  for(let g=0; g<numGroups; g++){
    const grp = document.createElement('div');
    grp.className = 'group';
    for(let d=0; d<perGroup; d++){
      const item = document.createElement('span');
      item.textContent = emoji;
      grp.appendChild(item);
    }
    el.appendChild(grp);
  }
}
