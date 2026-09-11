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

// Draws two adjoining groups of unit blocks (a then b), each wrapped into rows of
// 5 so they're easy to subitize/count — the concrete "blocks" model for an
// addition fact like a + b, used by the addition-with-blocks lesson.
function renderAdditionBlocks(el, a, b){
  el.className = 'addend-blocks';
  el.innerHTML = '';
  function makeGroup(count, cls){
    const grp = document.createElement('div');
    grp.className = 'block-group';
    for(let i=0;i<count;i++){
      const blk = document.createElement('span');
      blk.className = 'block ' + cls;
      grp.appendChild(blk);
    }
    return grp;
  }
  el.appendChild(makeGroup(a, 'block-a'));
  const plus = document.createElement('div');
  plus.className = 'block-plus';
  plus.textContent = '+';
  el.appendChild(plus);
  el.appendChild(makeGroup(b, 'block-b'));
}

// Number line from 0 to `total` with arcs hopping BACKWARD from `total` in jumps of `step`
// (repeated subtraction: 14 → 10 → 6 → 2 for 14 ÷ 4). Each arc is numbered; the landing
// point gets an "R<remainder>" badge. Returns {hops, remainder}.
function renderNumberLineHops(el, total, step){
  const hops = Math.floor(total / step), remainder = total % step;
  const W = 720, H = 135, padL = 30, padR = 30, baseY = 86;
  const unit = (W - padL - padR) / total;
  const x = v => Math.round((padL + v * unit) * 10) / 10;
  const labelEvery = total <= 24 ? 1 : 2;
  let s = `<svg class="numline" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Number line from 0 to ${total}, hopping back by ${step}">`;
  s += `<line x1="${padL-10}" y1="${baseY}" x2="${W-padR+10}" y2="${baseY}" stroke="#5c6b84" stroke-width="2"/>`;
  for(let v=0; v<=total; v++){
    s += `<line x1="${x(v)}" y1="${baseY-6}" x2="${x(v)}" y2="${baseY+6}" stroke="#5c6b84" stroke-width="1.5"/>`;
    if(v % labelEvery === 0 || v === total){
      s += `<text x="${x(v)}" y="${baseY+22}" font-size="12" font-weight="700" text-anchor="middle" fill="#5c6b84" font-family="inherit">${v}</text>`;
    }
  }
  const arcH = 42;
  for(let h=0; h<hops; h++){
    const from = total - h*step, to = from - step;
    const midX = (x(from) + x(to)) / 2;
    s += `<path d="M${x(from)} ${baseY-2} Q${midX} ${baseY-2-arcH*2} ${x(to)} ${baseY-2}" fill="none" stroke="var(--purple,#8b5cf6)" stroke-width="3" stroke-linecap="round"/>`;
    s += `<polygon points="${x(to)},${baseY-2} ${x(to)+10},${baseY-14} ${x(to)+2},${baseY-15}" fill="var(--purple,#8b5cf6)"/>`;
    s += `<text x="${midX}" y="${baseY-8-arcH}" font-size="13" font-weight="800" text-anchor="middle" fill="var(--purple,#8b5cf6)" font-family="inherit">${h+1}</text>`;
  }
  const rx = x(remainder);
  s += `<circle cx="${rx}" cy="${baseY}" r="7" fill="var(--amber,#f59e0b)" stroke="#fff" stroke-width="2"/>`;
  s += `<rect x="${rx-20}" y="${baseY+28}" width="40" height="20" rx="10" fill="var(--amber,#f59e0b)"/>`;
  s += `<text x="${rx}" y="${baseY+42}" font-size="12" font-weight="800" text-anchor="middle" fill="#fff" font-family="inherit">R${remainder}</text>`;
  s += '</svg>';
  el.innerHTML = s;
  return { hops, remainder };
}
