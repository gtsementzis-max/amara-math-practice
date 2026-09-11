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

// Area/box model for big-number division (the "split box"). A left cell shows the
// divisor; then one box per chunk {part, groups} — `part` inside, `groups` on top.
// opts.revealed = how many boxes are revealed (unrevealed show "?" in both spots);
// opts.hideTop = true shows "?" on top of every box (parts still visible);
// opts.remainder > 0 adds an amber "R<n>" tag; opts.sumLine appends "20 + 4 = 24"
// under the boxes once every box is revealed.
function renderAreaBox(el, divisor, chunks, opts){
  opts = opts || {};
  const revealed = opts.revealed == null ? chunks.length : opts.revealed;
  let s = `<div class="div">${divisor}</div>`;
  chunks.forEach((c, i) => {
    const shown = i < revealed;
    const top = (!shown || opts.hideTop) ? '?' : c.groups;
    s += `<div class="box"><span class="top">${top}</span>${shown ? c.part : '?'}</div>`;
  });
  if(opts.remainder > 0) s += `<div class="rem">R${opts.remainder}</div>`;
  if(opts.sumLine && revealed >= chunks.length && !opts.hideTop){
    const total = chunks.reduce((a, c) => a + c.groups, 0);
    s += `<div class="sum">${chunks.map(c => c.groups).join(' + ')} = ${total}</div>`;
  }
  el.className = 'areabox';
  el.innerHTML = s;
}

// Partial-quotients ("Big 7") ladder: the dividend, then for each chunk {groups} a
// "− groups×divisor" row noted "<groups> groups" and the running remainder, then the
// total groups (and "R<r>" if anything is left). opts.revealed = how many chunk rows
// to show; opts.hideTotal = true replaces the total with "?". Returns {groups, remainder}.
function renderChunkLadder(el, dividend, divisor, chunks, opts){
  opts = opts || {};
  const revealed = opts.revealed == null ? chunks.length : opts.revealed;
  let remaining = dividend, groupsTotal = 0;
  let s = `<div class="num">${dividend}</div><div class="note">${dividend} ÷ ${divisor}</div>`;
  chunks.forEach((c, i) => {
    if(i >= revealed) return;
    const g = c.groups == null ? c : c.groups;
    remaining -= g * divisor;
    groupsTotal += g;
    s += `<div class="num sub">− ${g * divisor}</div><div class="note">${g} ${g === 1 ? 'group' : 'groups'}</div>`;
    s += `<div class="num line">${remaining}</div><div class="note">left</div>`;
  });
  if(revealed >= chunks.length){
    const tot = opts.hideTotal ? '?' : groupsTotal;
    s += `<div class="num total">${tot}</div><div class="note total">groups total</div>`;
    if(remaining > 0) s += `<div class="num total">R${remaining}</div><div class="note">left over</div>`;
  }
  el.className = 'ladder';
  el.innerHTML = s;
  return { groups: groupsTotal, remainder: remaining };
}

// "Raid the hoard" tap activity for partial quotients: one button per chunk size
// (Take 10 groups (−40) ...). A chunk that fits is subtracted and added to the ladder;
// one that does not fit shakes. When fewer than `divisor` items remain the round is
// done: opts.successText(dividend, divisor, groups, remainder) is shown, then
// opts.onComplete(successEl) fires.
function initChunkActivity(container, opts){
  const { dividend, divisor, onComplete } = opts;
  const chunkSizes = opts.chunks || [10, 5, 2, 1];
  const item = opts.item || '🪙';
  const successText = opts.successText || ((d, v, g, r) => `🐉 ${d} ÷ ${v} = ${g}${r ? ` R${r}` : ''}! You took the chunks your own way — every path works.`);
  let remaining = dividend, groups = 0;
  const taken = [];

  container.innerHTML = `
    <div class="build-wrap">
      <div class="qtext" data-role="problem">${dividend} ÷ ${divisor}</div>
      <div class="build-status" data-role="pool-label"></div>
      <div class="chunk-btns" data-role="btns"></div>
      <div class="build-status" data-role="status"></div>
      <div data-role="ladder"></div>
      <div class="build-status" data-role="groups"></div>
      <div class="build-success" data-role="success"></div>
    </div>
  `;
  const poolLabel = container.querySelector('[data-role="pool-label"]');
  const btnsEl = container.querySelector('[data-role="btns"]');
  const statusEl = container.querySelector('[data-role="status"]');
  const ladderEl = container.querySelector('[data-role="ladder"]');
  const groupsEl = container.querySelector('[data-role="groups"]');
  const successEl = container.querySelector('[data-role="success"]');
  const buttons = [];

  function render(){
    poolLabel.innerHTML = `${item} Coins left in the hoard: <b style="font-size:1.6rem">${remaining}</b>`;
    groupsEl.textContent = `Groups so far: ${groups}`;
    if(taken.length) renderChunkLadder(ladderEl, dividend, divisor, taken, {revealed: taken.length});
    else ladderEl.innerHTML = '';
  }

  function take(g, btn){
    if(remaining < divisor) return;
    if(g * divisor > remaining){
      btn.classList.add('shake');
      statusEl.textContent = 'Too big — the hoard does not have that many coins left!';
      setTimeout(() => btn.classList.remove('shake'), 400);
      return;
    }
    remaining -= g * divisor;
    groups += g;
    taken.push({groups: g});
    statusEl.textContent = '';
    render();
    if(remaining < divisor){
      buttons.forEach(b => b.disabled = true);
      successEl.style.display = 'block';
      successEl.textContent = successText(dividend, divisor, groups, remaining);
      if(onComplete) onComplete(successEl);
    }
  }

  chunkSizes.forEach(g => {
    const btn = document.createElement('button');
    btn.className = 'btn chunk-btn';
    btn.textContent = `Take ${g} ${g === 1 ? 'group' : 'groups'} (−${g * divisor})`;
    btn.onclick = () => take(g, btn);
    btnsEl.appendChild(btn);
    buttons.push(btn);
  });
  render();
}


// Standard long division on the "scroll": quotient digits on top, `divisor ⟌ dividend`
// (the bracket is CSS borders on the dividend cells), then the work rows underneath.
// Computes the algorithm itself as a list of micro-steps {kind:'D'|'M'|'S'|'B', text, q, answer, ...}:
//   D  How many times does the divisor go into the current number? Writes the quotient digit
//      (a 0 is written too). If the first digit is smaller than the divisor, the first current
//      number is the first TWO digits and step.note says so.
//   M  digit × divisor = product, written under the current number.
//   S  current − product = diff: subtraction line + difference. The final S is flagged
//      step.final; its diff is the remainder (an "R<r>" tag goes on top when r > 0).
//   B  Bring down the next digit → new current number.
// `text` is the full statement, `q` the same as a question, `answer` the number asked for.
// opts.revealed = how many micro-steps to draw (0 = just the bracket with dividend and divisor).
// The cells written by the most recent revealed step get the `now` highlight (skipped when
// opts.revealed exceeds the step count, so a fully worked scroll shows no highlight).
// Returns the steps array with .quotient, .remainder and .answer ('109 R3') attached.
function renderLongDivision(el, dividend, divisor, opts){
  opts = opts || {};
  const digits = String(dividend).split('').map(Number);
  const n = digits.length;
  const steps = [], writes = [], quotDigits = [];
  const col = i => i + 1;   // dividend digit index → grid column (column 0 holds the divisor)
  const put = (row, c, text, cls) => writes.push({step: steps.length - 1, row, c, text, cls});
  let current = digits[0], pos = 0, note = '', cycle = 0;
  if(current < divisor && n > 1){
    current = current * 10 + digits[1];
    pos = 1;
    note = `${digits[0]} is too small, so use ${current}. `;
  }
  while(true){
    // D — divide
    const digit = Math.floor(current / divisor);
    steps.push({kind:'D', current, digit, answer:digit, note,
      q:`${note}How many times does ${divisor} go into ${current}?`,
      text:`${note}How many times does ${divisor} go into ${current}? ${digit}`});
    put(0, col(pos), digit, 'quot');
    quotDigits.push(digit);
    note = '';
    // M — multiply
    const product = digit * divisor;
    const prodRow = 2 + cycle * 2, diffRow = prodRow + 1;
    const start = pos - String(current).length + 1;
    const pStr = String(product), pStart = pos - pStr.length + 1;
    steps.push({kind:'M', digit, product, answer:product,
      q:`${digit} × ${divisor} = ?`, text:`${digit} × ${divisor} = ${product}`});
    put(prodRow, col(pStart) - 1, '−', 'prod');
    for(let i = 0; i < pStr.length; i++) put(prodRow, col(pStart + i), pStr[i], 'prod');
    // S — subtract
    const diff = current - product, last = pos >= n - 1;
    steps.push({kind:'S', current, product, diff, answer:diff, final:last,
      q:`${current} − ${product} = ?`, text:`${current} − ${product} = ${diff}`});
    const dStr = String(diff);
    for(let c = start; c <= pos; c++){
      const k = c - (pos - dStr.length + 1);
      put(diffRow, col(c), k >= 0 ? dStr[k] : '', 'subline' + (last && diff > 0 ? ' rem' : ''));
    }
    if(last){
      if(diff > 0) put(0, n + 1, `R${diff}`, 'rem');
      current = diff;
      break;
    }
    // B — bring down
    pos++;
    const next = digits[pos], newCurrent = diff * 10 + next;
    steps.push({kind:'B', prev:diff, next, newCurrent, answer:newCurrent,
      q:`Bring down the ${next}. What number are we looking at now?`,
      text:`Bring down the ${next} → ${newCurrent}`});
    put(diffRow, col(pos), next, 'bring');
    current = newCurrent;
    cycle++;
  }
  const remainder = current, quotient = parseInt(quotDigits.join(''), 10);
  steps.quotient = quotient;
  steps.remainder = remainder;
  steps.answer = remainder ? `${quotient} R${remainder}` : `${quotient}`;

  // draw the grid: only the rows something revealed has written to (at least quotient + dividend)
  const total = steps.length;
  const revealed = opts.revealed == null ? total : Math.min(opts.revealed, total);
  const highlight = (opts.revealed != null && opts.revealed <= total) ? revealed - 1 : -1;
  const cols = n + 1 + (remainder > 0 ? 1 : 0);
  let rows = 2;
  writes.forEach(w => { if(w.step < revealed) rows = Math.max(rows, w.row + 1); });
  const grid = [];
  for(let r = 0; r < rows; r++){
    grid.push([]);
    for(let c = 0; c < cols; c++) grid[r].push({text:'', cls:''});
  }
  grid[1][0] = {text: divisor, cls:'divisor'};
  digits.forEach((d, i) => { grid[1][col(i)] = {text: d, cls: i === 0 ? 'bracket' : 'bracket-top'}; });
  writes.forEach(w => {
    if(w.step >= revealed) return;
    grid[w.row][w.c] = {text: w.text, cls: w.cls + (w.step === highlight ? ' now' : '')};
  });
  let s = '';
  grid.forEach(row => row.forEach(c => { s += `<div class="cell${c.cls ? ' ' + c.cls : ''}">${c.text}</div>`; }));
  el.className = 'longdiv';
  el.style.gridTemplateColumns = `repeat(${cols}, auto)`;
  el.innerHTML = s;
  return steps;
}
