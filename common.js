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

// Hands-on "build it" manipulative: a pool of `total` emoji the learner taps into
// `numBoxes` boxes, each holding up to `perBox` (so numBoxes × perBox = total).
// Tapping a full box gives gentle feedback instead of overflowing it. When every
// item is placed, opts.onComplete() fires and a success message is shown (customize
// the wording with opts.successText(total, numBoxes, perBox) — default reads as
// multiplication; pass one that reads as division for a sharing-themed round).
function initBuildActivity(container, opts){
  const { total, numBoxes, perBox, emoji, onComplete } = opts;
  const successText = opts.successText || ((t, n, p) => `You made ${n} groups of ${p} = ${t}! That's ${n} × ${p} = ${t}.`);
  let poolRemaining = total;
  const boxCounts = new Array(numBoxes).fill(0);

  container.innerHTML = `
    <div class="build-wrap">
      <div class="build-status" data-role="pool-label"></div>
      <div class="build-pool" data-role="pool"></div>
      <div class="build-boxes" data-role="boxes"></div>
      <div class="build-status" data-role="status"></div>
      <div class="build-success" data-role="success"></div>
    </div>
  `;
  const poolLabel = container.querySelector('[data-role="pool-label"]');
  const poolEl = container.querySelector('[data-role="pool"]');
  const boxesEl = container.querySelector('[data-role="boxes"]');
  const statusEl = container.querySelector('[data-role="status"]');
  const successEl = container.querySelector('[data-role="success"]');

  function renderPool(){
    poolLabel.textContent = poolRemaining > 0 ? `Tap a box to place a ${emoji}:` : '';
    poolEl.innerHTML = '';
    for(let i=0;i<poolRemaining;i++){
      const s = document.createElement('span');
      s.className = 'build-pool-item';
      s.textContent = emoji;
      poolEl.appendChild(s);
    }
  }

  function renderBoxes(){
    boxesEl.innerHTML = '';
    for(let b=0;b<numBoxes;b++){
      const box = document.createElement('div');
      box.className = 'build-box';
      if(boxCounts[b] >= perBox) box.classList.add('full');
      for(let s=0;s<perBox;s++){
        const slot = document.createElement('div');
        if(s < boxCounts[b]){
          slot.className = 'build-slot';
          slot.textContent = emoji;
        } else {
          slot.className = 'build-slot empty';
        }
        box.appendChild(slot);
      }
      box.onclick = () => handleBoxClick(b, box);
      boxesEl.appendChild(box);
    }
  }

  function handleBoxClick(b, boxEl){
    if(poolRemaining <= 0) return;
    if(boxCounts[b] >= perBox){
      boxEl.classList.add('shake');
      statusEl.textContent = 'That box is full — try a different one!';
      setTimeout(()=>boxEl.classList.remove('shake'), 400);
      return;
    }
    boxCounts[b]++;
    poolRemaining--;
    statusEl.textContent = '';
    renderPool();
    renderBoxes();
    if(poolRemaining === 0){
      successEl.style.display = 'block';
      successEl.textContent = successText(total, numBoxes, perBox);
      if(onComplete) onComplete(successEl);
    }
  }

  renderPool();
  renderBoxes();
}
